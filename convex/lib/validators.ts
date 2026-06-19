import { v } from "convex/values";

/**
 * Reusable return validators that mirror the schema's table documents.
 *
 * Convex requires `returns:` on every public/internal function (workspace rule
 * `argument-validation`). These doc validators include the system fields
 * (`_id`, `_creationTime`) so they describe exactly what `ctx.db` returns, and
 * they double as the wire contract for the `/machine` HTTP boundary.
 */

const procedure = v.union(
  v.literal("rhinoplasty"),
  v.literal("hair_transplant"),
  v.literal("other")
);

const carePhase = v.union(
  v.literal("preop"),
  v.literal("postop"),
  v.literal("general")
);

const careSourceType = v.union(
  v.literal("clinic_packet"),
  v.literal("essos_summary"),
  v.literal("generated_notional"),
  v.literal("missing")
);

const careSourceStatus = v.union(
  v.literal("verified"),
  v.literal("demo_notional"),
  v.literal("missing"),
  v.literal("personalized_pending")
);

const careAnswerPolicy = v.union(
  v.literal("answer_reference"),
  v.literal("escalate_only")
);

const sourceDocumentKind = v.union(
  v.literal("itinerary_packet"),
  v.literal("care_packet"),
  v.literal("care_note"),
  v.literal("logistics_handoff"),
  v.literal("guide"),
  v.literal("runbook")
);

const itineraryKind = v.union(
  v.literal("flight"),
  v.literal("clinic"),
  v.literal("hotel"),
  v.literal("transport"),
  v.literal("followup"),
  v.literal("preop")
);

const messageRole = v.union(
  v.literal("patient"),
  v.literal("agent"),
  v.literal("concierge"),
  v.literal("system")
);

const channel = v.union(v.literal("terminal"), v.literal("imessage"));

const automationState = v.union(
  v.literal("active"),
  v.literal("paused_for_review"),
  v.literal("taken_over"),
  v.literal("resolved")
);

const escalationStatus = v.union(
  v.literal("open"),
  v.literal("taken_over"),
  v.literal("resolved")
);

const escalationLevel = v.union(v.literal("High"), v.literal("Med"));

const escalationCategory = v.union(
  v.literal("itinerary_reference"),
  v.literal("travel_logistics"),
  v.literal("local_recommendation"),
  v.literal("documented_preop_reference"),
  v.literal("medication_decision"),
  v.literal("postop_symptom_or_recovery"),
  v.literal("medical_or_clinical_judgment"),
  v.literal("staff_safety_or_quality"),
  v.literal("out_of_package_request"),
  v.literal("missing_source_or_unsure")
);

/**
 * A per-patient, tighten-only policy override (ADR 021). `category` is a
 * taxonomy category (the narrow `EscalationCategory` union, so the stored row
 * matches the domain type); the tighten-only invariant is enforced by
 * `resolvePatientPolicy` in `@essos/shared`.
 */
const policyOverride = v.object({
  category: escalationCategory,
  force_escalate: v.optional(v.boolean()),
  level: v.optional(escalationLevel),
});

const activityEvent = v.union(
  v.literal("message"),
  v.literal("logistics"),
  v.literal("escalated"),
  v.literal("drafted"),
  v.literal("paused"),
  v.literal("taken_over"),
  v.literal("resolved"),
  v.literal("resumed"),
  v.literal("reminder")
);

export const patientDoc = v.object({
  _id: v.id("patients"),
  _creationTime: v.number(),
  id: v.string(),
  name: v.string(),
  handle: v.string(),
  procedure,
  destination_city: v.string(),
  destination_country: v.string(),
  clinic_name: v.string(),
  hotel_name: v.string(),
  companion_name: v.union(v.string(), v.null()),
  dietary_notes: v.union(v.string(), v.null()),
  assignee_user_id: v.optional(v.union(v.string(), v.null())),
  associated_user_ids: v.optional(v.array(v.string())),
  /** Per-patient tighten-only policy overrides (ADR 021). */
  policy_overrides: v.optional(v.array(policyOverride)),
  created_at: v.string(),
});

export const sourceDocumentDoc = v.object({
  _id: v.id("source_documents"),
  _creationTime: v.number(),
  id: v.string(),
  patient_id: v.union(v.string(), v.null()),
  kind: sourceDocumentKind,
  title: v.string(),
  source_type: careSourceType,
  source_status: careSourceStatus,
  answer_policy: careAnswerPolicy,
  markdown_path: v.optional(v.union(v.string(), v.null())),
  pdf_path: v.optional(v.union(v.string(), v.null())),
  sha256: v.optional(v.union(v.string(), v.null())),
  storage_id: v.optional(v.union(v.id("_storage"), v.null())),
  file_name: v.optional(v.union(v.string(), v.null())),
  content_type: v.optional(v.union(v.string(), v.null())),
  created_at: v.string(),
});

export const itineraryEventDoc = v.object({
  _id: v.id("itinerary_events"),
  _creationTime: v.number(),
  id: v.string(),
  patient_id: v.string(),
  source_document_id: v.union(v.string(), v.null()),
  kind: itineraryKind,
  title: v.string(),
  detail: v.union(v.string(), v.null()),
  location: v.union(v.string(), v.null()),
  starts_at: v.union(v.string(), v.null()),
  ends_at: v.union(v.string(), v.null()),
  confirmation_number: v.union(v.string(), v.null()),
  driver_name: v.union(v.string(), v.null()),
  driver_phone: v.union(v.string(), v.null()),
  sort_order: v.number(),
});

export const careInstructionDoc = v.object({
  _id: v.id("care_instructions"),
  _creationTime: v.number(),
  id: v.string(),
  patient_id: v.string(),
  source_document_id: v.union(v.string(), v.null()),
  phase: carePhase,
  procedure,
  title: v.string(),
  body: v.string(),
  source_type: careSourceType,
  source_status: careSourceStatus,
  answer_policy: careAnswerPolicy,
  effective_from: v.union(v.string(), v.null()),
  effective_until: v.union(v.string(), v.null()),
  created_at: v.string(),
  updated_at: v.string(),
});

export const conversationDoc = v.object({
  _id: v.id("conversations"),
  _creationTime: v.number(),
  id: v.string(),
  patient_id: v.string(),
  space_id: v.string(),
  channel,
  automation_state: automationState,
  eve_session: v.union(v.string(), v.null()),
  assignee_user_id: v.optional(v.union(v.string(), v.null())),
  created_at: v.string(),
  updated_at: v.string(),
});

export const messageDoc = v.object({
  _id: v.id("messages"),
  _creationTime: v.number(),
  id: v.string(),
  conversation_id: v.string(),
  role: messageRole,
  author_handle: v.union(v.string(), v.null()),
  source_event_id: v.optional(v.union(v.string(), v.null())),
  text: v.string(),
  category: v.union(v.string(), v.null()),
  created_at: v.string(),
  meta_kind: v.union(v.string(), v.null()),
  outbound: v.union(
    v.literal("pending"),
    v.literal("sent"),
    v.literal("failed"),
    v.null()
  ),
  outbound_attempts: v.optional(v.number()),
  outbound_error: v.optional(v.union(v.string(), v.null())),
  meta_json: v.union(v.string(), v.null()),
});

export const escalationDoc = v.object({
  _id: v.id("escalations"),
  _creationTime: v.number(),
  id: v.string(),
  conversation_id: v.string(),
  patient_id: v.string(),
  level: escalationLevel,
  reason: v.string(),
  summary: v.string(),
  source_message_id: v.union(v.string(), v.null()),
  status: escalationStatus,
  assignee: v.union(v.string(), v.null()),
  assignee_user_id: v.optional(v.union(v.string(), v.null())),
  created_at: v.string(),
  resolved_at: v.union(v.string(), v.null()),
  suggested_reply: v.union(v.string(), v.null()),
  suggested_reply_sources: v.union(v.string(), v.null()),
  feedback_valid: v.optional(v.union(v.boolean(), v.null())),
  feedback_note: v.optional(v.union(v.string(), v.null())),
  feedback_by: v.optional(v.union(v.string(), v.null())),
  feedback_at: v.optional(v.union(v.string(), v.null())),
  draft_edit_distance: v.optional(v.union(v.number(), v.null())),
});

export const activityLogDoc = v.object({
  _id: v.id("activity_log"),
  _creationTime: v.number(),
  id: v.string(),
  conversation_id: v.string(),
  event: activityEvent,
  actor: v.string(),
  detail: v.union(v.string(), v.null()),
  created_at: v.string(),
});

export const userDoc = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  tokenIdentifier: v.string(),
  clerkId: v.string(),
  name: v.string(),
  email: v.string(),
  pictureUrl: v.union(v.string(), v.null()),
  orgId: v.union(v.string(), v.null()),
  role: v.string(),
  slack_user_id: v.optional(v.union(v.string(), v.null())),
  createdAt: v.string(),
  updatedAt: v.union(v.string(), v.null()),
});

const slackOutboxKind = v.union(
  v.literal("escalation"),
  v.literal("activity"),
  v.literal("patient_message")
);

const patientCardPurpose = v.union(
  v.literal("itinerary"),
  v.literal("clinic"),
  v.literal("source_data")
);

export const slackOutboxDoc = v.object({
  _id: v.id("slack_outbox"),
  _creationTime: v.number(),
  id: v.string(),
  kind: slackOutboxKind,
  conversation_id: v.string(),
  escalation_id: v.union(v.string(), v.null()),
  payload_json: v.union(v.string(), v.null()),
  status: v.union(v.literal("pending"), v.literal("posted")),
  slack_ts: v.union(v.string(), v.null()),
  created_at: v.string(),
});

export const slackLinkDoc = v.object({
  _id: v.id("slack_links"),
  _creationTime: v.number(),
  conversation_id: v.string(),
  escalation_id: v.union(v.string(), v.null()),
  channel_id: v.string(),
  thread_ts: v.string(),
  created_at: v.string(),
});

export const patientCardLinkDoc = v.object({
  _id: v.id("patient_card_links"),
  _creationTime: v.number(),
  id: v.string(),
  token_hash: v.string(),
  patient_id: v.string(),
  conversation_id: v.string(),
  purpose: patientCardPurpose,
  payload_json: v.string(),
  expires_at: v.string(),
  created_at: v.string(),
  used_at: v.union(v.string(), v.null()),
});

export const patientCardLinkResult = v.object({
  expiresAt: v.string(),
  path: v.string(),
  purpose: patientCardPurpose,
  token: v.string(),
  url: v.string(),
});

/** Persisted Eve session blob. */
export const eveSessionValidator = v.object({
  sessionId: v.string(),
  continuationToken: v.string(),
  turns: v.number(),
});

/** Denormalized conversation summary row for the dashboard list. */
export const conversationSummary = v.object({
  id: v.string(),
  patient_id: v.string(),
  automation_state: automationState,
  updated_at: v.string(),
  assignee_user_id: v.optional(v.union(v.string(), v.null())),
  patient_name: v.union(v.string(), v.null()),
  patient_procedure: v.union(procedure, v.null()),
  patient_city: v.union(v.string(), v.null()),
  patient_country: v.union(v.string(), v.null()),
  last_role: v.union(messageRole, v.null()),
  last_text: v.union(v.string(), v.null()),
  open_flags: v.number(),
});

// --- Pipeline docs ---

/** A drained inbound message (from batch_queue or carried_messages). */
export const pipelineMessageDoc = v.object({
  client_guid: v.string(),
  source_event_id: v.optional(v.union(v.string(), v.null())),
  author_handle: v.union(v.string(), v.null()),
  source_message_id: v.string(),
  text: v.string(),
  created_at: v.string(),
});

export const inflightChainDoc = v.object({
  _id: v.id("inflight_chains"),
  _creationTime: v.number(),
  conversation_id: v.string(),
  chain_id: v.string(),
  chain_started_at: v.number(),
  stage: v.union(
    v.literal("flush"),
    v.literal("read"),
    v.literal("generate"),
    v.literal("send"),
    v.literal("done")
  ),
  cancelled_at: v.union(v.number(), v.null()),
  start_index: v.number(),
  sent_guids: v.array(v.string()),
  updated_at: v.string(),
});

export const agentMemoryDoc = v.object({
  _id: v.id("agent_memory"),
  _creationTime: v.number(),
  resource_id: v.string(),
  working_memory: v.string(),
  updated_at: v.string(),
});

export {
  activityEvent,
  automationState,
  careAnswerPolicy,
  carePhase,
  careSourceStatus,
  careSourceType,
  channel,
  escalationLevel,
  itineraryKind,
  messageRole,
  patientCardPurpose,
  policyOverride,
  procedure,
  sourceDocumentKind,
};
