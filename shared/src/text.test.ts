import assert from "node:assert/strict";
import { test } from "node:test";
import { levenshtein, normalizedEditDistance } from "./text.js";

test("levenshtein basics", () => {
  assert.equal(levenshtein("", ""), 0);
  assert.equal(levenshtein("abc", "abc"), 0);
  assert.equal(levenshtein("abc", "abd"), 1);
  assert.equal(levenshtein("kitten", "sitting"), 3);
  assert.equal(levenshtein("", "abc"), 3);
});

test("normalizedEditDistance is 0 for identical, 1 for fully different", () => {
  assert.equal(normalizedEditDistance("hello", "hello"), 0);
  assert.equal(normalizedEditDistance("", ""), 0);
  assert.equal(normalizedEditDistance("abc", "xyz"), 1);
});

test("normalizedEditDistance scales by the longer string", () => {
  // one substitution out of four chars
  assert.equal(normalizedEditDistance("abcd", "abce"), 0.25);
});
