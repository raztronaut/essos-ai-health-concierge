import type { EscalationLevel, PatientPolicyOverride } from "./taxonomy.js";

export type Procedure = "rhinoplasty" | "hair_transplant" | "other";

export type CarePhase = "preop" | "postop" | "general";

export type CareSourceType =
  | "clinic_packet"
  | "essos_summary"
  | "generated_notional"
  | "missing";

export type CareSourceStatus =
  | "verified"
  | "demo_notional"
  | "missing"
  | "personalized_pending";

export type CareAnswerPolicy = "answer_reference" | "escalate_only";

export type SourceDocumentKind =
  | "itinerary_packet"
  | "care_packet"
  | "care_note"
  | "logistics_handoff"
  | "guide"
  | "runbook";

export type ItineraryKind =
  | "flight"
  | "clinic"
  | "hotel"
  | "transport"
  | "followup"
  | "preop";

export type MessageRole = "patient" | "agent" | "concierge" | "system";

export type Channel = "terminal" | "imessage";

export type AutomationState =
  | "active"
  | "paused_for_review"
  | "taken_over"
  | "resolved";

export type EscalationStatus = "open" | "taken_over" | "resolved";

export type ActivityEvent =
  | "message"
  | "logistics"
  | "escalated"
  | "drafted"
  | "paused"
  | "taken_over"
  | "resolved"
  | "resumed"
  | "reminder";

export interface Patient {
  /** Owning concierge (Clerk user id), or null for the unassigned queue. */
  assignee_user_id?: string | null;
  /** Associated concierges (Clerk user ids) */
  associated_user_ids?: string[];
  clinic_name: string;
  companion_name: string | null;
  created_at: string;
  destination_city: string;
  destination_country: string;
  dietary_notes: string | null;
  /** iMessage handle / phone used to map an inbound conversation to a patient. */
  handle: string;
  hotel_name: string;
  id: string;
  name: string;
  /** Per-patient tighten-only escalation policy overrides (ADR 021). */
  policy_overrides?: PatientPolicyOverride[];
  procedure: Procedure;
}

export interface ItineraryEvent {
  confirmation_number: string | null;
  detail: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  ends_at: string | null;
  id: string;
  kind: ItineraryKind;
  location: string | null;
  patient_id: string;
  sort_order: number;
  source_document_id: string | null;
  starts_at: string | null;
  title: string;
}

export type PatientCardPurpose = "itinerary" | "clinic" | "source_data";

export interface PatientCardPayload {
  clinic: {
    address: string | null;
    name: string;
    phone: string | null;
  };
  documents: Array<{
    contentType: string | null;
    downloadable: boolean;
    fileName: string | null;
    id: string;
    kind: SourceDocumentKind;
    relatedEventIds: string[];
    sourceStatus: CareSourceStatus;
    sourceType: CareSourceType;
    title: string;
  }>;
  expiresAt: string;
  generatedAt: string;
  hotel: {
    address: string | null;
    confirmationNumber: string | null;
    name: string;
  };
  itinerary: Array<{
    confirmationNumber: string | null;
    detail: string | null;
    driverName: string | null;
    driverPhone: string | null;
    endsAt: string | null;
    id: string;
    kind: ItineraryKind;
    location: string | null;
    sortOrder: number;
    sourceDocumentId: string | null;
    startsAt: string | null;
    title: string;
  }>;
  patient: {
    destinationCity: string;
    destinationCountry: string;
    displayName: string;
    firstName: string;
    id: string;
    procedure: Procedure;
  };
  purpose: PatientCardPurpose;
  sources: string[];
  transport: {
    driverName: string | null;
    driverPhone: string | null;
    nextPickupAt: string | null;
    nextPickupLocation: string | null;
    nextPickupTitle: string | null;
  };
  version: 1;
}

export interface PatientCardLink {
  expiresAt: string;
  path: string;
  purpose: PatientCardPurpose;
  token: string;
  url: string;
}

export interface CareInstruction {
  answer_policy: CareAnswerPolicy;
  body: string;
  created_at: string;
  effective_from: string | null;
  effective_until: string | null;
  id: string;
  patient_id: string;
  phase: CarePhase;
  procedure: Procedure;
  source_document_id: string | null;
  source_status: CareSourceStatus;
  source_type: CareSourceType;
  title: string;
  updated_at: string;
}

export interface SourceDocument {
  answer_policy: CareAnswerPolicy;
  /** MIME type for uploaded docs (Convex storage); null for seeded on-disk docs. */
  content_type?: string | null;
  created_at: string;
  /** Original filename for uploaded docs; null for seeded on-disk docs. */
  file_name?: string | null;
  id: string;
  kind: SourceDocumentKind;
  /** On-disk markdown path for seeded docs; null for uploaded docs. */
  markdown_path?: string | null;
  patient_id: string | null;
  /** On-disk PDF path for seeded docs; null for uploaded docs. */
  pdf_path?: string | null;
  sha256?: string | null;
  source_status: CareSourceStatus;
  source_type: CareSourceType;
  /** Convex file-storage id for uploaded docs; null for seeded on-disk docs. */
  storage_id?: string | null;
  title: string;
}

export interface Conversation {
  /** Owning concierge (Clerk user id); mirrors the patient's assignment. */
  assignee_user_id?: string | null;
  automation_state: AutomationState;
  channel: Channel;
  created_at: string;
  id: string;
  patient_id: string;
  /** Spectrum/iMessage space (group) id, or a terminal session id. */
  space_id: string;
  updated_at: string;
}

export interface Message {
  author_handle: string | null;
  /** Taxonomy category (an EscalationCategory value); typed wide to match the store row. */
  category: string | null;
  conversation_id: string;
  created_at: string;
  id: string;
  meta_json: string | null;
  /** Outbound bridge state for concierge replies: pending|sent|failed. */
  outbound?: "pending" | "sent" | "failed" | null;
  /** Last delivery error; set when `outbound = "failed"`. */
  outbound_error?: string | null;
  role: MessageRole;
  source_event_id?: string | null;
  text: string;
}

/** A drained inbound message from the pipeline queue. */
export interface PipelineMessage {
  author_handle: string | null;
  client_guid: string;
  created_at: string;
  source_event_id?: string | null;
  source_message_id: string;
  text: string;
}

export type ChainStage = "flush" | "read" | "generate" | "send" | "done";

/** The single in-flight chain per conversation (cancellation + send-resume). */
export interface InflightChain {
  cancelled_at: number | null;
  chain_id: string;
  chain_started_at: number;
  conversation_id: string;
  sent_guids: string[];
  stage: ChainStage;
  start_index: number;
  updated_at: string;
}

export interface AgentMemory {
  resource_id: string;
  updated_at: string;
  working_memory: string;
}

export interface Escalation {
  assignee: string | null;
  /** Stable owning concierge (Clerk user id) for identity-keyed metrics. */
  assignee_user_id?: string | null;
  conversation_id: string;
  created_at: string;
  /** 0..1 how much the concierge changed Eve's draft before sending (ADR 022). */
  draft_edit_distance?: number | null;
  /** When the verdict was recorded. */
  feedback_at?: string | null;
  /** Who recorded the validity verdict (display label). */
  feedback_by?: string | null;
  /** Optional free-text note on the verdict. */
  feedback_note?: string | null;
  /** Human verdict: was this escalation necessary? null = not yet labeled (ADR 022). */
  feedback_valid?: boolean | null;
  id: string;
  level: EscalationLevel;
  patient_id: string;
  /** Taxonomy category (an EscalationCategory value); typed wide to match the store row. */
  reason: string;
  resolved_at: string | null;
  source_message_id: string | null;
  status: EscalationStatus;
  /**
   * A source-grounded reply Eve drafts for the concierge to review, edit, and
   * send to the patient (never auto-sent). Null when no draft was produced.
   */
  suggested_reply: string | null;
  /** JSON array of short source labels Eve used for the draft (e.g. itinerary, pre-op packet). */
  suggested_reply_sources: string | null;
  summary: string;
}

export interface ActivityLogEntry {
  actor: string;
  conversation_id: string;
  created_at: string;
  detail: string | null;
  event: ActivityEvent;
  id: string;
}

// --------------------------- Slack bridge ---------------------------

export type SlackOutboxKind = "escalation" | "activity" | "patient_message";

/** A queued Slack post the Slack service drains and delivers. */
export interface SlackOutbox {
  conversation_id: string;
  created_at: string;
  escalation_id: string | null;
  id: string;
  kind: SlackOutboxKind;
  payload_json: string | null;
  slack_ts: string | null;
  status: "pending" | "posted";
}

/** Maps a conversation to its Slack thread so updates thread correctly. */
export interface SlackLink {
  channel_id: string;
  conversation_id: string;
  created_at: string;
  escalation_id: string | null;
  thread_ts: string;
}

/** Full data needed to render an escalation card in Slack. */
export interface EscalationCard {
  conversation: Conversation | null;
  escalation: Escalation;
  patient: Patient | null;
}

/** Patient status snapshot for the `/essos patient` slash command. */
export interface PatientOverview {
  conversation: Conversation | null;
  itinerary: ItineraryEvent[];
  openEscalations: number;
  patient: Patient;
}

/** A patient source document with a resolved download URL (uploaded docs only). */
export interface SourceDocumentRef {
  file_name: string | null;
  id: string;
  kind: string;
  title: string;
  url: string | null;
}

/** Patients + open escalations a concierge should see in the App Home queue. */
export interface QueueData {
  escalations: Escalation[];
  patients: Patient[];
}

/** A Slack user resolved (or not) to a concierge identity. */
export interface ConciergeIdentity {
  clerkId: string | null;
  email: string | null;
  isLead: boolean;
  label: string;
  name: string;
}

/** Denormalized conversation row for the dashboard list (patient + last message + open flags). */
export interface ConversationSummary {
  /** Owning concierge (Clerk user id), or null when unassigned. */
  assignee_user_id?: string | null;
  automation_state: AutomationState;
  id: string;
  last_role: MessageRole | null;
  last_text: string | null;
  open_flags: number;
  patient_city: string | null;
  patient_country: string | null;
  patient_id: string;
  patient_name: string | null;
  patient_procedure: Procedure | null;
  updated_at: string;
}
