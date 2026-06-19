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

export type EveResponder = (
  message: string,
  prior: EveSession | null,
) => Promise<{ text: string; session: EveSession }>;

// In-memory map of conversation -> durable Eve session, for multi-turn threads.
const sessions = new Map<string, EveSession>();

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
}

export async function handleInbound(args: InboundArgs): Promise<InboundResult> {
  const respond = args.eveRespond ?? askEve;

  // 1) Resolve (or create) the conversation and its patient.
  let conversation = getConversationBySpace(args.spaceId);
  if (!conversation) {
    const patient =
      (args.patientId ? getPatientById(args.patientId) : null) ??
      (args.authorHandle ? getPatientByHandle(args.authorHandle) : null);
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
      authorHandle: args.authorHandle,
      text: args.text,
    });
    const open = listOpenEscalationsForConversation(conversation.id).filter(
      (e) => e.status === "open",
    );
    if (open.length > 0) {
      markConciergeTakeover(conversation.id, args.authorHandle ?? "concierge");
      return { reply: null, reason: "concierge_takeover" };
    }
    return { reply: null, reason: "concierge_logged" };
  }

  // 3) Patient message: always log it first (so it's the escalation source).
  const inbound = appendMessage({
    conversationId: conversation.id,
    role: "patient",
    authorHandle: args.authorHandle ?? patient.handle,
    text: args.text,
  });

  // 4) Respect handoff state: if a human owns the thread, don't auto-respond.
  const fresh = getConversationById(conversation.id)!;
  if (fresh.automation_state === "paused_for_review") {
    return { reply: null, reason: "paused_for_review" };
  }
  if (fresh.automation_state === "taken_over") {
    return { reply: null, reason: "taken_over" };
  }

  // 5) Ask the agent.
  const contextMessage = buildContextMessage({
    patient,
    conversation: fresh,
    sourceMessageId: inbound.id,
    text: args.text,
  });
  const prior = sessions.get(conversation.id) ?? null;

  let text = "";
  try {
    const result = await respond(contextMessage, prior);
    sessions.set(conversation.id, result.session);
    text = result.text;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { reply: null, reason: `eve_error: ${message}` };
  }

  if (!text) return { reply: null, reason: "empty" };

  // 6) Record the agent's reply (escalation rows/pause are written by tools).
  appendMessage({
    conversationId: conversation.id,
    role: "agent",
    text,
  });
  return { reply: text, reason: "answered" };
}
