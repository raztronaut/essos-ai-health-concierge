import { debug } from "./debug.js";
import { EVE_BASE_URL, TRANSPORT_SECRET } from "./env.js";

export interface EveSession {
  continuationToken: string;
  sessionId: string;
  /**
   * How many turns this session has run. Eve's session stream replays the whole
   * session from `session.started` on every connect, so to read the reply for
   * the current turn we must wait for the Nth `turn.completed`, not the first.
   */
  turns: number;
}

/** Best-effort per-turn telemetry scraped from the Eve event stream. */
export interface TurnTelemetry {
  completionTokens: number | null;
  finishReason: string | null;
  promptTokens: number | null;
  toolCalls: string[];
  totalTokens: number | null;
}

export interface EveReply {
  session: EveSession;
  telemetry: TurnTelemetry;
  text: string;
}

/** Hard ceiling on how long we wait for a turn's stream to settle. */
const STREAM_TIMEOUT_MS = 120_000;
/** Max chars of a non-JSON stream line to echo when debugging. */
const LOG_PREVIEW = 120;

/** Max stream connect attempts before degrading the turn to a human. */
const MAX_STREAM_ATTEMPTS = 4;
/** Base backoff between stream reconnect attempts (doubles each attempt). */
const STREAM_RETRY_BASE_MS = 500;

/**
 * HTTP statuses on the stream GET that are transient at an edge/proxy (e.g.
 * Railway's public edge returning 502 while Eve is mid-turn or cold-starting).
 * Eve's own session route never emits these — a 4xx is a real client error and
 * is not retried.
 */
const RETRYABLE_STREAM_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

/**
 * A transient stream failure — an edge/proxy status from {@link
 * RETRYABLE_STREAM_STATUS} or a connection that closed before the turn
 * completed. Eve's session stream replays from `session.started` on every
 * connect, so reconnecting is idempotent and safe. Distinct from a real agent
 * error (`turn.failed`/`error` event), which must degrade to a human instead.
 */
export class RetryableStreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetryableStreamError";
  }
}

const FAILED_EVENTS = new Set([
  "step.failed",
  "turn.failed",
  "session.failed",
  "error",
]);

interface SessionResponse {
  continuationToken?: string;
  ok?: boolean;
  sessionId?: string;
}

export interface EveEvent {
  data?: Record<string, unknown>;
  message?: string;
  type?: string;
}

export interface ReducedReply {
  error: string | null;
  /** Whether any assistant message text was observed (vs. a silent turn). */
  sawMessage: boolean;
  telemetry: TurnTelemetry;
  text: string;
}

/** Pull a tool name out of an event payload, tolerating schema variations. */
function extractToolName(
  type: string,
  data: Record<string, unknown>
): string | null {
  if (!/tool/i.test(type)) {
    return null;
  }
  const name =
    (typeof data.toolName === "string" && data.toolName) ||
    (typeof data.name === "string" && data.name) ||
    (typeof data.tool === "string" && data.tool) ||
    null;
  return name;
}

/** Accumulate token usage from an AI-SDK-style usage object, tolerating field names. */
function readUsage(
  data: Record<string, unknown>
): { prompt: number; completion: number; total: number } | null {
  const usage = data.usage as Record<string, unknown> | undefined;
  if (!usage || typeof usage !== "object") {
    return null;
  }
  const num = (...keys: string[]): number => {
    for (const k of keys) {
      const val = usage[k];
      if (typeof val === "number") {
        return val;
      }
    }
    return 0;
  };
  const prompt = num(
    "promptTokens",
    "inputTokens",
    "prompt_tokens",
    "input_tokens"
  );
  const completion = num(
    "completionTokens",
    "outputTokens",
    "completion_tokens",
    "output_tokens"
  );
  const total = num("totalTokens", "total_tokens") || prompt + completion;
  if (prompt === 0 && completion === 0 && total === 0) {
    return null;
  }
  return { prompt, completion, total };
}

/**
 * Fold Eve's ndjson event envelopes into the final assistant reply. Pure and
 * synchronous so it can be unit-tested against fixtures.
 *
 * A turn runs as one or more steps; each emits `message.appended` (cumulative
 * `data.messageSoFar`) and a `message.completed` (`data.message` +
 * `data.finishReason`). Tool-calling steps finish with `finishReason:
 * "tool-calls"`; the answer is the `message.completed` whose finishReason is not
 * `tool-calls`. Any `*.failed`/`error` event short-circuits with its message.
 */
export function reduceEveEvents(events: Iterable<EveEvent>): ReducedReply {
  let finalText = "";
  let latestSoFar = "";
  let sawMessage = false;
  const toolCalls: string[] = [];
  let finishReason: string | null = null;
  let prompt = 0;
  let completion = 0;
  let total = 0;
  let sawUsage = false;

  const telemetry = (): TurnTelemetry => ({
    toolCalls,
    finishReason,
    promptTokens: sawUsage ? prompt : null,
    completionTokens: sawUsage ? completion : null,
    totalTokens: sawUsage ? total : null,
  });

  for (const evt of events) {
    const type = String(evt.type ?? "");
    const data = (evt.data ?? {}) as Record<string, unknown>;

    const toolName = extractToolName(type, data);
    if (toolName) {
      toolCalls.push(toolName);
    }
    const usage = readUsage(data);
    if (usage) {
      prompt += usage.prompt;
      completion += usage.completion;
      total += usage.total;
      sawUsage = true;
    }

    if (FAILED_EVENTS.has(type)) {
      const error =
        (typeof data.message === "string" && data.message) ||
        (typeof evt.message === "string" && evt.message) ||
        "agent error";
      return { text: "", error, sawMessage, telemetry: telemetry() };
    }
    if (type === "message.appended") {
      if (typeof data.messageSoFar === "string") {
        latestSoFar = data.messageSoFar;
        sawMessage = true;
      }
    } else if (type === "message.completed") {
      const message = typeof data.message === "string" ? data.message : "";
      if (message) {
        sawMessage = true;
      }
      const reason = String(data.finishReason ?? "");
      if (reason) {
        finishReason = reason;
      }
      if (message && reason !== "tool-calls") {
        finalText = message;
      }
    }
  }

  return {
    text: (finalText || latestSoFar).trim(),
    error: null,
    sawMessage,
    telemetry: telemetry(),
  };
}

/** Split a buffer into complete ndjson lines, returning the trailing partial. */
export function splitNdjson(buffer: string): { lines: string[]; rest: string } {
  const lines: string[] = [];
  let nl = buffer.indexOf("\n");
  while (nl >= 0) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (line) {
      lines.push(line);
    }
    nl = buffer.indexOf("\n");
  }
  return { lines, rest: buffer };
}

function authHeaders(
  extra: Record<string, string> = {}
): Record<string, string> {
  return TRANSPORT_SECRET
    ? { ...extra, authorization: `Bearer ${TRANSPORT_SECRET}` }
    : extra;
}

async function postJson(
  url: string,
  body: unknown,
  signal?: AbortSignal
): Promise<SessionResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders({ "content-type": "application/json" }),
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Eve POST ${url} failed: ${res.status} ${detail}`);
  }
  return (await res.json()) as SessionResponse;
}

/** Resolve after `ms`, rejecting early if `signal` aborts (so a follow-up message cancels the wait). */
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const timer = setTimeout(resolvePromise, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new Error("aborted"));
      },
      { once: true }
    );
  });
}

/**
 * Open the session event stream once and resolve with the final assistant
 * message for the turn we sent.
 *
 * Eve's session is durable: the stream replays the session's recorded events
 * from `session.started` on every connect — including all prior turns — so no
 * events are lost in the gap between the POST resolving and this connecting, and
 * a reconnect re-reads the same history. We count `turn.completed` events to
 * find the turn we just sent (`expectedTurns`) and reduce only that turn's
 * events. The `eveClient.test.ts` fixtures pin the parsing/reduction half.
 *
 * Rejects with {@link RetryableStreamError} on a transient edge/proxy status or
 * a premature stream close (reconnect is safe); rejects with a plain `Error` on
 * a real agent failure event (caller degrades to a human). The
 * `eveClient.test.ts` fixtures pin the parsing/reduction half of this contract.
 */
async function streamOnce(
  sessionId: string,
  expectedTurns: number,
  signal?: AbortSignal
): Promise<{ text: string; telemetry: TurnTelemetry }> {
  const url = `${EVE_BASE_URL}/eve/v1/session/${sessionId}/stream`;
  const res = await fetch(url, {
    headers: authHeaders({ accept: "application/x-ndjson" }),
    signal,
  });
  if (!(res.ok && res.body)) {
    const message = `Eve stream failed: ${res.status}`;
    throw RETRYABLE_STREAM_STATUS.has(res.status)
      ? new RetryableStreamError(message)
      : new Error(message);
  }

  return await new Promise<{ text: string; telemetry: TurnTelemetry }>(
    (resolvePromise, reject) => {
      const events: EveEvent[] = [];
      let turnsSeen = 0;
      let hardTimer: ReturnType<typeof setTimeout> | null = null;
      let done = false;
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const stop = () => {
        done = true;
        if (hardTimer) {
          clearTimeout(hardTimer);
        }
        // Reader teardown after we've settled; the cancellation outcome is moot.
        reader.cancel().catch(() => undefined);
      };

      const settle = () => {
        if (done) {
          return;
        }
        const reduced = reduceEveEvents(events);
        stop();
        if (reduced.error) {
          // A real agent failure (turn.failed/error) — not retryable.
          reject(new Error(reduced.error));
          return;
        }
        if (!reduced.text) {
          debug(
            "eve",
            reduced.sawMessage
              ? "turn produced no final answer (only tool-calls / empty message)"
              : "no assistant message parsed from stream (possible schema drift)"
          );
        }
        resolvePromise({ text: reduced.text, telemetry: reduced.telemetry });
      };

      const failRetryable = (message: string) => {
        if (done) {
          return;
        }
        stop();
        reject(new RetryableStreamError(message));
      };

      // The hard ceiling settles with whatever was parsed: a 2-minute turn is a
      // real failure to answer, not a transient blip, so we don't reconnect.
      hardTimer = setTimeout(settle, STREAM_TIMEOUT_MS);

      const ingest = (line: string) => {
        let evt: EveEvent;
        try {
          evt = JSON.parse(line) as EveEvent;
        } catch {
          debug("eve", "non-json line", line.slice(0, LOG_PREVIEW));
          return;
        }
        const type = String(evt.type ?? "");
        // The stream replays every turn from `session.started`. `reduceEveEvents`
        // is a single-turn reducer, so keep only the current turn's events
        // (reset at each `turn.started`) — otherwise a prior turn's clean answer
        // would leak through when the latest turn's reply rides alongside a tool
        // call and has no standalone final message.
        if (type === "turn.started") {
          events.length = 0;
        }
        events.push(evt);
        debug("eve", "event", type);
        if (FAILED_EVENTS.has(type) || type === "session.completed") {
          settle();
          return;
        }
        // Settle only once we've seen the `turn.completed` for the turn we sent.
        if (type === "turn.completed") {
          turnsSeen += 1;
          if (turnsSeen >= expectedTurns) {
            settle();
          }
        }
      };

      const pump = async (): Promise<void> => {
        for (;;) {
          const { done: streamDone, value } = await reader.read();
          if (streamDone) {
            // Stream closed before we saw the turn complete: the edge dropped a
            // mid-turn connection. Reconnect (replay is idempotent).
            failRetryable("Eve stream closed before the turn completed");
            return;
          }
          buffer += decoder.decode(value, { stream: true });
          const { lines, rest } = splitNdjson(buffer);
          buffer = rest;
          for (const line of lines) {
            ingest(line);
          }
        }
      };

      pump().catch((err) => {
        // A read error after the stream connected (socket reset, edge drop) is
        // transient — reconnect rather than degrade.
        failRetryable(err instanceof Error ? err.message : String(err));
      });
    }
  );
}

/**
 * Read the turn's reply, reconnecting on transient stream failures. A single
 * edge 502 or dropped connection no longer escalates the patient to a human:
 * we reconnect (the durable session replays from `session.started`) with capped
 * exponential backoff, and only surface the error after {@link
 * MAX_STREAM_ATTEMPTS} attempts. A real agent failure or an aborted turn throws
 * immediately without retrying.
 */
async function collectReply(
  sessionId: string,
  expectedTurns: number,
  signal?: AbortSignal
): Promise<{ text: string; telemetry: TurnTelemetry }> {
  let attempt = 0;
  for (;;) {
    attempt += 1;
    try {
      return await streamOnce(sessionId, expectedTurns, signal);
    } catch (err) {
      // A follow-up message aborted this turn; let the pipeline re-batch.
      if (signal?.aborted) {
        throw err;
      }
      const retryable = err instanceof RetryableStreamError;
      if (!retryable || attempt >= MAX_STREAM_ATTEMPTS) {
        throw err;
      }
      const backoffMs = STREAM_RETRY_BASE_MS * 2 ** (attempt - 1);
      debug(
        "eve",
        `stream attempt ${attempt}/${MAX_STREAM_ATTEMPTS} failed (${err.message}); reconnecting in ${backoffMs}ms`
      );
      await delay(backoffMs, signal);
    }
  }
}

/**
 * A saved session no longer exists on the agent — most commonly because the
 * agent was redeployed and its on-disk durable sessions were wiped, leaving the
 * `sessionId` we persisted in Convex dangling. Recoverable by starting fresh.
 */
class SessionLostError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionLostError";
  }
}

/**
 * Send a message to the agent and return its reply + the (continuable) session.
 *
 * Resilient to a lost saved session: if continuing `prior` reveals the session
 * is gone (the agent allocates a new run id, or the replay settles with no
 * reply), we transparently start a fresh session instead of degrading the
 * patient to a human. Durable per-patient memory + the trusted context block
 * are re-sent every turn, so a fresh session still answers in full context.
 */
export async function askEve(
  message: string,
  prior: EveSession | null,
  signal?: AbortSignal
): Promise<EveReply> {
  if (prior) {
    try {
      const reply = await continueSession(message, prior, signal);
      if (reply.text.trim()) {
        return reply;
      }
      debug("eve", "continuation produced no reply; starting a fresh session");
    } catch (err) {
      // A follow-up aborted this turn: let the pipeline re-batch, don't recover.
      if (signal?.aborted) {
        throw err;
      }
      const detail = err instanceof Error ? err.message : String(err);
      debug("eve", `continuation failed (${detail}); starting a fresh session`);
    }
  }
  return await createSession(message, signal);
}

/** Continue an existing session; throws {@link SessionLostError} if it's gone. */
async function continueSession(
  message: string,
  prior: EveSession,
  signal?: AbortSignal
): Promise<EveReply> {
  const expectedTurns = prior.turns + 1;
  const cont = await postJson(
    `${EVE_BASE_URL}/eve/v1/session/${prior.sessionId}`,
    { message, continuationToken: prior.continuationToken },
    signal
  );
  // The agent echoes the same session id when continuing a live session; a new
  // id means our saved session was lost and it spun up a fresh run we can't
  // reliably turn-count against. Bail so the caller starts cleanly fresh.
  if (cont.sessionId && cont.sessionId !== prior.sessionId) {
    throw new SessionLostError(
      `saved session ${prior.sessionId} was lost (agent returned ${cont.sessionId})`
    );
  }
  const continuationToken = cont.continuationToken ?? prior.continuationToken;
  const { text, telemetry } = await collectReply(
    prior.sessionId,
    expectedTurns,
    signal
  );
  return {
    text,
    telemetry,
    session: { sessionId: prior.sessionId, continuationToken, turns: expectedTurns },
  };
}

/** Start a brand-new session for this conversation's next turn. */
async function createSession(
  message: string,
  signal?: AbortSignal
): Promise<EveReply> {
  const created = await postJson(
    `${EVE_BASE_URL}/eve/v1/session`,
    { message },
    signal
  );
  if (!created.sessionId) {
    throw new Error("Eve did not return a sessionId");
  }
  const continuationToken = created.continuationToken ?? "";
  if (!created.continuationToken) {
    debug("eve", "session create returned no continuationToken");
  }
  const { text, telemetry } = await collectReply(created.sessionId, 1, signal);
  return {
    text,
    telemetry,
    session: { sessionId: created.sessionId, continuationToken, turns: 1 },
  };
}

/** Health check so the transport can fail fast with a clear message. */
export async function eveHealthy(): Promise<boolean> {
  try {
    const res = await fetch(`${EVE_BASE_URL}/eve/v1/health`);
    return res.ok;
  } catch {
    return false;
  }
}
