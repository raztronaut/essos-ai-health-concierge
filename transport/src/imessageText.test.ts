import assert from "node:assert/strict";
import { test } from "node:test";
import { toImessageText } from "./imessageText.js";

test("toImessageText: plain text passes through unchanged", () => {
  const input =
    "Your driver Luis will meet you at 1:30 PM. Text here if anything changes.";
  assert.equal(toImessageText(input).text, input);
});

test("toImessageText: strips bold and italic markers", () => {
  assert.equal(
    toImessageText("Confirmation **GHT-770133** is in *your* name.").text,
    "Confirmation GHT-770133 is in your name."
  );
  assert.equal(
    toImessageText("__strong__ and _soft_ emphasis").text,
    "strong and soft emphasis"
  );
});

test("toImessageText: leaves snake_case underscores intact", () => {
  assert.equal(
    toImessageText("the field patient_id stays").text,
    "the field patient_id stays"
  );
});

test("toImessageText: converts headers to plain lines", () => {
  assert.equal(toImessageText("## Pre-op checklist").text, "Pre-op checklist");
});

test("toImessageText: converts unordered bullets to •", () => {
  const out = toImessageText(
    "- Stop eating at 8pm\n- Bring your passport"
  ).text;
  assert.equal(out, "• Stop eating at 8pm\n• Bring your passport");
});

test("toImessageText: keeps numbered lists", () => {
  const out = toImessageText("1. First\n2. Second").text;
  assert.equal(out, "1. First\n2. Second");
});

test("toImessageText: rewrites links and autolinks", () => {
  assert.equal(
    toImessageText("See [the clinic](https://clinic.example.com) for details")
      .text,
    "See the clinic (https://clinic.example.com) for details"
  );
  assert.equal(
    toImessageText("<https://essos.example.com>").text,
    "https://essos.example.com"
  );
});

test("toImessageText: unwraps inline and fenced code", () => {
  assert.equal(toImessageText("Call `Luis` now").text, "Call Luis now");
  assert.equal(
    toImessageText("```\nline one\nline two\n```").text,
    "line one\nline two"
  );
});

test("toImessageText: drops horizontal rules and collapses blank runs", () => {
  assert.equal(toImessageText("a\n\n\n\n---\n\nb").text, "a\n\nb");
});

test("toImessageText: extracts a trailing react token", () => {
  const out = toImessageText("Got it, all set! [[react: like]]");
  assert.equal(out.text, "Got it, all set!");
  assert.equal(out.react, "like");
});

test("toImessageText: react-only message yields empty text", () => {
  const out = toImessageText("[[react: love]]");
  assert.equal(out.text, "");
  assert.equal(out.react, "love");
});

test("toImessageText: ignores unknown react tokens but still strips them", () => {
  const out = toImessageText("Done [[react: shrug]]");
  assert.equal(out.text, "Done");
  assert.equal(out.react, null);
});

test("toImessageText: real-world markdown reply renders clean", () => {
  const input =
    "Your hotel reservation at the **Grand Hotel Tijuana** is under confirmation number **GHT-770133**.\n\n" +
    "- Check-in: June 20 at 1:30 PM\n" +
    "- Pickup: Luis Herrera at [SAN](https://maps.example.com/san)";
  const out = toImessageText(input).text;
  assert.equal(
    out,
    "Your hotel reservation at the Grand Hotel Tijuana is under confirmation number GHT-770133.\n\n" +
      "• Check-in: June 20 at 1:30 PM\n" +
      "• Pickup: Luis Herrera at SAN (https://maps.example.com/san)"
  );
});
