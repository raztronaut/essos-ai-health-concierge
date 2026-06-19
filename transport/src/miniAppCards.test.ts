import assert from "node:assert/strict";
import { test } from "node:test";
import type { PatientCardLink } from "@essos/shared";
import { sendMiniAppCard } from "./miniAppCards.js";

const link: PatientCardLink = {
  expiresAt: "2026-06-19T12:00:00.000Z",
  path: "/p/tok",
  purpose: "itinerary",
  token: "tok",
  url: "https://mini.essos.dev/p/tok",
};

test("sendMiniAppCard: link mode asks caller to send plain fallback", async () => {
  let calls = 0;
  const result = await sendMiniAppCard(
    link,
    {
      appStoreId: null,
      appleTeamId: null,
      extensionBundleId: "com.essos.raziworktrial.MessagesExtension",
      mode: "link",
    },
    async () => {
      calls += 1;
      return true;
    }
  );
  assert.equal(calls, 0);
  assert.deepEqual(result, {
    delivered: false,
    mode: null,
    reason: "link mode",
  });
});

test("sendMiniAppCard: spectrum_app sends one native card", async () => {
  const sent: unknown[] = [];
  const result = await sendMiniAppCard(
    link,
    {
      appStoreId: null,
      appleTeamId: null,
      extensionBundleId: "com.essos.raziworktrial.MessagesExtension",
      mode: "spectrum_app",
    },
    async (content) => {
      sent.push(content);
      return true;
    }
  );
  assert.equal(sent.length, 1);
  assert.equal(result.delivered, true);
  assert.equal(result.mode, "spectrum_app");
});

test("sendMiniAppCard: customized_miniapp without team id falls back to spectrum_app", async () => {
  const sent: unknown[] = [];
  const result = await sendMiniAppCard(
    link,
    {
      appStoreId: null,
      appleTeamId: null,
      extensionBundleId: "com.essos.raziworktrial.MessagesExtension",
      mode: "customized_miniapp",
    },
    async (content) => {
      sent.push(content);
      return true;
    }
  );
  assert.equal(sent.length, 1);
  assert.equal(result.delivered, true);
  assert.equal(result.mode, "spectrum_app");
});

test("sendMiniAppCard: customized_miniapp falls back to spectrum_app when custom send fails", async () => {
  let calls = 0;
  const result = await sendMiniAppCard(
    link,
    {
      appStoreId: null,
      appleTeamId: "ABCDE12345",
      extensionBundleId: "com.essos.raziworktrial.MessagesExtension",
      mode: "customized_miniapp",
    },
    async () => {
      calls += 1;
      if (calls === 1) {
        throw new Error("custom unavailable");
      }
      return true;
    }
  );
  assert.equal(calls, 2);
  assert.equal(result.delivered, true);
  assert.equal(result.mode, "spectrum_app");
});
