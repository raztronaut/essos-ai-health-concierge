import { EVE_BASE_URL, TRANSPORT_SECRET } from "./env.js";
import { debug } from "./debug.js";

export interface EveSession {
  sessionId: string;
  continuationToken: string;
}

export interface EveReply {
  text: string;
  session: EveSession;
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
const TERMINAL_EVENTS = new Set(["turn.completed", "session.completed"]);

interface SessionResponse {
  ok?: boolean;
  sessionId?: string;
  continuationToken?: string;
}

export interface EveEvent {
  type?: string;
  data?: Record<string, unknown>;
  message?: string;
}

export interface ReducedReply {
  text: string;
  error: string | null;
  /** Whether any assistant message text was observed (vs. a silent turn). */
  sawMessage: boolean;
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

  for (const evt of events) {
    const type = String(evt.type ?? "");
    const data = (evt.data ?? {}) as Record<string, unknown>;

    if (FAILED_EVENTS.has(type)) {
      const error =
        (typeof data.message === "string" && data.message) ||
        (typeof evt.message === "string" && evt.message) ||
        "agent error";
      return { text: "", error, sawMessage };
    }
    if (type === "message.appended") {
      if (typeof data.messageSoFar === "string") {
        latestSoFar = data.messageSoFar;
        sawMessage = true;
      }
    } else if (type === "message.completed") {
      const message = typeof data.message === "string" ? data.message : "";
      if (message) sawMessage = true;
      if (message && String(data.finishReason ?? "") !== "tool-calls") {
        finalText = message;
      }
    }
  }

  return { text: (finalText || latestSoFar).trim(), error: null, sawMessage };
}

/** Split a buffer into complete ndjson lines, returning the trailing partial. */
export function splitNdjson(buffer: string): { lines: string[]; rest: string } {
  const lines: string[] = [];
  let nl: number;
  while ((nl = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (line) lines.push(line);
  }
  return { lines, rest: buffer };
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
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
 * stream replays the turn's recorded events to a late subscriber (it is a
 * durable session, not a fire-and-forget socket), so no events are lost in the
 * gap between the POST resolving and this connecting. The `eveClient.test.ts`
 * fixtures pin the parsing/reduction half of this contract.
 */
async function collectReply(sessionId: string): Promise<string> {
  const url = `${EVE_BASE_URL}/eve/v1/session/${sessionId}/stream`;
  const res = await fetch(url, {
    headers: authHeaders({ accept: "application/x-ndjson" }),
  });
  if (!res.ok || !res.body) {
    throw new Error(`Eve stream failed: ${res.status}`);
  }

  return await new Promise<string>((resolvePromise, reject) => {
    const events: EveEvent[] = [];
    let hardTimer: ReturnType<typeof setTimeout> | null = null;
    let done = false;
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const settle = () => {
      const reduced = reduceEveEvents(events);
      if (reduced.error) return fail(reduced.error);
      if (!reduced.text) {
        debug(
          "eve",
          reduced.sawMessage
            ? "turn produced no final answer (only tool-calls / empty message)"
            : "no assistant message parsed from stream (possible schema drift)",
        );
      }
      finish(reduced.text);
    };

    const finish = (text: string) => {
      if (done) return;
      done = true;
      if (hardTimer) clearTimeout(hardTimer);
      reader.cancel().catch(() => {});
      resolvePromise(text);
    };

    const fail = (message: string) => {
      if (done) return;
      done = true;
      if (hardTimer) clearTimeout(hardTimer);
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
      events.push(evt);
      const type = String(evt.type ?? "");
      debug("eve", "event", type);
      if (FAILED_EVENTS.has(type) || TERMINAL_EVENTS.has(type)) settle();
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
        for (const line of lines) ingest(line);
      }
    };

    pump().catch((err) => {
      if (!done) reject(err instanceof Error ? err : new Error(String(err)));
    });
  });
}

/** Send a message to the agent and return its reply + the (continuable) session. */
export async function askEve(
  message: string,
  prior: EveSession | null,
): Promise<EveReply> {
  let sessionId: string;
  let continuationToken: string;

  if (!prior) {
    const created = await postJson(`${EVE_BASE_URL}/eve/v1/session`, { message });
    if (!created.sessionId) throw new Error("Eve did not return a sessionId");
    sessionId = created.sessionId;
    continuationToken = created.continuationToken ?? "";
    if (!created.continuationToken) {
      debug("eve", "session create returned no continuationToken");
    }
  } else {
    const cont = await postJson(`${EVE_BASE_URL}/eve/v1/session/${prior.sessionId}`, {
      message,
      continuationToken: prior.continuationToken,
    });
    sessionId = prior.sessionId;
    continuationToken = cont.continuationToken ?? prior.continuationToken;
  }

  const text = await collectReply(sessionId);
  return { text, session: { sessionId, continuationToken } };
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
