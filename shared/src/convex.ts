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

import type { EscalationCategory, EscalationLevel } from "./taxonomy.js";
import type {
  ActivityEvent,
  AgentMemory,
  AutomationState,
  CareInstruction,
  CarePhase,
  ChainStage,
  Channel,
  ConciergeIdentity,
  Conversation,
  Escalation,
  EscalationCard,
  InflightChain,
  ItineraryEvent,
  Message,
  MessageRole,
  Patient,
  PatientOverview,
  PipelineMessage,
  QueueData,
  SlackLink,
  SlackOutbox,
  SourceDocumentRef,
} from "./types.js";

export interface PersistedEveSession {
  continuationToken: string;
  sessionId: string;
  turns: number;
}

function baseUrl(): string {
  return (
    process.env.CONVEX_SITE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:3211"
  );
}

async function call<T>(
  fn: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  const secret = process.env.CONVEX_SERVICE_SECRET;
  if (secret) {
    headers.authorization = `Bearer ${secret}`;
  }
  const res = await fetch(`${baseUrl()}/machine`, {
    method: "POST",
    headers,
    body: JSON.stringify({ fn, args }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Convex /machine ${fn} failed: ${res.status} ${detail}`);
  }
  const json = (await res.json()) as {
    ok: boolean;
    result?: T;
    error?: string;
  };
  if (!json.ok) {
    throw new Error(json.error ?? `Convex ${fn} failed`);
  }
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
/** Find or create a guest patient bound to an iMessage handle (demo onboarding). */
export function ensureGuestPatient(args: {
  handle: string;
  name?: string | null;
  templateId?: string;
}): Promise<Patient> {
  return call("ensureGuestPatient", args);
}

// --------------------------- Itinerary / care ---------------------------

export function listItinerary(patientId: string): Promise<ItineraryEvent[]> {
  return call("listItinerary", { patientId });
}
export function listCareInstructions(
  patientId: string,
  phase?: CarePhase
): Promise<CareInstruction[]> {
  return call("listCareInstructions", { patientId, phase });
}

// --------------------------- Conversations ---------------------------

export function getConversationById(id: string): Promise<Conversation | null> {
  return call("getConversationById", { id });
}
export function getConversationBySpace(
  spaceId: string
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
  state: AutomationState
): Promise<void> {
  return call("setAutomationState", { conversationId, state });
}

export function saveEveSession(
  conversationId: string,
  session: PersistedEveSession
): Promise<void> {
  return call("saveEveSession", { conversationId, session });
}
export function getEveSession(
  conversationId: string
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
  since?: string | null
): Promise<boolean> {
  return call("hasMessageWithMetaKind", { conversationId, kind, since });
}

export function listPendingOutbound(): Promise<Message[]> {
  return call("listPendingOutbound");
}
export function markOutboundDelivered(messageId: string): Promise<void> {
  return call("markOutboundDelivered", { messageId });
}
/**
 * Record a failed outbound delivery. A `permanent` failure (e.g. an invalid
 * address) or exhausting attempts dead-letters the row to `failed`; otherwise
 * it stays `pending` for the next tick. Returns the resulting state.
 */
export function recordOutboundFailure(args: {
  messageId: string;
  error: string;
  permanent: boolean;
  maxAttempts?: number;
}): Promise<{ outbound: "pending" | "failed"; attempts: number }> {
  return call("recordOutboundFailure", args);
}

// --------------------------- Escalations / handoff ---------------------------

export function listOpenEscalationsForConversation(
  conversationId: string
): Promise<Escalation[]> {
  return call("listOpenEscalationsForConversation", { conversationId });
}
export function markConciergeTakeover(
  conversationId: string,
  assignee: string
): Promise<void> {
  return call("markConciergeTakeover", { conversationId, assignee });
}
export function resumeAutomation(
  conversationId: string,
  actor: string
): Promise<void> {
  return call("resumeAutomation", { conversationId, actor });
}
/** Dev/test cleanup helper. */
export function deleteConversationBySpace(spaceId: string): Promise<void> {
  return call("deleteConversationBySpace", { spaceId });
}

/** Assign a patient to a concierge (Clerk user id). Used by the team seeder. */
export function assignPatient(
  patientId: string,
  assigneeUserId: string | null
): Promise<void> {
  return call("assignPatient", { patientId, assigneeUserId });
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

// --------------------------- Slack bridge ---------------------------

/** Pending Slack posts the Slack service should deliver, oldest first. */
export function listPendingSlackOutbox(): Promise<SlackOutbox[]> {
  return call("listPendingSlackOutbox");
}
export function markSlackOutboxPosted(
  id: string,
  slackTs: string
): Promise<void> {
  return call("markSlackOutboxPosted", { id, slackTs });
}
export function getSlackLinkByConversation(
  conversationId: string
): Promise<SlackLink | null> {
  return call("getSlackLinkByConversation", { conversationId });
}
export function getSlackLinkByThread(
  threadTs: string
): Promise<SlackLink | null> {
  return call("getSlackLinkByThread", { threadTs });
}
export function upsertSlackLink(args: {
  conversationId: string;
  escalationId?: string | null;
  channelId: string;
  threadTs: string;
}): Promise<void> {
  return call("upsertSlackLink", args);
}
export function getEscalationCard(
  escalationId: string
): Promise<EscalationCard | null> {
  return call("getEscalationCard", { escalationId });
}
export function getPatientOverview(
  patientId: string
): Promise<PatientOverview | null> {
  return call("getPatientOverview", { patientId });
}
export function listSourceDocumentsWithUrls(
  patientId: string
): Promise<SourceDocumentRef[]> {
  return call("listSourceDocumentsWithUrls", { patientId });
}
export function getQueueForConcierge(args: {
  clerkId: string | null;
  isLead: boolean;
}): Promise<QueueData> {
  return call("getQueueForConcierge", args);
}
export function resolveConciergeBySlackUser(args: {
  slackUserId: string;
  email: string | null;
  displayName: string | null;
}): Promise<ConciergeIdentity> {
  return call("resolveConciergeBySlackUser", args);
}
export function conciergeReplyFromSlack(args: {
  conversationId: string;
  text: string;
  label: string;
  clerkId?: string | null;
}): Promise<void> {
  return call("conciergeReplyFromSlack", args);
}
export function takeOverFromSlack(args: {
  conversationId: string;
  label: string;
  clerkId?: string | null;
}): Promise<void> {
  return call("takeOverFromSlack", args);
}
export function resolveEscalationFromSlack(args: {
  escalationId: string;
  label: string;
  clerkId?: string | null;
}): Promise<void> {
  return call("resolveEscalationFromSlack", args);
}
export function resumeAutomationFromSlack(args: {
  conversationId: string;
  label: string;
}): Promise<void> {
  return call("resumeAutomationFromSlack", args);
}

// --------------------------- Pipeline (ADR 020) ---------------------------

export function enqueueInbound(args: {
  conversationId: string;
  spaceId: string;
  clientGuid: string;
  authorHandle: string | null;
  sourceMessageId: string;
  text: string;
}): Promise<void> {
  return call("enqueueInbound", args);
}
export function drainBatch(conversationId: string): Promise<PipelineMessage[]> {
  return call("drainBatch", { conversationId });
}
export function readCarried(
  conversationId: string
): Promise<PipelineMessage[]> {
  return call("readCarried", { conversationId });
}
export function carryForward(
  conversationId: string,
  messages: PipelineMessage[]
): Promise<void> {
  return call("carryForward", { conversationId, messages });
}
export function readInflight(
  conversationId: string
): Promise<InflightChain | null> {
  return call("readInflight", { conversationId });
}
export function claimChain(args: {
  conversationId: string;
  chainId: string;
  chainStartedAt: number;
}): Promise<void> {
  return call("claimChain", args);
}
export function setChainStage(
  conversationId: string,
  stage: ChainStage
): Promise<void> {
  return call("setChainStage", { conversationId, stage });
}
export function cancelChain(
  conversationId: string,
  cancelledAt: number
): Promise<void> {
  return call("cancelChain", { conversationId, cancelledAt });
}
export function advanceStartIndex(args: {
  conversationId: string;
  startIndex: number;
  sentGuid: string;
}): Promise<void> {
  return call("advanceStartIndex", args);
}
export function listQueuedConversations(): Promise<string[]> {
  return call("listQueuedConversations");
}
export function listOrphanedChains(): Promise<string[]> {
  return call("listOrphanedChains");
}
export function recordJobFailure(args: {
  queue: string;
  jobId: string;
  conversationId?: string | null;
  payloadJson?: string | null;
  error: string;
}): Promise<void> {
  return call("recordJobFailure", args);
}
export function sweepJobFailures(retentionDays: number): Promise<number> {
  return call("sweepJobFailures", { retentionDays });
}
export function getAgentMemory(
  resourceId: string
): Promise<AgentMemory | null> {
  return call("getAgentMemory", { resourceId });
}
export function upsertAgentMemory(
  resourceId: string,
  workingMemory: string
): Promise<void> {
  return call("upsertAgentMemory", { resourceId, workingMemory });
}

/** Parse the JSON array on escalations.suggested_reply_sources. */
export function parseSuggestedReplySources(
  escalation: { suggested_reply_sources?: string | null } | null | undefined
): string[] {
  const raw = escalation?.suggested_reply_sources;
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}
