import type { EscalationCategory, EscalationLevel } from "./taxonomy.js";

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
  | "escalated"
  | "paused"
  | "taken_over"
  | "resolved"
  | "resumed";

export interface Patient {
  id: string;
  name: string;
  /** iMessage handle / phone used to map an inbound conversation to a patient. */
  handle: string;
  procedure: Procedure;
  destination_city: string;
  destination_country: string;
  clinic_name: string;
  hotel_name: string;
  companion_name: string | null;
  dietary_notes: string | null;
  created_at: string;
}

export interface ItineraryEvent {
  id: string;
  patient_id: string;
  source_document_id: string | null;
  kind: ItineraryKind;
  title: string;
  detail: string | null;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  confirmation_number: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  sort_order: number;
}

export interface CareInstruction {
  id: string;
  patient_id: string;
  source_document_id: string | null;
  phase: CarePhase;
  procedure: Procedure;
  title: string;
  body: string;
  source_type: CareSourceType;
  source_status: CareSourceStatus;
  answer_policy: CareAnswerPolicy;
  effective_from: string | null;
  effective_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface SourceDocument {
  id: string;
  patient_id: string | null;
  kind: SourceDocumentKind;
  title: string;
  source_type: CareSourceType;
  source_status: CareSourceStatus;
  answer_policy: CareAnswerPolicy;
  markdown_path: string;
  pdf_path: string;
  sha256: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  patient_id: string;
  /** Spectrum/iMessage space (group) id, or a terminal session id. */
  space_id: string;
  channel: Channel;
  automation_state: AutomationState;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  author_handle: string | null;
  text: string;
  category: EscalationCategory | null;
  created_at: string;
  meta_json: string | null;
}

export interface Escalation {
  id: string;
  conversation_id: string;
  patient_id: string;
  level: EscalationLevel;
  reason: EscalationCategory;
  summary: string;
  source_message_id: string | null;
  status: EscalationStatus;
  assignee: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface ActivityLogEntry {
  id: string;
  conversation_id: string;
  event: ActivityEvent;
  actor: string;
  detail: string | null;
  created_at: string;
}
