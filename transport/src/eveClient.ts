import { EVE_BASE_URL } from "./env.js";

export interface EveSession {
  sessionId: string;
  continuationToken: string;
}

export interface EveReply {
  text: string;
  session: EveSession;
}

const DEBUG = process.env.ESSOS_DEBUG === "1";

function log(...args: unknown[]): void {
  if (DEBUG) console.error("[eve]", ...args);
}

interface CreateResponse {
  ok?: boolean;
  sessionId?: string;
  continuationToken?: string;
  error?: string;
}

async function postJson(url: string, body: unknown): Promise<CreateResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Eve POST ${url} failed: ${res.status} ${detail}`);
  }
  return (await res.json()) as CreateResponse;
}

/**
 * Read the session event stream and resolve with the final assistant message.
 *
 * Eve's ndjson envelope is `{ type, data, meta }`. A turn runs as one or more
 * steps; each step emits `message.appended` (with `data.messageSoFar`, the
 * cumulative text) and a `message.completed` (with `data.message` +
 * `data.finishReason`). Tool-calling steps finish with `finishReason:
 * "tool-calls"`; the final answer is the `message.completed` whose finishReason
 * is not `tool-calls`. The turn ends with `turn.completed` / `session.completed`,
 * and any `*.failed` event carries `data.message`.
 */
async function collectReply(sessionId: string): Promise<string> {
  const url = `${EVE_BASE_URL}/eve/v1/session/${sessionId}/stream`;
  const res = await fetch(url, { headers: { accept: "application/x-ndjson" } });
  if (!res.ok || !res.body) {
    throw new Error(`Eve stream failed: ${res.status}`);
  }

  return await new Promise<string>((resolvePromise, reject) => {
    let finalText = ""; // last non-tool-calls assistant message (the answer)
    let latestSoFar = ""; // cumulative text fallback if no clean finish seen
    let hardTimer: ReturnType<typeof setTimeout> | null = null;
    let done = false;
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const finish = (text: string) => {
      if (done) return;
      done = true;
      if (hardTimer) clearTimeout(hardTimer);
      reader.cancel().catch(() => {});
      resolvePromise(text.trim());
    };

    const fail = (message: string) => {
      if (done) return;
      done = true;
      if (hardTimer) clearTimeout(hardTimer);
      reader.cancel().catch(() => {});
      reject(new Error(message));
    };

    hardTimer = setTimeout(() => finish(finalText || latestSoFar), 120_000);

    const handleEvent = (evt: Record<string, unknown>) => {
      const type = String(evt.type ?? "");
      const data = (evt.data ?? {}) as Record<string, unknown>;
      log("event", type);

      if (type === "message.appended") {
        if (typeof data.messageSoFar === "string") latestSoFar = data.messageSoFar;
        return;
      }
      if (type === "message.completed") {
        const message = typeof data.message === "string" ? data.message : "";
        if (message && String(data.finishReason ?? "") !== "tool-calls") {
          finalText = message;
        }
        return;
      }
      if (type === "turn.completed" || type === "session.completed") {
        finish(finalText || latestSoFar);
        return;
      }
      if (
        type === "step.failed" ||
        type === "turn.failed" ||
        type === "session.failed" ||
        type === "error"
      ) {
        fail((data.message as string) || (evt.message as string) || "agent error");
      }
    };

    const pump = async (): Promise<void> => {
      for (;;) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) {
          finish(finalText || latestSoFar);
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          try {
            handleEvent(JSON.parse(line) as Record<string, unknown>);
          } catch {
            log("non-json line", line.slice(0, 120));
          }
        }
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
  } else {
    const cont = await postJson(
      `${EVE_BASE_URL}/eve/v1/session/${prior.sessionId}`,
      { message, continuationToken: prior.continuationToken },
    );
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
