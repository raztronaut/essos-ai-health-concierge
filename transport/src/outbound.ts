import type { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import {
  getConversationById,
  getPatientById,
  listPendingOutbound,
  markOutboundDelivered,
} from "@essos/shared";
import { debug } from "./debug.js";
import { toImessageText } from "./imessageText.js";

export type SpectrumApp = Awaited<ReturnType<typeof Spectrum>>;

/** How often the transport drains concierge replies queued by the dashboard. */
const POLL_INTERVAL_MS = 3000;

/**
 * Delivers concierge replies (queued in SQLite by the dashboard) to the
 * patient's iMessage, closing the human-handoff loop. Each pending message is
 * resolved to its patient handle and sent through the patient's DM space; on
 * success it is marked delivered so it is never sent twice. See decision 010.
 */
async function drainPendingOutbound(app: SpectrumApp): Promise<void> {
  const pending = listPendingOutbound();
  if (pending.length === 0) return;

  for (const message of pending) {
    const conversation = getConversationById(message.conversation_id);
    const patient = conversation ? getPatientById(conversation.patient_id) : null;
    if (!conversation) {
      debug("outbound", "no conversation for", message.id, "- dropping");
      markOutboundDelivered(message.id);
      continue;
    }
    try {
      const space = await resolveSpace(app, conversation.space_id, patient?.handle ?? null);
      if (!space) {
        debug("outbound", "could not resolve space for", message.id, "- dropping");
        markOutboundDelivered(message.id);
        continue;
      }
      await space.send(toImessageText(message.text).text);
      markOutboundDelivered(message.id);
      debug("outbound", "delivered", message.id);
    } catch (err) {
      // Leave it pending for the next tick (at-least-once delivery).
      debug("outbound", "send failed for", message.id, String(err));
    }
  }
}

/**
 * Resolve the patient's iMessage space. The stored `space_id` is the Spectrum
 * chat GUID with our `imessage:` prefix, so look up the existing DM first; fall
 * back to (re)creating a DM from the patient handle if the lookup fails.
 */
async function resolveSpace(app: SpectrumApp, spaceId: string, handle: string | null) {
  const im = imessage(app);
  const chatGuid = spaceId.replace(/^imessage:/, "");
  try {
    const existing = await im.space.get(chatGuid);
    if (existing) return existing;
  } catch (err) {
    debug("outbound", "space.get failed, will try create:", String(err));
  }
  if (!handle) return null;
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
  text: string,
): Promise<boolean> {
  const space = await resolveSpace(app, spaceId, handle);
  if (!space) return false;
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
    if (running) return;
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
