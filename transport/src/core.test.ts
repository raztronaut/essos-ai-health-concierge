import assert from "node:assert/strict";
import { test } from "node:test";
import { isResumeCommand } from "./core.js";

test("isResumeCommand: matches bare resume commands", () => {
  for (const text of [
    "resume",
    "Resume",
    "pls resume",
    "please resume",
    "resume eve",
    "please resume the bot",
    "unpause",
    "reactivate the agent",
    "resume.",
    "  resume!  ",
  ]) {
    assert.equal(isResumeCommand(text), true, `expected match: "${text}"`);
  }
});

test("isResumeCommand: ignores sentences that merely contain the word", () => {
  for (const text of [
    "resume my booking please",
    "can you resume my pickup?",
    "what's my hotel reservation?",
    "I'd like to resume the spa appointment tomorrow",
    "resumed",
    "",
  ]) {
    assert.equal(isResumeCommand(text), false, `expected no match: "${text}"`);
  }
});
