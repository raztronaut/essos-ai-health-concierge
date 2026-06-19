import type { EscalationLevel } from "./taxonomy.js";

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
  created_at: string;
  id: string;
  kind: SourceDocumentKind;
  markdown_path: string;
  patient_id: string | null;
  pdf_path: string;
  sha256: string;
  source_status: CareSourceStatus;
  source_type: CareSourceType;
  title: string;
}

export interface Conversation {
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
  role: MessageRole;
  text: string;
}

export interface Escalation {
  assignee: string | null;
  conversation_id: string;
  created_at: string;
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

/** Denormalized conversation row for the dashboard list (patient + last message + open flags). */
export interface ConversationSummary {
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
