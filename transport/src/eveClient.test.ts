import assert from "node:assert/strict";
import { test } from "node:test";
import {
  askEve,
  type EveEvent,
  reduceEveEvents,
  splitNdjson,
} from "./eveClient.js";

const NDJSON_OK =
  [
    '{"type":"turn.started"}',
    '{"type":"message.completed","data":{"message":"Your reservation is HM-4471.","finishReason":"stop"}}',
    '{"type":"turn.completed"}',
  ].join("\n") + "\n";

/** Drive askEve against a mocked fetch, restoring the global afterward. */
async function withMockFetch<T>(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
  run: () => Promise<T>
): Promise<T> {
  const realFetch = globalThis.fetch;
  globalThis.fetch = ((url: string | URL | Request, init?: RequestInit) =>
    Promise.resolve(handler(String(url), init))) as typeof fetch;
  try {
    return await run();
  } finally {
    globalThis.fetch = realFetch;
  }
}

test("reduceEveEvents: multi-step tool-calls then a final answer", () => {
  const events: EveEvent[] = [
    { type: "turn.started" },
    {
      type: "message.completed",
      data: { message: "", finishReason: "tool-calls" },
    },
    { type: "message.appended", data: { messageSoFar: "Your reservation " } },
    {
      type: "message.appended",
      data: { messageSoFar: "Your reservation is HM-4471." },
    },
    {
      type: "message.completed",
      data: { message: "Your reservation is HM-4471.", finishReason: "stop" },
    },
    { type: "turn.completed" },
  ];
  const result = reduceEveEvents(events);
  assert.equal(result.text, "Your reservation is HM-4471.");
  assert.equal(result.error, null);
  assert.equal(result.sawMessage, true);
});

test("reduceEveEvents: falls back to cumulative text when no clean final message", () => {
  const events: EveEvent[] = [
    {
      type: "message.appended",
      data: { messageSoFar: "partial answer so far" },
    },
    { type: "turn.completed" },
  ];
  const result = reduceEveEvents(events);
  assert.equal(result.text, "partial answer so far");
  assert.equal(result.error, null);
});

test("reduceEveEvents: a failed event short-circuits with its message", () => {
  const events: EveEvent[] = [
    { type: "message.appended", data: { messageSoFar: "ignore me" } },
    { type: "turn.failed", data: { message: "model timed out" } },
  ];
  const result = reduceEveEvents(events);
  assert.equal(result.text, "");
  assert.equal(result.error, "model timed out");
});

test("reduceEveEvents: top-level error event without data.message", () => {
  const events: EveEvent[] = [{ type: "error", message: "boom" }];
  assert.equal(reduceEveEvents(events).error, "boom");
});

test("reduceEveEvents: a silent turn is distinguishable from a parse miss", () => {
  const silent = reduceEveEvents([{ type: "turn.completed" }]);
  assert.equal(silent.text, "");
  assert.equal(silent.sawMessage, false);

  const toolOnly = reduceEveEvents([
    {
      type: "message.completed",
      data: { message: "", finishReason: "tool-calls" },
    },
    { type: "turn.completed" },
  ]);
  assert.equal(toolOnly.text, "");
});

test("splitNdjson: keeps a trailing partial line in the buffer", () => {
  const first = splitNdjson('{"type":"a"}\n{"type":"b"}\n{"type":"c"');
  assert.deepEqual(first.lines, ['{"type":"a"}', '{"type":"b"}']);
  assert.equal(first.rest, '{"type":"c"');

  // Feeding the next chunk completes the partial line.
  const second = splitNdjson(`${first.rest}}\n`);
  assert.deepEqual(second.lines, ['{"type":"c"}']);
  assert.equal(second.rest, "");
});

test("splitNdjson: blank lines are dropped", () => {
  const { lines, rest } = splitNdjson('\n\n{"type":"x"}\n\n');
  assert.deepEqual(lines, ['{"type":"x"}']);
  assert.equal(rest, "");
});

test("askEve: reconnects after a transient 502 then returns the reply", async () => {
  let streamCalls = 0;
  const reply = await withMockFetch(
    (url) => {
      if (url.endsWith("/eve/v1/session")) {
        return new Response(
          JSON.stringify({ ok: true, sessionId: "eve:1", continuationToken: "t" }),
          { status: 202, headers: { "content-type": "application/json" } }
        );
      }
      if (url.includes("/stream")) {
        streamCalls += 1;
        // First connect hits a transient edge 502; the reconnect succeeds.
        return streamCalls === 1
          ? new Response("bad gateway", { status: 502 })
          : new Response(NDJSON_OK, {
              status: 200,
              headers: { "content-type": "application/x-ndjson" },
            });
      }
      throw new Error(`unexpected url ${url}`);
    },
    () => askEve("what's my reservation?", null)
  );
  assert.equal(reply.text, "Your reservation is HM-4471.");
  assert.equal(streamCalls, 2, "should reconnect exactly once after the 502");
});

const jsonRes = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
const ndjsonRes = (body: string): Response =>
  new Response(body, {
    status: 200,
    headers: { "content-type": "application/x-ndjson" },
  });

test("askEve: continues a live session and reads the latest turn", async () => {
  const prior = { sessionId: "wrun_live", continuationToken: "ct", turns: 1 };
  // expectedTurns = 2: the replayed stream has two turns; the reply is the 2nd.
  const twoTurns = [
    '{"type":"turn.started"}',
    '{"type":"message.completed","data":{"message":"first turn","finishReason":"stop"}}',
    '{"type":"turn.completed"}',
    '{"type":"turn.started"}',
    '{"type":"message.completed","data":{"message":"Your pickup is at 12:00.","finishReason":"stop"}}',
    '{"type":"turn.completed"}',
    "",
  ].join("\n");
  const reply = await withMockFetch(
    (url) => {
      if (url.endsWith("/eve/v1/session/wrun_live")) {
        return jsonRes({ ok: true, sessionId: "wrun_live", continuationToken: "ct2" });
      }
      if (url.includes("/eve/v1/session/wrun_live/stream")) {
        return ndjsonRes(twoTurns);
      }
      throw new Error(`unexpected url ${url}`);
    },
    () => askEve("when's my pickup?", prior)
  );
  assert.equal(reply.text, "Your pickup is at 12:00.");
  assert.equal(reply.session.sessionId, "wrun_live");
  assert.equal(reply.session.turns, 2);
});

test("askEve: recovers from a lost saved session by starting fresh", async () => {
  // The agent redeployed and wiped on-disk sessions: continuing the saved id
  // returns a different run id, which must trigger a clean fresh start.
  const prior = { sessionId: "wrun_old", continuationToken: "ct_old", turns: 3 };
  let oldStreamHit = false;
  let freshCreated = false;
  const reply = await withMockFetch(
    (url) => {
      if (url.endsWith("/eve/v1/session/wrun_old")) {
        return jsonRes({ ok: true, sessionId: "wrun_new_run", continuationToken: "x" });
      }
      if (url.includes("/eve/v1/session/wrun_old/stream")) {
        oldStreamHit = true;
        return ndjsonRes(NDJSON_OK);
      }
      if (url.endsWith("/eve/v1/session")) {
        freshCreated = true;
        return jsonRes(
          { ok: true, sessionId: "wrun_fresh", continuationToken: "ct_fresh" },
          202
        );
      }
      if (url.includes("/eve/v1/session/wrun_fresh/stream")) {
        return ndjsonRes(NDJSON_OK);
      }
      throw new Error(`unexpected url ${url}`);
    },
    () => askEve("what's my reservation?", prior)
  );
  assert.equal(oldStreamHit, false, "must not stream the lost session");
  assert.equal(freshCreated, true, "must start a fresh session");
  assert.equal(reply.session.sessionId, "wrun_fresh");
  assert.equal(reply.session.turns, 1);
  assert.equal(reply.text, "Your reservation is HM-4471.");
});

test("askEve: recovers when a continued session replays no reply", async () => {
  const prior = { sessionId: "wrun_live", continuationToken: "ct", turns: 1 };
  const emptyTurn = '{"type":"turn.started"}\n{"type":"turn.completed"}\n';
  let freshStreamed = false;
  const reply = await withMockFetch(
    (url) => {
      if (url.endsWith("/eve/v1/session/wrun_live")) {
        return jsonRes({ ok: true, sessionId: "wrun_live", continuationToken: "ct2" });
      }
      if (url.includes("/eve/v1/session/wrun_live/stream")) {
        return ndjsonRes(emptyTurn);
      }
      if (url.endsWith("/eve/v1/session")) {
        return jsonRes(
          { ok: true, sessionId: "wrun_fresh", continuationToken: "ctf" },
          202
        );
      }
      if (url.includes("/eve/v1/session/wrun_fresh/stream")) {
        freshStreamed = true;
        return ndjsonRes(NDJSON_OK);
      }
      throw new Error(`unexpected url ${url}`);
    },
    () => askEve("hi", prior)
  );
  assert.equal(freshStreamed, true, "empty continuation must fall back to fresh");
  assert.equal(reply.session.sessionId, "wrun_fresh");
  assert.equal(reply.text, "Your reservation is HM-4471.");
});

test("askEve: a 4xx stream status is not retried (surfaces immediately)", async () => {
  let streamCalls = 0;
  await assert.rejects(
    () =>
      withMockFetch(
        (url) => {
          if (url.endsWith("/eve/v1/session")) {
            return new Response(
              JSON.stringify({ ok: true, sessionId: "eve:1", continuationToken: "t" }),
              { status: 202, headers: { "content-type": "application/json" } }
            );
          }
          if (url.includes("/stream")) {
            streamCalls += 1;
            return new Response("nope", { status: 404 });
          }
          throw new Error(`unexpected url ${url}`);
        },
        () => askEve("hello", null)
      ),
    /Eve stream failed: 404/
  );
  assert.equal(streamCalls, 1, "a 404 is a real error, not retried");
});
