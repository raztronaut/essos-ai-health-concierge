import {
  appendMessage,
  ensureConversation,
  getConversationById,
  getConversationBySpace,
  getPatientById,
  getPatientByHandle,
  listOpenEscalationsForConversation,
  markConciergeTakeover,
  type Channel,
} from "@essos/shared";
import { buildContextMessage } from "./context.js";
import { askEve, type EveSession } from "./eveClient.js";
import { normalizeHandle } from "./handles.js";
import { debug } from "./debug.js";

/** Best-effort typing indicator, driven only while Eve is composing a reply. */
export interface TypingController {
  start: () => Promise<void> | void;
  stop: () => Promise<void> | void;
}

export type EveResponder = (
  message: string,
  prior: EveSession | null,
) => Promise<{ text: string; session: EveSession }>;

// In-memory map of conversation -> durable Eve session, for multi-turn threads.
const sessions = new Map<string, EveSession>();

// Conversations we've already sent a "care team is reviewing" holding notice to
// during the current pause. Cleared when the conversation goes active again so a
// later re-escalation notifies afresh. See decision 010.
const holdingNotified = new Set<string>();

const HOLDING_NOTICE_MED =
  "Thanks for your message. I've shared this with the Essos care team and someone " +
  "will follow up with you right here shortly. I'll step back so they can take it from here.";
const HOLDING_NOTICE_HIGH =
  "I've flagged this to the Essos care team as a priority and someone is reviewing it now — " +
  "they'll reply right here. If this is a medical emergency, please call your local emergency number.";

export interface InboundResult {
  reply: string | null;
  reason:
    | "answered"
    | "empty"
    | "unknown_patient"
    | "paused_for_review"
    | "taken_over"
    | "concierge_logged"
    | "concierge_takeover"
    | `eve_error: ${string}`;
}

export interface InboundArgs {
  spaceId: string;
  channel: Channel;
  authorHandle: string | null;
  text: string;
  /** True when the author is a human concierge (their msgs never auto-reply). */
  isConcierge?: boolean;
  /** Patient to bind a brand-new conversation to (terminal demo / fallback). */
  patientId?: string;
  /** Injectable for tests; defaults to the live Eve HTTP client. */
  eveRespond?: EveResponder;
  /** Shown only on the auto-respond path, while Eve is actually composing. */
  typing?: TypingController;
}

export async function handleInbound(args: InboundArgs): Promise<InboundResult> {
  const respond = args.eveRespond ?? askEve;

  // 1) Resolve (or create) the conversation and its patient.
  const authorHandle = normalizeHandle(args.authorHandle);
  let conversation = getConversationBySpace(args.spaceId);
  if (!conversation) {
    const patient =
      (args.patientId ? getPatientById(args.patientId) : null) ??
      (authorHandle ? getPatientByHandle(authorHandle) : null);
    if (!patient) return { reply: null, reason: "unknown_patient" };
    conversation = ensureConversation({
      spaceId: args.spaceId,
      patientId: patient.id,
      channel: args.channel,
    });
  }
  const patient = getPatientById(conversation.patient_id);
  if (!patient) return { reply: null, reason: "unknown_patient" };

  // 2) Concierge (human) message: log it, never auto-reply, and treat it as a
  //    takeover signal if there's an open escalation. See decision 003.
  if (args.isConcierge) {
    appendMessage({
      conversationId: conversation.id,
      role: "concierge",
      authorHandle,
      text: args.text,
    });
    const open = listOpenEscalationsForConversation(conversation.id).filter(
      (e) => e.status === "open",
    );
    if (open.length > 0) {
      markConciergeTakeover(conversation.id, authorHandle ?? "concierge");
      return { reply: null, reason: "concierge_takeover" };
    }
    return { reply: null, reason: "concierge_logged" };
  }

  // 3) Patient message: always log it first (so it's the escalation source).
  const inbound = appendMessage({
    conversationId: conversation.id,
    role: "patient",
    authorHandle: authorHandle ?? patient.handle,
    text: args.text,
  });

  // 4) Respect handoff state: if a human owns the thread, don't auto-respond.
  //    While paused, send a single warm holding notice so the patient isn't left
  //    in silence; stay quiet on follow-ups (and once a human has taken over,
  //    their replies reach the patient via the dashboard bridge). See decision 010.
  const fresh = getConversationById(conversation.id)!;
  if (fresh.automation_state === "paused_for_review") {
    if (holdingNotified.has(conversation.id)) {
      return { reply: null, reason: "paused_for_review" };
    }
    holdingNotified.add(conversation.id);
    const isHigh = listOpenEscalationsForConversation(conversation.id).some(
      (e) => e.level === "High",
    );
    const notice = isHigh ? HOLDING_NOTICE_HIGH : HOLDING_NOTICE_MED;
    appendMessage({
      conversationId: conversation.id,
      role: "agent",
      text: notice,
      meta: { kind: "handoff_holding" },
    });
    return { reply: notice, reason: "paused_for_review" };
  }
  if (fresh.automation_state === "taken_over") {
    return { reply: null, reason: "taken_over" };
  }

  // 5) Automation is active — clear any prior holding-notice latch so a future
  //    re-escalation notifies again, then ask the agent.
  holdingNotified.delete(conversation.id);
  const contextMessage = buildContextMessage({
    patient,
    conversation: fresh,
    sourceMessageId: inbound.id,
    text: args.text,
  });
  const prior = sessions.get(conversation.id) ?? null;

  let text = "";
  try {
    await args.typing?.start();
  } catch {
    // Typing is best-effort; never fail a turn because the indicator didn't set.
  }
  try {
    const result = await respond(contextMessage, prior);
    sessions.set(conversation.id, result.session);
    text = result.text;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { reply: null, reason: `eve_error: ${message}` };
  } finally {
    await Promise.resolve(args.typing?.stop()).catch(() => {});
  }

  if (!text) {
    debug("transport", "eve returned an empty reply for", conversation.id);
    return { reply: null, reason: "empty" };
  }

  // 6) Record the agent's reply (escalation rows/pause are written by tools).
  appendMessage({
    conversationId: conversation.id,
    role: "agent",
    text,
  });
  return { reply: text, reason: "answered" };
}
