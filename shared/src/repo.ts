import type { SQLInputValue } from "node:sqlite";
import { getDb, transaction } from "./db.js";
import { newId, nowIso } from "./ids.js";
import type {
  ActivityEvent,
  ActivityLogEntry,
  AutomationState,
  CareInstruction,
  CarePhase,
  Channel,
  Conversation,
  Escalation,
  EscalationStatus,
  ItineraryEvent,
  Message,
  MessageRole,
  Patient,
  SourceDocument,
} from "./types.js";
import type { EscalationCategory, EscalationLevel } from "./taxonomy.js";

/**
 * Thin data-access layer over the shared SQLite store. Both the Eve agent
 * tools and the dashboard read/write through these helpers so behavior stays
 * consistent across the system.
 */

/** Cast a typed row object to the named-parameter shape `node:sqlite` expects. */
function bind(row: object): Record<string, SQLInputValue> {
  return row as Record<string, SQLInputValue>;
}

// ---------------------------------------------------------------------------
// Patients
// ---------------------------------------------------------------------------

export function listPatients(): Patient[] {
  return getDb()
    .prepare("select * from patients order by created_at")
    .all() as unknown as Patient[];
}

export function getPatientById(id: string): Patient | null {
  const row = getDb().prepare("select * from patients where id = ?").get(id);
  return (row as Patient | undefined) ?? null;
}

export function getPatientByHandle(handle: string): Patient | null {
  const row = getDb()
    .prepare("select * from patients where handle = ?")
    .get(handle);
  return (row as Patient | undefined) ?? null;
}

export function upsertPatient(patient: Patient): void {
  getDb()
    .prepare(
      `insert into patients
        (id, name, handle, procedure, destination_city, destination_country,
         clinic_name, hotel_name, companion_name, dietary_notes, created_at)
       values
        (@id, @name, @handle, @procedure, @destination_city, @destination_country,
         @clinic_name, @hotel_name, @companion_name, @dietary_notes, @created_at)
       on conflict(id) do update set
         name = excluded.name,
         handle = excluded.handle,
         procedure = excluded.procedure,
         destination_city = excluded.destination_city,
         destination_country = excluded.destination_country,
         clinic_name = excluded.clinic_name,
         hotel_name = excluded.hotel_name,
         companion_name = excluded.companion_name,
         dietary_notes = excluded.dietary_notes`,
    )
    .run(bind(patient));
}

// ---------------------------------------------------------------------------
// Source documents
// ---------------------------------------------------------------------------

export function insertSourceDocument(
  doc: Omit<SourceDocument, "created_at"> & { created_at?: string },
): SourceDocument {
  const row: SourceDocument = {
    ...doc,
    created_at: doc.created_at ?? nowIso(),
  };
  getDb()
    .prepare(
      `insert into source_documents
        (id, patient_id, kind, title, source_type, source_status, answer_policy,
         markdown_path, pdf_path, sha256, created_at)
       values
        (@id, @patient_id, @kind, @title, @source_type, @source_status,
         @answer_policy, @markdown_path, @pdf_path, @sha256, @created_at)
       on conflict(id) do update set
         patient_id = excluded.patient_id,
         kind = excluded.kind,
         title = excluded.title,
         source_type = excluded.source_type,
         source_status = excluded.source_status,
         answer_policy = excluded.answer_policy,
         markdown_path = excluded.markdown_path,
         pdf_path = excluded.pdf_path,
         sha256 = excluded.sha256`,
    )
    .run(bind(row));
  return row;
}

export function listSourceDocuments(): SourceDocument[] {
  return getDb()
    .prepare("select * from source_documents order by patient_id, kind, title")
    .all() as unknown as SourceDocument[];
}

export function listSourceDocumentsForPatient(patientId: string): SourceDocument[] {
  return getDb()
    .prepare(
      "select * from source_documents where patient_id = ? or patient_id is null order by kind, title",
    )
    .all(patientId) as unknown as SourceDocument[];
}

// ---------------------------------------------------------------------------
// Itinerary
// ---------------------------------------------------------------------------

export function listItinerary(patientId: string): ItineraryEvent[] {
  return getDb()
    .prepare(
      "select * from itinerary_events where patient_id = ? order by sort_order, starts_at",
    )
    .all(patientId) as unknown as ItineraryEvent[];
}

export interface ItineraryEventInput {
  id?: string;
  patient_id: string;
  source_document_id?: string | null;
  kind: ItineraryEvent["kind"];
  title: string;
  detail?: string | null;
  location?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  confirmation_number?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  sort_order?: number;
}

export function insertItineraryEvent(event: ItineraryEventInput): ItineraryEvent {
  const row: ItineraryEvent = {
    id: event.id ?? newId("itin"),
    patient_id: event.patient_id,
    source_document_id: event.source_document_id ?? null,
    kind: event.kind,
    title: event.title,
    detail: event.detail ?? null,
    location: event.location ?? null,
    starts_at: event.starts_at ?? null,
    ends_at: event.ends_at ?? null,
    confirmation_number: event.confirmation_number ?? null,
    driver_name: event.driver_name ?? null,
    driver_phone: event.driver_phone ?? null,
    sort_order: event.sort_order ?? 0,
  };
  getDb()
    .prepare(
      `insert into itinerary_events
        (id, patient_id, source_document_id, kind, title, detail, location, starts_at, ends_at,
         confirmation_number, driver_name, driver_phone, sort_order)
       values
        (@id, @patient_id, @source_document_id, @kind, @title, @detail, @location, @starts_at, @ends_at,
         @confirmation_number, @driver_name, @driver_phone, @sort_order)`,
    )
    .run(bind(row));
  return row;
}

// ---------------------------------------------------------------------------
// Care instructions
// ---------------------------------------------------------------------------

export function listCareInstructions(
  patientId: string,
  phase?: CarePhase,
): CareInstruction[] {
  const db = getDb();
  if (phase) {
    return db
      .prepare(
        "select * from care_instructions where patient_id = ? and phase = ? order by title",
      )
      .all(patientId, phase) as unknown as CareInstruction[];
  }
  return db
    .prepare(
      "select * from care_instructions where patient_id = ? order by phase, title",
    )
    .all(patientId) as unknown as CareInstruction[];
}

export function insertCareInstruction(
  doc: Omit<CareInstruction, "id" | "created_at" | "updated_at"> & {
    id?: string;
  },
): CareInstruction {
  const ts = nowIso();
  const row: CareInstruction = {
    ...doc,
    id: doc.id ?? newId("care"),
    created_at: ts,
    updated_at: ts,
  };
  getDb()
    .prepare(
      `insert into care_instructions
        (id, patient_id, source_document_id, phase, procedure, title, body, source_type,
         source_status, answer_policy, effective_from, effective_until,
         created_at, updated_at)
       values
        (@id, @patient_id, @source_document_id, @phase, @procedure, @title, @body, @source_type,
         @source_status, @answer_policy, @effective_from, @effective_until,
         @created_at, @updated_at)`,
    )
    .run(bind(row));
  return row;
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export function listConversations(): Conversation[] {
  return getDb()
    .prepare("select * from conversations order by updated_at desc")
    .all() as unknown as Conversation[];
}

export function getConversationById(id: string): Conversation | null {
  const row = getDb()
    .prepare("select * from conversations where id = ?")
    .get(id);
  return (row as Conversation | undefined) ?? null;
}

export function getConversationBySpace(spaceId: string): Conversation | null {
  const row = getDb()
    .prepare("select * from conversations where space_id = ?")
    .get(spaceId);
  return (row as Conversation | undefined) ?? null;
}

/**
 * Find the conversation for a Spectrum `space` (group) id, creating it on first
 * contact. The patient is resolved separately by the transport bridge.
 */
export function getOrCreateConversation(args: {
  spaceId: string;
  patientId: string;
  channel: Channel;
}): Conversation {
  const existing = getConversationBySpace(args.spaceId);
  if (existing) return existing;
  const ts = nowIso();
  const conversation: Conversation = {
    id: newId("conv"),
    patient_id: args.patientId,
    space_id: args.spaceId,
    channel: args.channel,
    automation_state: "active",
    created_at: ts,
    updated_at: ts,
  };
  getDb()
    .prepare(
      `insert into conversations
        (id, patient_id, space_id, channel, automation_state, created_at, updated_at)
       values
        (@id, @patient_id, @space_id, @channel, @automation_state, @created_at, @updated_at)`,
    )
    .run(bind(conversation));
  return conversation;
}

/** Compatibility alias used by the transport package. */
export const ensureConversation = getOrCreateConversation;

/**
 * One conversation row plus the denormalized fields the dashboard list needs
 * (patient summary, last message, open-flag count), computed in a single query
 * to avoid an N+1 read per conversation.
 */
export interface ConversationSummary {
  id: string;
  patient_id: string;
  automation_state: AutomationState;
  updated_at: string;
  patient_name: string | null;
  patient_procedure: string | null;
  patient_city: string | null;
  patient_country: string | null;
  last_role: MessageRole | null;
  last_text: string | null;
  open_flags: number;
}

export function listConversationSummaries(): ConversationSummary[] {
  return getDb()
    .prepare(
      `select
         c.id, c.patient_id, c.automation_state, c.updated_at,
         p.name as patient_name,
         p.procedure as patient_procedure,
         p.destination_city as patient_city,
         p.destination_country as patient_country,
         (select m.role from messages m
            where m.conversation_id = c.id
            order by m.created_at desc limit 1) as last_role,
         (select m.text from messages m
            where m.conversation_id = c.id
            order by m.created_at desc limit 1) as last_text,
         (select count(*) from escalations e
            where e.conversation_id = c.id and e.status = 'open') as open_flags
       from conversations c
       left join patients p on p.id = c.patient_id
       order by c.updated_at desc`,
    )
    .all() as unknown as ConversationSummary[];
}

export function setAutomationState(
  conversationId: string,
  state: AutomationState,
): void {
  getDb()
    .prepare(
      "update conversations set automation_state = ?, updated_at = ? where id = ?",
    )
    .run(state, nowIso(), conversationId);
}

function touchConversation(conversationId: string): void {
  getDb()
    .prepare("update conversations set updated_at = ? where id = ?")
    .run(nowIso(), conversationId);
}

/**
 * Durable Eve session continuity for a conversation. The transport keeps an
 * in-memory cache for speed, but persisting `{ sessionId, continuationToken,
 * turns }` here means a transport restart resumes the same multi-turn Eve
 * session instead of starting a fresh one. See ADR 010/011.
 */
export interface PersistedEveSession {
  sessionId: string;
  continuationToken: string;
  turns: number;
}

export function getEveSession(conversationId: string): PersistedEveSession | null {
  const row = getDb()
    .prepare("select eve_session from conversations where id = ?")
    .get(conversationId) as { eve_session: string | null } | undefined;
  if (!row?.eve_session) return null;
  try {
    const parsed = JSON.parse(row.eve_session) as Partial<PersistedEveSession>;
    if (
      typeof parsed.sessionId === "string" &&
      typeof parsed.continuationToken === "string" &&
      typeof parsed.turns === "number"
    ) {
      return { sessionId: parsed.sessionId, continuationToken: parsed.continuationToken, turns: parsed.turns };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveEveSession(conversationId: string, session: PersistedEveSession): void {
  getDb()
    .prepare("update conversations set eve_session = ? where id = ?")
    .run(JSON.stringify(session), conversationId);
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export function listMessages(conversationId: string): Message[] {
  return getDb()
    .prepare(
      "select * from messages where conversation_id = ? order by created_at",
    )
    .all(conversationId) as unknown as Message[];
}

export function addMessage(args: {
  conversationId: string;
  role: MessageRole;
  text: string;
  authorHandle?: string | null;
  category?: EscalationCategory | null;
  meta?: Record<string, unknown> | null;
}): Message {
  const message: Message = {
    id: newId("msg"),
    conversation_id: args.conversationId,
    role: args.role,
    author_handle: args.authorHandle ?? null,
    text: args.text,
    category: args.category ?? null,
    created_at: nowIso(),
    meta_json: args.meta ? JSON.stringify(args.meta) : null,
  };
  getDb()
    .prepare(
      `insert into messages
        (id, conversation_id, role, author_handle, text, category, created_at, meta_json)
       values
        (@id, @conversation_id, @role, @author_handle, @text, @category, @created_at, @meta_json)`,
    )
    .run(bind(message));
  touchConversation(args.conversationId);
  return message;
}

/** Compatibility alias used by the transport package. */
export const appendMessage = addMessage;

export function countMessagesByRole(role: MessageRole): number {
  const row = getDb()
    .prepare("select count(*) as n from messages where role = ?")
    .get(role) as { n: number };
  return row.n;
}

/**
 * Whether a message tagged `meta_json.kind = <kind>` exists for a conversation,
 * optionally only counting ones created at or after `sinceIso`. This is the
 * durable signal behind the one-time AI disclosure and the holding-notice latch
 * (both survive a transport restart, unlike an in-memory set). See ADR 010/011.
 */
export function hasMessageWithMetaKind(
  conversationId: string,
  kind: string,
  sinceIso?: string,
): boolean {
  const db = getDb();
  if (sinceIso) {
    const row = db
      .prepare(
        `select 1 from messages
         where conversation_id = ?
           and json_extract(meta_json, '$.kind') = ?
           and created_at >= ?
         limit 1`,
      )
      .get(conversationId, kind, sinceIso);
    return row !== undefined;
  }
  const row = db
    .prepare(
      `select 1 from messages
       where conversation_id = ?
         and json_extract(meta_json, '$.kind') = ?
       limit 1`,
    )
    .get(conversationId, kind);
  return row !== undefined;
}

// ---------------------------------------------------------------------------
// Outbound bridge: concierge replies authored in the dashboard are persisted as
// `concierge` messages tagged `meta_json.outbound = "pending"`. The transport
// polls for these, delivers them to the patient's iMessage, and marks them
// `sent`. This is what closes the human-handoff loop. See decision 010.
// ---------------------------------------------------------------------------

/** Record a concierge reply (from the dashboard) queued for delivery to the patient. */
export function enqueueConciergeOutbound(args: {
  conversationId: string;
  text: string;
  authorHandle?: string | null;
}): Message {
  return addMessage({
    conversationId: args.conversationId,
    role: "concierge",
    authorHandle: args.authorHandle ?? null,
    text: args.text,
    meta: { outbound: "pending" },
  });
}

/** Concierge messages still awaiting delivery to the patient, oldest first. */
export function listPendingOutbound(): Message[] {
  return getDb()
    .prepare(
      `select * from messages
       where role = 'concierge'
         and json_extract(meta_json, '$.outbound') = 'pending'
       order by created_at`,
    )
    .all() as unknown as Message[];
}

/** Mark a queued concierge message as delivered so it is not sent again. */
export function markOutboundDelivered(messageId: string): void {
  getDb()
    .prepare(
      `update messages
       set meta_json = json_set(coalesce(meta_json, '{}'), '$.outbound', 'sent')
       where id = ?`,
    )
    .run(messageId);
}

// ---------------------------------------------------------------------------
// Escalations (the "trip wires")
// ---------------------------------------------------------------------------

export function createEscalation(args: {
  conversationId: string;
  patientId: string;
  level: EscalationLevel;
  reason: EscalationCategory;
  summary: string;
  sourceMessageId?: string | null;
  /** Optional source-grounded reply Eve drafted for the concierge to review/send. */
  suggestedReply?: string | null;
  /** Optional short source labels backing the draft (stored as a JSON array). */
  suggestedReplySources?: string[] | null;
}): Escalation {
  const escalation: Escalation = {
    id: newId("esc"),
    conversation_id: args.conversationId,
    patient_id: args.patientId,
    level: args.level,
    reason: args.reason,
    summary: args.summary,
    source_message_id: args.sourceMessageId ?? null,
    status: "open",
    assignee: null,
    created_at: nowIso(),
    resolved_at: null,
    suggested_reply: args.suggestedReply ?? null,
    suggested_reply_sources:
      args.suggestedReplySources && args.suggestedReplySources.length > 0
        ? JSON.stringify(args.suggestedReplySources)
        : null,
  };
  getDb()
    .prepare(
      `insert into escalations
        (id, conversation_id, patient_id, level, reason, summary,
         source_message_id, status, assignee, created_at, resolved_at,
         suggested_reply, suggested_reply_sources)
       values
        (@id, @conversation_id, @patient_id, @level, @reason, @summary,
         @source_message_id, @status, @assignee, @created_at, @resolved_at,
         @suggested_reply, @suggested_reply_sources)`,
    )
    .run(bind(escalation));
  return escalation;
}

/** Parse the stored JSON `suggested_reply_sources` into a string array (empty when absent). */
export function parseSuggestedReplySources(escalation: Escalation): string[] {
  if (!escalation.suggested_reply_sources) return [];
  try {
    const parsed = JSON.parse(escalation.suggested_reply_sources) as unknown;
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export function listEscalations(status?: EscalationStatus): Escalation[] {
  const db = getDb();
  if (status) {
    return db
      .prepare(
        "select * from escalations where status = ? order by created_at desc",
      )
      .all(status) as unknown as Escalation[];
  }
  return db
    .prepare("select * from escalations order by created_at desc")
    .all() as unknown as Escalation[];
}

export function listEscalationsForConversation(
  conversationId: string,
): Escalation[] {
  return getDb()
    .prepare(
      "select * from escalations where conversation_id = ? order by created_at desc",
    )
    .all(conversationId) as unknown as Escalation[];
}

export function listOpenEscalationsForConversation(
  conversationId: string,
): Escalation[] {
  return listEscalationsForConversation(conversationId).filter(
    (escalation) => escalation.status === "open",
  );
}

export function takeOverEscalation(id: string, assignee: string): void {
  getDb()
    .prepare("update escalations set status = 'taken_over', assignee = ? where id = ?")
    .run(assignee, id);
}

export function markConciergeTakeover(
  conversationId: string,
  assignee: string,
): void {
  transaction(() => {
    const open = listOpenEscalationsForConversation(conversationId);
    for (const escalation of open) {
      takeOverEscalation(escalation.id, assignee);
    }
    setAutomationState(conversationId, "taken_over");
    logActivity({
      conversationId,
      event: "taken_over",
      actor: assignee,
      detail: "Human concierge replied during an open escalation.",
    });
  });
}

export function resumeAutomation(conversationId: string, actor: string): void {
  setAutomationState(conversationId, "active");
  logActivity({
    conversationId,
    event: "resumed",
    actor,
    detail: "Human concierge resumed Eve automation.",
  });
}

export function resolveEscalation(id: string, assignee?: string): void {
  getDb()
    .prepare(
      "update escalations set status = 'resolved', resolved_at = ?, assignee = coalesce(?, assignee) where id = ?",
    )
    .run(nowIso(), assignee ?? null, id);
}

// ---------------------------------------------------------------------------
// Activity log (telemetry + audit trail)
// ---------------------------------------------------------------------------

export function logActivity(args: {
  conversationId: string;
  event: ActivityEvent;
  actor: string;
  detail?: string | null;
}): ActivityLogEntry {
  const entry: ActivityLogEntry = {
    id: newId("act"),
    conversation_id: args.conversationId,
    event: args.event,
    actor: args.actor,
    detail: args.detail ?? null,
    created_at: nowIso(),
  };
  getDb()
    .prepare(
      `insert into activity_log
        (id, conversation_id, event, actor, detail, created_at)
       values
        (@id, @conversation_id, @event, @actor, @detail, @created_at)`,
    )
    .run(bind(entry));
  return entry;
}

export function listActivity(conversationId: string): ActivityLogEntry[] {
  return getDb()
    .prepare(
      "select * from activity_log where conversation_id = ? order by created_at",
    )
    .all(conversationId) as unknown as ActivityLogEntry[];
}

export function listAllActivity(limit = 200): ActivityLogEntry[] {
  return getDb()
    .prepare("select * from activity_log order by created_at desc limit ?")
    .all(limit) as unknown as ActivityLogEntry[];
}

export function countActivityByEvent(event: ActivityEvent): number {
  const row = getDb()
    .prepare("select count(*) as n from activity_log where event = ?")
    .get(event) as { n: number };
  return row.n;
}
