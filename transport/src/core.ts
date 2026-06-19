import {
  appendMessage,
  type Channel,
  type Conversation,
  ensureConversation,
  ensureGuestPatient,
  escalateToHuman,
  getAgentMemory,
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
  resolveAndResume,
  resumeAutomation,
  saveEveSession,
} from "@essos/shared";
import { buildContextMessage } from "./context.js";
import { debug } from "./debug.js";
import { GUEST_TEMPLATE } from "./env.js";
import { askEve, type EveSession, type TurnTelemetry } from "./eveClient.js";
import { normalizeHandle } from "./handles.js";

/**
 * Best-effort mapping from the tool Eve used to the taxonomy category an
 * autonomous turn served, so `agent_turns.category` is populated for answered
 * turns too (escalated turns take their category from the escalation's
 * `reason`). The last meaningful tool wins. Null when no tool maps cleanly —
 * the metric then falls back to "uncategorized" rather than guessing.
 */
const TOOL_CATEGORY: Record<string, string> = {
  get_itinerary: "itinerary_reference",
  update_logistics: "travel_logistics",
  get_care_instructions: "documented_preop_reference",
  search_local_places: "local_recommendation",
};

function inferCategoryFromTools(toolCalls: string[]): string | null {
  for (const tool of [...toolCalls].reverse()) {
    const category = TOOL_CATEGORY[tool];
    if (category) {
      return category;
    }
  }
  return null;
}

/** Best-effort typing indicator, driven only while Eve is composing a reply. */
export interface TypingController {
  start: () => Promise<void> | void;
  stop: () => Promise<void> | void;
}

export type EveResponder = (
  message: string,
  prior: EveSession | null,
  signal?: AbortSignal
) => Promise<{ text: string; session: EveSession; telemetry?: TurnTelemetry }>;

// In-memory map of conversation -> durable Eve session, for multi-turn threads.
const sessions = new Map<string, EveSession>();

const HOLDING_NOTICE_MED =
  "Thanks for your message. I've shared this with the Essos care team and someone " +
  "will follow up with you right here shortly. I'll step back so they can take it from here.";
const HOLDING_NOTICE_HIGH =
  "I've flagged this to the Essos care team as a priority and someone is reviewing it now — " +
  "they'll reply right here. If this is a medical emergency, please call your local emergency number.";
const AUTO_RESUME_FALLBACK_AFTER_MS = 10 * 60 * 1000;

function deliveryMeta(
  conversation: Pick<Conversation, "channel">,
  meta: Record<string, unknown> = {}
): Record<string, unknown> | undefined {
  if (conversation.channel === "imessage") {
    return { ...meta, outbound: "pending" };
  }
  return Object.keys(meta).length > 0 ? meta : undefined;
}

function isStaleAutomatedFallback(
  escalation: { created_at: string; reason: string; summary: string },
  now = Date.now()
): boolean {
  const createdAt = Date.parse(escalation.created_at);
  return (
    Number.isFinite(createdAt) &&
    now - createdAt >= AUTO_RESUME_FALLBACK_AFTER_MS &&
    escalation.reason === "missing_source_or_unsure" &&
    escalation.summary.startsWith("Automated fallback")
  );
}

/**
 * One-time AI disclosure prepended to Eve's first reply in a conversation. The
 * patient should know they're talking to an AI, with the human care team also on
 * the thread — required for a health context. See ADR 011 and the eve disclosure
 * duty. Gated durably via a `meta.kind = "disclosure"` message so it survives a
 * transport restart and only ever fires once per conversation.
 */
function buildDisclosure(_patient: Patient): string {
  return (
    "Just so you know — I'm Eve, Essos's AI concierge. I can help with itinerary, " +
    "logistics, confirmations, and source docs; for medical questions, a human care " +
    "team member steps in."
  );
}

export interface InboundResult {
  deliveryMessageIds?: string[];
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

/**
 * When Eve can't produce a reply (it errored, or the turn was silent), route the
 * patient to the human care team instead of leaving them in silence — the worst
 * outcome in a health context. Reuses `escalateToHuman` (create + pause + log +
 * Slack notify) and sends the same warm holding notice the paused path uses,
 * latched on `handoff_holding` so follow-ups don't repeat it. See ADR 010/011.
 */
async function degradeToHuman(args: {
  channel: Channel;
  conversationId: string;
  patientId: string;
  sourceMessageId: string | null;
  errorDetail: string;
  reason: InboundResult["reason"];
}): Promise<InboundResult> {
  // No try/catch here: this is the patient's safety net. If escalation
  // bookkeeping or the holding-notice write fails, that is a critical failure
  // that must surface loudly (the caller records it to job_failures) rather
  // than pretending the patient was routed to a human when they weren't.
  await escalateToHuman({
    conversationId: args.conversationId,
    patientId: args.patientId,
    level: "Med",
    reason: "missing_source_or_unsure",
    summary: `Automated fallback — the AI concierge could not produce a reply (${args.errorDetail}). Routed to the care team.`,
    sourceMessageId: args.sourceMessageId,
  });
  const holding = await appendMessage({
    conversationId: args.conversationId,
    role: "agent",
    text: HOLDING_NOTICE_MED,
    meta:
      args.channel === "imessage"
        ? { kind: "handoff_holding", outbound: "pending" }
        : { kind: "handoff_holding" },
  });
  return {
    deliveryMessageIds: args.channel === "imessage" ? [holding.id] : [],
    reply: HOLDING_NOTICE_MED,
    reason: args.reason,
  };
}

/**
 * Patient self-serve resume: a paused/taken-over thread can be handed back to
 * Eve by the patient texting a short "resume" command. Matches the whole
 * (trimmed) message so it never fires on a sentence that merely contains the
 * word — e.g. "resume my booking" is not a command. See ADR 010.
 */
const RESUME_COMMAND =
  /^(pls\s+|please\s+)?(resume|unpause|reactivate)( eve| the (bot|agent|ai|assistant))?[\s.!]*$/i;

export function isResumeCommand(text: string): boolean {
  return RESUME_COMMAND.test(text.trim());
}

const RESUME_CONFIRMATION =
  "You're back with Eve — I've got it from here. What can I help you with?";

/**
 * Handle a patient "resume" command on a paused/taken-over thread: clear the
 * open flags, resume automation, and confirm in-thread. Returns true when the
 * command applied (the caller should not also run a normal turn for it), false
 * when the thread was already active (treat the text as a normal message).
 */
export async function handlePatientResume(
  conversationId: string,
  send: (text: string) => Promise<void>
): Promise<boolean> {
  const fresh = await getConversationById(conversationId);
  if (!fresh || fresh.automation_state === "active") {
    return false;
  }
  await resolveAndResume(conversationId, "patient");
  await appendMessage({
    conversationId,
    role: "agent",
    text: RESUME_CONFIRMATION,
    meta: { kind: "resume_confirmation" },
  });
  await send(RESUME_CONFIRMATION);
  return true;
}

/**
 * Thrown when a turn is aborted mid-generation because a follow-up message
 * arrived. The pipeline catches it to carry the batch forward without
 * degrading to a human (an abort is not an error).
 */
export class TurnAbortedError extends Error {
  constructor() {
    super("turn aborted");
    this.name = "TurnAbortedError";
  }
}

export interface ResolvedConversation {
  conversation: Conversation;
  patient: Patient;
}

/**
 * Resolve (or create) the conversation and its patient for an inbound message,
 * including guest onboarding (ADR 017). Returns null when no patient can be
 * resolved and guest mode does not apply (an unknown sender).
 */
export async function resolveConversationAndPatient(args: {
  spaceId: string;
  channel: Channel;
  authorHandle: string | null;
  patientId?: string;
  isConcierge?: boolean;
  allowGuest?: boolean;
  guestName?: string | null;
}): Promise<ResolvedConversation | null> {
  const authorHandle = normalizeHandle(args.authorHandle);
  let conversation = await getConversationBySpace(args.spaceId);
  if (!conversation) {
    let patient =
      (args.patientId ? await getPatientById(args.patientId) : null) ??
      (authorHandle ? await getPatientByHandle(authorHandle) : null);
    if (!patient && args.allowGuest && authorHandle && !args.isConcierge) {
      patient = await ensureGuestPatient({
        handle: authorHandle,
        name: args.guestName ?? null,
        templateId: GUEST_TEMPLATE,
      });
    }
    if (!patient) {
      return null;
    }
    conversation = await ensureConversation({
      spaceId: args.spaceId,
      patientId: patient.id,
      channel: args.channel,
    });
  }
  const patient = await getPatientById(conversation.patient_id);
  if (!patient) {
    return null;
  }
  return { conversation, patient };
}

/**
 * Log a concierge (human) message and treat it as a takeover signal when an
 * escalation is open. Never auto-replies. See decision 003.
 */
export async function handleConciergeMessage(
  conversationId: string,
  authorHandle: string | null,
  text: string
): Promise<InboundResult> {
  await appendMessage({
    conversationId,
    role: "concierge",
    authorHandle,
    text,
  });
  const open = (
    await listOpenEscalationsForConversation(conversationId)
  ).filter((e) => e.status === "open");
  if (open.length > 0) {
    await markConciergeTakeover(conversationId, authorHandle ?? "concierge");
    return { reply: null, reason: "concierge_takeover" };
  }
  return { reply: null, reason: "concierge_logged" };
}

export interface GenerateTurnArgs {
  /** The (already-combined, already-logged) patient text for this turn. */
  combinedText: string;
  conversation: Conversation;
  /** Injectable for tests; defaults to the live Eve HTTP client. */
  eveRespond?: EveResponder;
  patient: Patient;
  /** Aborts the in-flight model call when a follow-up message arrives. */
  signal?: AbortSignal;
  /** The logged patient message id this turn answers (the escalation source). */
  sourceMessageId: string;
  typing?: TypingController;
}

/**
 * Generate one agent turn for an active conversation: respect handoff state,
 * inject per-resource memory, ask Eve (degrading to a human on failure/empty),
 * apply the one-time disclosure, and record telemetry. Returns the reply to
 * send (null when paused/taken over). Throws {@link TurnAbortedError} if the
 * `signal` fires mid-generation.
 */
export async function generateTurn(
  args: GenerateTurnArgs
): Promise<InboundResult> {
  const respond = args.eveRespond ?? askEve;
  const { conversation, patient } = args;

  // Respect handoff state (re-read fresh: a tool or human may have changed it).
  let fresh = (await getConversationById(conversation.id)) ?? conversation;
  if (fresh.automation_state === "paused_for_review") {
    const open = await listOpenEscalationsForConversation(conversation.id);
    const latestOpen = open[0];
    if (!latestOpen) {
      // Paused but nothing open to review — the flag was resolved without
      // resuming, or state drifted. Self-heal so the patient is never stranded
      // in silence, then fall through to a normal Eve turn.
      debug(
        "transport",
        "paused with no open escalation; resuming Eve",
        conversation.id
      );
      await resumeAutomation(conversation.id, "system");
      fresh = (await getConversationById(conversation.id)) ?? conversation;
    } else if (
      open.length > 0 &&
      open.every((e) => isStaleAutomatedFallback(e))
    ) {
      debug(
        "transport",
        "auto-resuming stale automated fallback",
        conversation.id
      );
      await resolveAndResume(conversation.id, "system");
      fresh = (await getConversationById(conversation.id)) ?? conversation;
    } else {
      // Durable one-time latch anchored on the current escalation's open time,
      // so exactly one holding notice is sent per pause, a restart won't repeat
      // it, and a re-pause after a resume (a newer escalation) notifies again.
      const since = latestOpen.created_at;
      const alreadyNotified = await hasMessageWithMetaKind(
        conversation.id,
        "handoff_holding",
        since
      );
      if (alreadyNotified) {
        return { reply: null, reason: "paused_for_review" };
      }
      const isHigh = open.some((e) => e.level === "High");
      const notice = isHigh ? HOLDING_NOTICE_HIGH : HOLDING_NOTICE_MED;
      const holding = await appendMessage({
        conversationId: conversation.id,
        role: "agent",
        text: notice,
        meta: deliveryMeta(fresh, { kind: "handoff_holding" }),
      });
      return {
        deliveryMessageIds: fresh.channel === "imessage" ? [holding.id] : [],
        reply: notice,
        reason: "paused_for_review",
      };
    }
  } else if (fresh.automation_state === "taken_over") {
    return { reply: null, reason: "taken_over" };
  }

  // Per-person memory (keyed by patient, stable across their conversations).
  // Memory is an optional enhancement, so a fetch error is logged and the turn
  // proceeds without it — but it is never silently swallowed.
  const memory =
    (
      await getAgentMemory(patient.id).catch((err: unknown) => {
        debug("transport", "memory fetch failed", String(err));
        return null;
      })
    )?.working_memory ?? null;
  const contextMessage = buildContextMessage({
    patient,
    conversation: fresh,
    sourceMessageId: args.sourceMessageId,
    text: args.combinedText,
    memory,
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
  } catch (err) {
    // Typing is best-effort; never fail a turn because the indicator didn't set.
    debug("transport", "typing start failed", String(err));
  }
  try {
    const result = await respond(contextMessage, prior, args.signal);
    sessions.set(conversation.id, result.session);
    await saveEveSession(conversation.id, result.session);
    text = result.text;
    telemetry = result.telemetry;
  } catch (err) {
    if (args.signal?.aborted) {
      // A follow-up arrived; abandon this turn so the pipeline can re-batch.
      throw new TurnAbortedError();
    }
    const message = err instanceof Error ? err.message : String(err);
    await recordAgentTurn({
      conversationId: conversation.id,
      patientId: patient.id,
      latencyMs: Date.now() - startedAt,
      toolCalls: [],
      escalated: false,
      ok: false,
      error: message,
    }).catch((telemetryErr: unknown) => {
      debug("transport", "telemetry record failed", String(telemetryErr));
    });
    return await degradeToHuman({
      channel: conversation.channel,
      conversationId: conversation.id,
      patientId: patient.id,
      sourceMessageId: args.sourceMessageId,
      errorDetail: message,
      reason: `eve_error: ${message}`,
    });
  } finally {
    await Promise.resolve(args.typing?.stop()).catch((err: unknown) => {
      debug("transport", "typing stop failed", String(err));
    });
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
    }).catch((telemetryErr: unknown) => {
      debug("transport", "telemetry record failed", String(telemetryErr));
    });
    return await degradeToHuman({
      channel: conversation.channel,
      conversationId: conversation.id,
      patientId: patient.id,
      sourceMessageId: args.sourceMessageId,
      errorDetail: "empty reply",
      reason: "empty",
    });
  }

  // On Eve's very first reply, prepend a one-time AI disclosure (durably gated).
  let reply = text;
  const deliveryMessageIds: string[] = [];
  if (!(await hasMessageWithMetaKind(conversation.id, "disclosure"))) {
    const disclosure = buildDisclosure(patient);
    const disclosureMessage = await appendMessage({
      conversationId: conversation.id,
      role: "agent",
      text: disclosure,
      meta: deliveryMeta(fresh, { kind: "disclosure" }),
    });
    if (fresh.channel === "imessage") {
      deliveryMessageIds.push(disclosureMessage.id);
    }
    reply = `${disclosure}\n\n${text}`;
  }

  // Record the agent's reply (escalation rows/pause are written by tools).
  const replyMessage = await appendMessage({
    conversationId: conversation.id,
    role: "agent",
    text,
    meta: deliveryMeta(fresh),
  });
  if (fresh.channel === "imessage") {
    deliveryMessageIds.push(replyMessage.id);
  }

  // A now-paused state is a reliable "this turn escalated" signal.
  const afterState = (await getConversationById(conversation.id))
    ?.automation_state;
  const escalated = afterState === "paused_for_review";
  // Category: an escalated turn carries the escalation's taxonomy category; an
  // autonomous turn is inferred from the tool it used (best-effort).
  let category: string | null;
  if (escalated) {
    const open = await listOpenEscalationsForConversation(
      conversation.id
    ).catch((err: unknown) => {
      debug("transport", "escalation category lookup failed", String(err));
      return [];
    });
    category = open[0]?.reason ?? "missing_source_or_unsure";
  } else {
    category = inferCategoryFromTools(telemetry?.toolCalls ?? []);
  }
  await recordAgentTurn({
    conversationId: conversation.id,
    patientId: patient.id,
    latencyMs,
    toolCalls: telemetry?.toolCalls ?? [],
    finishReason: telemetry?.finishReason ?? null,
    promptTokens: telemetry?.promptTokens ?? null,
    completionTokens: telemetry?.completionTokens ?? null,
    totalTokens: telemetry?.totalTokens ?? null,
    escalated,
    category,
    ok: true,
  }).catch((telemetryErr: unknown) => {
    debug("transport", "telemetry record failed", String(telemetryErr));
  });

  return { deliveryMessageIds, reply, reason: "answered" };
}

/**
 * Single-message entry: resolve, handle concierge, log the patient message, and
 * generate one turn. The live transports drive the durable pipeline instead;
 * this is retained for the terminal smoke suite and direct callers.
 */
export async function handleInbound(args: InboundArgs): Promise<InboundResult> {
  const authorHandle = normalizeHandle(args.authorHandle);
  const resolved = await resolveConversationAndPatient({
    spaceId: args.spaceId,
    channel: args.channel,
    authorHandle,
    patientId: args.patientId,
    isConcierge: args.isConcierge,
    allowGuest: args.allowGuest,
    guestName: args.guestName,
  });
  if (!resolved) {
    return { reply: null, reason: "unknown_patient" };
  }
  const { conversation, patient } = resolved;
  if (args.isConcierge) {
    return handleConciergeMessage(conversation.id, authorHandle, args.text);
  }
  const inbound = await appendMessage({
    conversationId: conversation.id,
    role: "patient",
    authorHandle: authorHandle ?? patient.handle,
    text: args.text,
  });
  return generateTurn({
    conversation,
    patient,
    combinedText: args.text,
    sourceMessageId: inbound.id,
    eveRespond: args.eveRespond,
    typing: args.typing,
  });
}
