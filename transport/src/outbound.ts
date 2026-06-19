import {
  getConversationById,
  getPatientById,
  listPendingOutbound,
  markOutboundDelivered,
  recordOutboundFailure,
} from "@essos/shared";
import type { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import { debug } from "./debug.js";
import { toImessageText } from "./imessageText.js";

export type SpectrumApp = Awaited<ReturnType<typeof Spectrum>>;

/** How often the transport drains concierge replies queued by the dashboard. */
const POLL_INTERVAL_MS = 3000;

/**
 * Whether a send error is permanent (a bad/malformed address) rather than a
 * transient outage. Permanent failures dead-letter immediately instead of
 * retrying forever — e.g. a Spectrum `ValidationError` on the chat GUID, which
 * no amount of retrying will fix.
 */
export function isPermanentSendError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /ValidationError|must start with "any;|invalid (chat|address)/i.test(
    message
  );
}

/** Dead-letter (or retry) one outbound row, logging the resulting state. */
async function failOutbound(
  messageId: string,
  error: string,
  permanent: boolean
): Promise<void> {
  const result = await recordOutboundFailure({ messageId, error, permanent });
  debug(
    "outbound",
    result.outbound === "failed" ? "dead-lettered" : "will retry",
    messageId,
    `(attempt ${result.attempts})`,
    error
  );
}

/**
 * Delivers concierge replies (queued in SQLite by the dashboard) to the
 * patient's iMessage, closing the human-handoff loop. Each pending message is
 * resolved to its patient handle and sent through the patient's DM space; on
 * success it is marked delivered so it is never sent twice. See decision 010.
 */
async function drainPendingOutbound(app: SpectrumApp): Promise<void> {
  const pending = await listPendingOutbound();
  if (pending.length === 0) {
    return;
  }

  for (const message of pending) {
    const conversation = await getConversationById(message.conversation_id);
    if (!conversation) {
      await failOutbound(message.id, "no conversation for message", true);
      continue;
    }
    // Only iMessage spaces are deliverable here. Seed/demo conversations carry
    // placeholder space ids (e.g. "demo-space-…") that can never resolve to a
    // real chat — dead-letter them fast instead of hammering Spectrum forever.
    if (!conversation.space_id.startsWith("imessage:")) {
      await failOutbound(
        message.id,
        `undeliverable space_id "${conversation.space_id}"`,
        true
      );
      continue;
    }
    const patient = await getPatientById(conversation.patient_id);
    try {
      const space = await resolveSpace(
        app,
        conversation.space_id,
        patient?.handle ?? null
      );
      if (!space) {
        await failOutbound(
          message.id,
          "could not resolve iMessage space",
          true
        );
        continue;
      }
      await space.send(toImessageText(message.text).text);
      await markOutboundDelivered(message.id);
      debug("outbound", "delivered", message.id);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      await failOutbound(message.id, error, isPermanentSendError(err));
    }
  }
}

/**
 * Resolve the patient's iMessage space. The stored `space_id` is the Spectrum
 * chat GUID with our `imessage:` prefix, so look up the existing DM first; fall
 * back to (re)creating a DM from the patient handle if the lookup fails.
 */
async function resolveSpace(
  app: SpectrumApp,
  spaceId: string,
  handle: string | null
) {
  const im = imessage(app);
  const chatGuid = spaceId.replace(/^imessage:/, "");
  try {
    const existing = await im.space.get(chatGuid);
    if (existing) {
      return existing;
    }
  } catch (err) {
    debug("outbound", "space.get failed, will try create:", String(err));
  }
  if (!handle) {
    return null;
  }
  const user = await im.user(handle);
  return im.space.create(user);
}

/**
 * Resolve a patient's iMessage space and send `text`, returning whether it was
 * delivered. Shared by the concierge-reply bridge and the proactive reminder
 * sweep so the Spectrum send path lives in one place (and its internal space
 * type never leaks across module boundaries).
 */
export async function sendToPatientSpace(
  app: SpectrumApp,
  spaceId: string,
  handle: string | null,
  text: string
): Promise<boolean> {
  const space = await resolveSpace(app, spaceId, handle);
  if (!space) {
    return false;
  }
  await space.send(toImessageText(text).text);
  return true;
}

/**
 * Start the outbound poll loop. Returns a stop function. Ticks never overlap, so
 * a slow send can't trigger a duplicate drain.
 */
export function startOutboundLoop(app: SpectrumApp): () => void {
  let running = false;
  const timer = setInterval(() => {
    if (running) {
      return;
    }
    running = true;
    void drainPendingOutbound(app)
      .catch((err) => debug("outbound", "drain error", String(err)))
      .finally(() => {
        running = false;
      });
  }, POLL_INTERVAL_MS);
  timer.unref?.();
  return () => clearInterval(timer);
}
