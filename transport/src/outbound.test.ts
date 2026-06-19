import assert from "node:assert/strict";
import { test } from "node:test";
import { isPermanentSendError } from "./outbound.js";

test("isPermanentSendError: Spectrum chat-guid ValidationError is permanent", () => {
  const err = new Error(
    'ValidationError: chat must start with "any;-;" for direct chats or "any;+;" for group chats'
  );
  assert.equal(isPermanentSendError(err), true);
});

test("isPermanentSendError: a malformed-address message is permanent", () => {
  assert.equal(
    isPermanentSendError(new Error("invalid address provided")),
    true
  );
});

test("isPermanentSendError: a transient connection error is retryable", () => {
  const err = new Error("ConnectionError: No connection established");
  assert.equal(isPermanentSendError(err), false);
});

test("isPermanentSendError: non-Error values are handled", () => {
  assert.equal(isPermanentSendError("UNAVAILABLE: try again"), false);
  assert.equal(isPermanentSendError("ValidationError: bad guid"), true);
});
