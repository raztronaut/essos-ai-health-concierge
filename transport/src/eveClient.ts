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

async function postJson(url: string, body: unknown): Promise<SessionResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders({ "content-type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Eve POST ${url} failed: ${res.status} ${detail}`);
  }
  return (await res.json()) as SessionResponse;
}

/**
 * Read the session event stream and resolve with the final assistant message.
 *
 * The stream is opened after the create/continue POST returns. Eve's session
 * is durable: the stream replays the session's recorded events from
 * `session.started` on every connect — including all prior turns — so no events
 * are lost in the gap between the POST resolving and this connecting. We count
 * `turn.completed` events to find the turn we just sent (`expectedTurns`) and
 * reduce only that turn's events. The `eveClient.test.ts` fixtures pin the
 * parsing/reduction half of this contract.
 */
async function collectReply(
  sessionId: string,
  expectedTurns: number
): Promise<{ text: string; telemetry: TurnTelemetry }> {
  const url = `${EVE_BASE_URL}/eve/v1/session/${sessionId}/stream`;
  const res = await fetch(url, {
    headers: authHeaders({ accept: "application/x-ndjson" }),
  });
  if (!(res.ok && res.body)) {
    throw new Error(`Eve stream failed: ${res.status}`);
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

      const settle = () => {
        const reduced = reduceEveEvents(events);
        if (reduced.error) {
          return fail(reduced.error);
        }
        if (!reduced.text) {
          debug(
            "eve",
            reduced.sawMessage
              ? "turn produced no final answer (only tool-calls / empty message)"
              : "no assistant message parsed from stream (possible schema drift)"
          );
        }
        finish({ text: reduced.text, telemetry: reduced.telemetry });
      };

      const finish = (result: { text: string; telemetry: TurnTelemetry }) => {
        if (done) {
          return;
        }
        done = true;
        if (hardTimer) {
          clearTimeout(hardTimer);
        }
        reader.cancel().catch(() => {});
        resolvePromise(result);
      };

      const fail = (message: string) => {
        if (done) {
          return;
        }
        done = true;
        if (hardTimer) {
          clearTimeout(hardTimer);
        }
        reader.cancel().catch(() => {});
        reject(new Error(message));
      };

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
            settle();
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
        if (!done) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      });
    }
  );
}

/** Send a message to the agent and return its reply + the (continuable) session. */
export async function askEve(
  message: string,
  prior: EveSession | null
): Promise<EveReply> {
  let sessionId: string;
  let continuationToken: string;
  const expectedTurns = (prior?.turns ?? 0) + 1;

  if (prior) {
    const cont = await postJson(
      `${EVE_BASE_URL}/eve/v1/session/${prior.sessionId}`,
      {
        message,
        continuationToken: prior.continuationToken,
      }
    );
    sessionId = prior.sessionId;
    continuationToken = cont.continuationToken ?? prior.continuationToken;
  } else {
    const created = await postJson(`${EVE_BASE_URL}/eve/v1/session`, {
      message,
    });
    if (!created.sessionId) {
      throw new Error("Eve did not return a sessionId");
    }
    sessionId = created.sessionId;
    continuationToken = created.continuationToken ?? "";
    if (!created.continuationToken) {
      debug("eve", "session create returned no continuationToken");
    }
  }

  const { text, telemetry } = await collectReply(sessionId, expectedTurns);
  return {
    text,
    telemetry,
    session: { sessionId, continuationToken, turns: expectedTurns },
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
