import {
  appendMessage,
  type Channel,
  ensureConversation,
  ensureGuestPatient,
  getConversationById,
  getConversationBySpace,
  getEveSession,
  getPatientByHandle,
  getPatientById,
  hasMessageWithMetaKind,
  listOpenEscalationsForConversation,
  markConciergeTakeover,
  type Patient,
  recordAgentTurn,
  saveEveSession,
} from "@essos/shared";
import { buildContextMessage } from "./context.js";
import { debug } from "./debug.js";
import { askEve, type EveSession, type TurnTelemetry } from "./eveClient.js";
import { normalizeHandle } from "./handles.js";

/** Best-effort typing indicator, driven only while Eve is composing a reply. */
export interface TypingController {
  start: () => Promise<void> | void;
  stop: () => Promise<void> | void;
}

export type EveResponder = (
  message: string,
  prior: EveSession | null
) => Promise<{ text: string; session: EveSession; telemetry?: TurnTelemetry }>;

// In-memory map of conversation -> durable Eve session, for multi-turn threads.
const sessions = new Map<string, EveSession>();

const HOLDING_NOTICE_MED =
  "Thanks for your message. I've shared this with the Essos care team and someone " +
  "will follow up with you right here shortly. I'll step back so they can take it from here.";
const HOLDING_NOTICE_HIGH =
  "I've flagged this to the Essos care team as a priority and someone is reviewing it now — " +
  "they'll reply right here. If this is a medical emergency, please call your local emergency number.";

/**
 * One-time AI disclosure prepended to Eve's first reply in a conversation. The
 * patient should know they're talking to an AI, with the human care team also on
 * the thread — required for a health context. See ADR 011 and the eve disclosure
 * duty. Gated durably via a `meta.kind = "disclosure"` message so it survives a
 * transport restart and only ever fires once per conversation.
 */
function buildDisclosure(_patient: Patient): string {
  return (
    "Just so you know — you're chatting with Essos's AI concierge assistant. I can help " +
    "with your itinerary, logistics, and travel questions any time, and our human care " +
    "team is on this thread too. For anything medical, a person always steps in."
  );
}

export interface InboundResult {
  reason:
    | "answered"
    | "empty"
    | "unknown_patient"
    | "paused_for_review"
    | "taken_over"
    | "concierge_logged"
    | "concierge_takeover"
    | `eve_error: ${string}`;
  reply: string | null;
}

export interface InboundArgs {
  /** When true, an unknown handle is auto-provisioned a guest demo patient. */
  allowGuest?: boolean;
  authorHandle: string | null;
  channel: Channel;
  /** Injectable for tests; defaults to the live Eve HTTP client. */
  eveRespond?: EveResponder;
  /** Display name to seed a new guest patient with (e.g. the sender's name). */
  guestName?: string | null;
  /** True when the author is a human concierge (their msgs never auto-reply). */
  isConcierge?: boolean;
  /** Patient to bind a brand-new conversation to (terminal demo / fallback). */
  patientId?: string;
  spaceId: string;
  text: string;
  /** Shown only on the auto-respond path, while Eve is actually composing. */
  typing?: TypingController;
}

export async function handleInbound(args: InboundArgs): Promise<InboundResult> {
  const respond = args.eveRespond ?? askEve;

  // 1) Resolve (or create) the conversation and its patient.
  const authorHandle = normalizeHandle(args.authorHandle);
  let conversation = await getConversationBySpace(args.spaceId);
  if (!conversation) {
    let patient =
      (args.patientId ? await getPatientById(args.patientId) : null) ??
      (authorHandle ? await getPatientByHandle(authorHandle) : null);
    // Guest onboarding: an unknown sender gets a demo patient cloned from a
    // template so they can chat with Eve right away. See ADR 017.
    if (!patient && args.allowGuest && authorHandle && !args.isConcierge) {
      patient = await ensureGuestPatient({
        handle: authorHandle,
        name: args.guestName ?? null,
      });
    }
    if (!patient) {
      return { reply: null, reason: "unknown_patient" };
    }
    conversation = await ensureConversation({
      spaceId: args.spaceId,
      patientId: patient.id,
      channel: args.channel,
    });
  }
  const patient = await getPatientById(conversation.patient_id);
  if (!patient) {
    return { reply: null, reason: "unknown_patient" };
  }

  // 2) Concierge (human) message: log it, never auto-reply, and treat it as a
  //    takeover signal if there's an open escalation. See decision 003.
  if (args.isConcierge) {
    await appendMessage({
      conversationId: conversation.id,
      role: "concierge",
      authorHandle,
      text: args.text,
    });
    const open = (
      await listOpenEscalationsForConversation(conversation.id)
    ).filter((e) => e.status === "open");
    if (open.length > 0) {
      await markConciergeTakeover(conversation.id, authorHandle ?? "concierge");
      return { reply: null, reason: "concierge_takeover" };
    }
    return { reply: null, reason: "concierge_logged" };
  }

  // 3) Patient message: always log it first (so it's the escalation source).
  const inbound = await appendMessage({
    conversationId: conversation.id,
    role: "patient",
    authorHandle: authorHandle ?? patient.handle,
    text: args.text,
  });

  // 4) Respect handoff state: if a human owns the thread, don't auto-respond.
  //    While paused, send a single warm holding notice so the patient isn't left
  //    in silence; stay quiet on follow-ups (and once a human has taken over,
  //    their replies reach the patient via the dashboard bridge). See decision 010.
  const fresh = (await getConversationById(conversation.id))!;
  if (fresh.automation_state === "paused_for_review") {
    const open = await listOpenEscalationsForConversation(conversation.id);
    // Durable one-time latch: anchor on the current escalation's open time so
    // we send exactly one holding notice per pause. Reading it from the DB (not
    // an in-memory set) means a transport restart won't re-send it, and a later
    // re-escalation (a newer `created_at`) notifies afresh. See decision 010.
    const since = open[0]?.created_at;
    const alreadyNotified = since
      ? await hasMessageWithMetaKind(conversation.id, "handoff_holding", since)
      : await hasMessageWithMetaKind(conversation.id, "handoff_holding");
    if (alreadyNotified) {
      return { reply: null, reason: "paused_for_review" };
    }
    const isHigh = open.some((e) => e.level === "High");
    const notice = isHigh ? HOLDING_NOTICE_HIGH : HOLDING_NOTICE_MED;
    await appendMessage({
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

  // 5) Automation is active — ask the agent.
  const contextMessage = buildContextMessage({
    patient,
    conversation: fresh,
    sourceMessageId: inbound.id,
    text: args.text,
  });
  // Prefer the in-memory cache, falling back to the persisted session so a
  // transport restart resumes the same multi-turn Eve session. See ADR 010/011.
  const prior =
    sessions.get(conversation.id) ?? (await getEveSession(conversation.id));

  let text = "";
  let telemetry: TurnTelemetry | undefined;
  const startedAt = Date.now();
  try {
    await args.typing?.start();
  } catch {
    // Typing is best-effort; never fail a turn because the indicator didn't set.
  }
  try {
    const result = await respond(contextMessage, prior);
    sessions.set(conversation.id, result.session);
    await saveEveSession(conversation.id, result.session);
    text = result.text;
    telemetry = result.telemetry;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Record the failed turn for observability before bailing.
    await recordAgentTurn({
      conversationId: conversation.id,
      patientId: patient.id,
      latencyMs: Date.now() - startedAt,
      toolCalls: [],
      escalated: false,
      ok: false,
      error: message,
    }).catch(() => {});
    return { reply: null, reason: `eve_error: ${message}` };
  } finally {
    await Promise.resolve(args.typing?.stop()).catch(() => {});
  }
  const latencyMs = Date.now() - startedAt;

  if (!text) {
    debug("transport", "eve returned an empty reply for", conversation.id);
    await recordAgentTurn({
      conversationId: conversation.id,
      patientId: patient.id,
      latencyMs,
      toolCalls: telemetry?.toolCalls ?? [],
      finishReason: telemetry?.finishReason ?? null,
      promptTokens: telemetry?.promptTokens ?? null,
      completionTokens: telemetry?.completionTokens ?? null,
      totalTokens: telemetry?.totalTokens ?? null,
      escalated: false,
      ok: true,
    }).catch(() => {});
    return { reply: null, reason: "empty" };
  }

  // 6) On Eve's very first reply, prepend a one-time AI disclosure (durably
  //    gated, so it survives restarts and never repeats). See ADR 011.
  let reply = text;
  if (!(await hasMessageWithMetaKind(conversation.id, "disclosure"))) {
    const disclosure = buildDisclosure(patient);
    await appendMessage({
      conversationId: conversation.id,
      role: "agent",
      text: disclosure,
      meta: { kind: "disclosure" },
    });
    reply = `${disclosure}\n\n${text}`;
  }

  // 7) Record the agent's reply (escalation rows/pause are written by tools).
  await appendMessage({
    conversationId: conversation.id,
    role: "agent",
    text,
  });

  // 8) Capture per-turn telemetry. The escalate tool pauses the conversation, so
  //    a now-paused state is a reliable "this turn escalated" signal regardless
  //    of the stream's tool-event schema.
  const afterState = (await getConversationById(conversation.id))
    ?.automation_state;
  await recordAgentTurn({
    conversationId: conversation.id,
    patientId: patient.id,
    latencyMs,
    toolCalls: telemetry?.toolCalls ?? [],
    finishReason: telemetry?.finishReason ?? null,
    promptTokens: telemetry?.promptTokens ?? null,
    completionTokens: telemetry?.completionTokens ?? null,
    totalTokens: telemetry?.totalTokens ?? null,
    escalated: afterState === "paused_for_review",
    ok: true,
  }).catch(() => {});

  return { reply, reason: "answered" };
}
