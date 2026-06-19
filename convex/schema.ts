import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Convex schema for the Essos concierge.
 *
 * Ported 1:1 from the previous local SQLite schema (shared/src/db.ts). To keep
 * the agent/transport/dashboard contracts stable, every table preserves its
 * original string `id` (e.g. "pat_maya", "conv_...") and snake_case columns
 * alongside Convex's own `_id`/`_creationTime`. Lookups by the legacy string id
 * or by foreign keys go through explicit indexes (never `.filter()` scans).
 *
 * Timestamps stay ISO-8601 strings (sortable lexicographically) to match the
 * existing formatters and tool output.
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

const slackOutboxKind = v.union(
  v.literal("escalation"),
  v.literal("activity"),
  v.literal("patient_message")
);

export default defineSchema({
  patients: defineTable({
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
    /** Owning concierge (Clerk user id), or null for the unassigned queue. */
    assignee_user_id: v.optional(v.union(v.string(), v.null())),
    created_at: v.string(),
  })
    .index("by_external_id", ["id"])
    .index("by_handle", ["handle"])
    .index("by_assignee", ["assignee_user_id"]),

  source_documents: defineTable({
    id: v.string(),
    patient_id: v.union(v.string(), v.null()),
    kind: sourceDocumentKind,
    title: v.string(),
    source_type: careSourceType,
    source_status: careSourceStatus,
    answer_policy: careAnswerPolicy,
    // Seeded docs reference on-disk assets; uploaded docs leave these null.
    markdown_path: v.optional(v.union(v.string(), v.null())),
    pdf_path: v.optional(v.union(v.string(), v.null())),
    sha256: v.optional(v.union(v.string(), v.null())),
    // Uploaded docs live in Convex file storage instead of on disk.
    storage_id: v.optional(v.union(v.id("_storage"), v.null())),
    file_name: v.optional(v.union(v.string(), v.null())),
    content_type: v.optional(v.union(v.string(), v.null())),
    created_at: v.string(),
  })
    .index("by_external_id", ["id"])
    .index("by_patient", ["patient_id"]),

  itinerary_events: defineTable({
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
  })
    .index("by_external_id", ["id"])
    .index("by_patient", ["patient_id", "sort_order"]),

  care_instructions: defineTable({
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
  })
    .index("by_external_id", ["id"])
    .index("by_patient", ["patient_id", "phase"]),

  conversations: defineTable({
    id: v.string(),
    patient_id: v.string(),
    space_id: v.string(),
    channel,
    automation_state: automationState,
    /** Persisted Eve session { sessionId, continuationToken, turns } as JSON. */
    eve_session: v.union(v.string(), v.null()),
    /** Owning concierge (Clerk user id); mirrors the patient's assignment. */
    assignee_user_id: v.optional(v.union(v.string(), v.null())),
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index("by_external_id", ["id"])
    .index("by_space", ["space_id"])
    .index("by_patient", ["patient_id"])
    .index("by_updated", ["updated_at"])
    .index("by_assignee", ["assignee_user_id"]),

  messages: defineTable({
    id: v.string(),
    conversation_id: v.string(),
    role: messageRole,
    author_handle: v.union(v.string(), v.null()),
    text: v.string(),
    category: v.union(v.string(), v.null()),
    created_at: v.string(),
    /** Promoted from meta for indexable latches: disclosure|handoff_holding|reminder. */
    meta_kind: v.union(v.string(), v.null()),
    /** Outbound bridge state for concierge replies: pending|sent|failed. */
    outbound: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("failed"),
      v.null()
    ),
    /** Delivery attempts so far, for backoff + dead-lettering an outbound row. */
    outbound_attempts: v.optional(v.number()),
    /** Last delivery error; set when `outbound = "failed"` so a human can see why. */
    outbound_error: v.optional(v.union(v.string(), v.null())),
    /** Remaining serialized meta (e.g. event_id) for anything not promoted. */
    meta_json: v.union(v.string(), v.null()),
  })
    .index("by_external_id", ["id"])
    .index("by_conversation", ["conversation_id", "created_at"])
    .index("by_conversation_and_kind", ["conversation_id", "meta_kind"])
    .index("by_role", ["role"])
    .index("by_outbound", ["outbound"]),

  escalations: defineTable({
    id: v.string(),
    conversation_id: v.string(),
    patient_id: v.string(),
    level: escalationLevel,
    reason: v.string(),
    summary: v.string(),
    source_message_id: v.union(v.string(), v.null()),
    status: escalationStatus,
    /** Human-readable assignee label (name/email) for display. */
    assignee: v.union(v.string(), v.null()),
    /** Stable owning concierge (Clerk user id) for identity-keyed metrics. */
    assignee_user_id: v.optional(v.union(v.string(), v.null())),
    created_at: v.string(),
    resolved_at: v.union(v.string(), v.null()),
    /** AI-assist draft for the concierge to review/edit/send (never auto-sent). */
    suggested_reply: v.union(v.string(), v.null()),
    /** JSON array of short source labels Eve used for the draft. */
    suggested_reply_sources: v.union(v.string(), v.null()),
  })
    .index("by_external_id", ["id"])
    .index("by_conversation", ["conversation_id", "created_at"])
    .index("by_status", ["status", "created_at"])
    .index("by_assignee", ["assignee_user_id"]),

  activity_log: defineTable({
    id: v.string(),
    conversation_id: v.string(),
    event: activityEvent,
    actor: v.string(),
    detail: v.union(v.string(), v.null()),
    created_at: v.string(),
  })
    .index("by_external_id", ["id"])
    .index("by_conversation", ["conversation_id", "created_at"])
    .index("by_event", ["event"])
    .index("by_created", ["created_at"]),

  // --- New: per-turn AI telemetry (the observability win) ---
  agent_turns: defineTable({
    conversation_id: v.string(),
    patient_id: v.union(v.string(), v.null()),
    latency_ms: v.number(),
    tool_calls: v.array(v.string()),
    tool_call_count: v.number(),
    finish_reason: v.union(v.string(), v.null()),
    prompt_tokens: v.union(v.number(), v.null()),
    completion_tokens: v.union(v.number(), v.null()),
    total_tokens: v.union(v.number(), v.null()),
    escalated: v.boolean(),
    category: v.union(v.string(), v.null()),
    ok: v.boolean(),
    error: v.union(v.string(), v.null()),
    created_at: v.string(),
  })
    .index("by_conversation", ["conversation_id", "created_at"])
    .index("by_created", ["created_at"]),

  // --- New: concierge profiles synced from Clerk ---
  users: defineTable({
    tokenIdentifier: v.string(),
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    pictureUrl: v.union(v.string(), v.null()),
    orgId: v.union(v.string(), v.null()),
    role: v.string(),
    /** Slack user id (e.g. "U0123"), set once a concierge is matched by email. */
    slack_user_id: v.optional(v.union(v.string(), v.null())),
    createdAt: v.string(),
    updatedAt: v.union(v.string(), v.null()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_org", ["orgId"])
    .index("by_slack_user", ["slack_user_id"]),

  // --- New: Slack concierge bridge ---
  //
  // The Slack service polls `slack_outbox` (mirroring the concierge-reply
  // outbound pattern on `messages`) and posts each pending row to Slack, then
  // records the resulting thread in `slack_links` so follow-up activity and
  // patient messages thread under the original escalation card.
  slack_outbox: defineTable({
    id: v.string(),
    kind: slackOutboxKind,
    conversation_id: v.string(),
    escalation_id: v.union(v.string(), v.null()),
    /** Serialized extra payload (activity event/detail, patient message text). */
    payload_json: v.union(v.string(), v.null()),
    status: v.union(v.literal("pending"), v.literal("posted")),
    /** Slack message ts assigned on post (for dedup/debugging). */
    slack_ts: v.union(v.string(), v.null()),
    created_at: v.string(),
  })
    .index("by_external_id", ["id"])
    .index("by_status", ["status", "created_at"])
    .index("by_conversation", ["conversation_id"]),

  slack_links: defineTable({
    conversation_id: v.string(),
    escalation_id: v.union(v.string(), v.null()),
    channel_id: v.string(),
    /** Slack thread parent ts; every threaded update replies to this. */
    thread_ts: v.string(),
    created_at: v.string(),
  })
    .index("by_conversation", ["conversation_id"])
    .index("by_thread", ["thread_ts"]),
});
