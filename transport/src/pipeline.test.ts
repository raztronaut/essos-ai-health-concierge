import assert from "node:assert/strict";
import { test } from "node:test";
import { combineText, splitBubbles } from "./pipeline.js";

const msg = (text: string, source = "msg_x") => ({
  client_guid: "g",
  author_handle: null,
  source_message_id: source,
  text,
  created_at: "2026-01-01T00:00:00.000Z",
});

test("combineText: drained-only joins messages in order", () => {
  const out = combineText([], [msg("hey"), msg("wait"), msg("the question")]);
  assert.equal(out, "hey\nwait\nthe question");
});

test("combineText: carried messages are prepended as earlier context", () => {
  const out = combineText([msg("first")], [msg("now")]);
  assert.equal(out, "[Earlier message] first\nnow");
});

test("combineText: empty batch yields empty string", () => {
  assert.equal(combineText([], []), "");
});

test("splitBubbles: blank lines separate bubbles, whitespace trimmed", () => {
  assert.deepEqual(splitBubbles("one\n\ntwo\n\n\nthree"), [
    "one",
    "two",
    "three",
  ]);
});

test("splitBubbles: a single block stays one bubble", () => {
  assert.deepEqual(splitBubbles("just one line"), ["just one line"]);
});

test("splitBubbles: a disclosure prefix becomes its own bubble", () => {
  const reply = "Disclosure line.\n\nActual answer.";
  assert.deepEqual(splitBubbles(reply), ["Disclosure line.", "Actual answer."]);
});
