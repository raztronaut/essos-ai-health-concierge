/**
 * Machine-path client for the Eve agent + Spectrum transport.
 *
 * Both are trusted backends with no Clerk identity, so they reach Convex
 * through the service-secret-guarded `/machine` HTTP action (see convex/http.ts)
 * rather than the public, Clerk-gated functions the dashboard uses.
 *
 * These exports keep the SAME names as the old SQLite repo layer so call sites
 * only need to add `await`. Returns are typed against the shared interfaces.
 */
import type {
  ActivityEvent,
  AutomationState,
  CareInstruction,
  CarePhase,
  Channel,
  Conversation,
  Escalation,
  ItineraryEvent,
  Message,
  MessageRole,
  Patient,
} from "./types.js";
import type { EscalationCategory, EscalationLevel } from "./taxonomy.js";

export interface PersistedEveSession {
  sessionId: string;
  continuationToken: string;
  turns: number;
}

function baseUrl(): string {
  return (
    process.env.CONVEX_SITE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:3211"
  );
}

async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const secret = process.env.CONVEX_SERVICE_SECRET;
  if (secret) headers.authorization = `Bearer ${secret}`;
  const res = await fetch(`${baseUrl()}/machine`, {
    method: "POST",
    headers,
    body: JSON.stringify({ fn, args }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Convex /machine ${fn} failed: ${res.status} ${detail}`);
  }
  const json = (await res.json()) as { ok: boolean; result?: T; error?: string };
  if (!json.ok) throw new Error(json.error ?? `Convex ${fn} failed`);
  return json.result as T;
}

// --------------------------- Patients ---------------------------

export function getPatientById(id: string): Promise<Patient | null> {
  return call("getPatientById", { id });
}
export function getPatientByHandle(handle: string): Promise<Patient | null> {
  return call("getPatientByHandle", { handle });
}
export function listPatients(): Promise<Patient[]> {
  return call("listPatients");
}

// --------------------------- Itinerary / care ---------------------------

export function listItinerary(patientId: string): Promise<ItineraryEvent[]> {
  return call("listItinerary", { patientId });
}
export function listCareInstructions(
  patientId: string,
  phase?: CarePhase,
): Promise<CareInstruction[]> {
  return call("listCareInstructions", { patientId, phase });
}

// --------------------------- Conversations ---------------------------

export function getConversationById(id: string): Promise<Conversation | null> {
  return call("getConversationById", { id });
}
export function getConversationBySpace(
  spaceId: string,
): Promise<Conversation | null> {
  return call("getConversationBySpace", { spaceId });
}
export function listConversations(): Promise<Conversation[]> {
  return call("listConversations");
}
export function getOrCreateConversation(args: {
  spaceId: string;
  patientId: string;
  channel: Channel;
}): Promise<Conversation> {
  return call("ensureConversation", args);
}
export const ensureConversation = getOrCreateConversation;

export function setAutomationState(
  conversationId: string,
  state: AutomationState,
): Promise<void> {
  return call("setAutomationState", { conversationId, state });
}

export function saveEveSession(
  conversationId: string,
  session: PersistedEveSession,
): Promise<void> {
  return call("saveEveSession", { conversationId, session });
}
export function getEveSession(
  conversationId: string,
): Promise<PersistedEveSession | null> {
  return call("getEveSession", { conversationId });
}

// --------------------------- Messages ---------------------------

export function listMessages(conversationId: string): Promise<Message[]> {
  return call("listMessages", { conversationId });
}
export function addMessage(args: {
  conversationId: string;
  role: MessageRole;
  text: string;
  authorHandle?: string | null;
  category?: EscalationCategory | null;
  meta?: Record<string, unknown> | null;
}): Promise<Message> {
  return call("appendMessage", args);
}
export const appendMessage = addMessage;

export function hasMessageWithMetaKind(
  conversationId: string,
  kind: string,
  since?: string | null,
): Promise<boolean> {
  return call("hasMessageWithMetaKind", { conversationId, kind, since });
}

export function listPendingOutbound(): Promise<Message[]> {
  return call("listPendingOutbound");
}
export function markOutboundDelivered(messageId: string): Promise<void> {
  return call("markOutboundDelivered", { messageId });
}

// --------------------------- Escalations / handoff ---------------------------

export function listOpenEscalationsForConversation(
  conversationId: string,
): Promise<Escalation[]> {
  return call("listOpenEscalationsForConversation", { conversationId });
}
export function markConciergeTakeover(
  conversationId: string,
  assignee: string,
): Promise<void> {
  return call("markConciergeTakeover", { conversationId, assignee });
}
export function resumeAutomation(
  conversationId: string,
  actor: string,
): Promise<void> {
  return call("resumeAutomation", { conversationId, actor });
}
/** Dev/test cleanup helper. */
export function deleteConversationBySpace(spaceId: string): Promise<void> {
  return call("deleteConversationBySpace", { spaceId });
}

export function escalateToHuman(args: {
  conversationId: string;
  patientId: string;
  level: EscalationLevel;
  reason: EscalationCategory;
  summary: string;
  sourceMessageId?: string | null;
  suggestedReply?: string | null;
  suggestedReplySources?: string[] | null;
}): Promise<{ escalationId: string; level: EscalationLevel }> {
  return call("escalateToHuman", args);
}

// --------------------------- Activity / telemetry ---------------------------

export function logActivity(args: {
  conversationId: string;
  event: ActivityEvent;
  actor: string;
  detail?: string | null;
}): Promise<void> {
  return call("logActivity", args);
}

export function recordAgentTurn(args: {
  conversationId: string;
  patientId?: string | null;
  latencyMs: number;
  toolCalls: string[];
  finishReason?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  escalated: boolean;
  category?: string | null;
  ok: boolean;
  error?: string | null;
}): Promise<void> {
  return call("recordAgentTurn", args);
}

/** Parse the JSON array on escalations.suggested_reply_sources. */
export function parseSuggestedReplySources(
  escalation: { suggested_reply_sources?: string | null } | null | undefined,
): string[] {
  const raw = escalation?.suggested_reply_sources;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}
