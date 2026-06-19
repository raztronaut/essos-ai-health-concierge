import assert from "node:assert/strict";
import { test } from "node:test";
import { reduceEveEvents, splitNdjson, type EveEvent } from "./eveClient.js";

test("reduceEveEvents: multi-step tool-calls then a final answer", () => {
  const events: EveEvent[] = [
    { type: "turn.started" },
    { type: "message.completed", data: { message: "", finishReason: "tool-calls" } },
    { type: "message.appended", data: { messageSoFar: "Your reservation " } },
    { type: "message.appended", data: { messageSoFar: "Your reservation is HM-4471." } },
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
    { type: "message.appended", data: { messageSoFar: "partial answer so far" } },
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
    { type: "message.completed", data: { message: "", finishReason: "tool-calls" } },
    { type: "turn.completed" },
  ]);
  assert.equal(toolOnly.text, "");
});

test("splitNdjson: keeps a trailing partial line in the buffer", () => {
  const first = splitNdjson('{"type":"a"}\n{"type":"b"}\n{"type":"c"');
  assert.deepEqual(first.lines, ['{"type":"a"}', '{"type":"b"}']);
  assert.equal(first.rest, '{"type":"c"');

  // Feeding the next chunk completes the partial line.
  const second = splitNdjson(first.rest + '}\n');
  assert.deepEqual(second.lines, ['{"type":"c"}']);
  assert.equal(second.rest, "");
});

test("splitNdjson: blank lines are dropped", () => {
  const { lines, rest } = splitNdjson('\n\n{"type":"x"}\n\n');
  assert.deepEqual(lines, ['{"type":"x"}']);
  assert.equal(rest, "");
});
