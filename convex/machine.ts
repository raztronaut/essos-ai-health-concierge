import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import * as Conversations from "./model/conversations.js";
import * as Messages from "./model/messages.js";
import * as Escalations from "./model/escalations.js";
import * as Activity from "./model/activity.js";
import * as Patients from "./model/patients.js";
import * as Telemetry from "./model/telemetry.js";

/**
 * Machine-path functions for the Eve agent + Spectrum transport. These are
 * `internal*` (never publicly callable) and are reached only through the
 * service-secret-guarded HTTP action in `http.ts`. The dashboard never calls
 * these — it uses the Clerk-gated public functions in the domain files.
 */

// ----------------------------- Reads -----------------------------

export const getConversationBySpace = internalQuery({
  args: { spaceId: v.string() },
  handler: async (ctx, { spaceId }) => Conversations.getBySpace(ctx, spaceId),
});

export const getConversationById = internalQuery({
  args: { id: v.string() },
  handler: async (ctx, { id }) => Conversations.getByExternalId(ctx, id),
});

export const listConversations = internalQuery({
  args: {},
  handler: async (ctx) => Conversations.list(ctx),
});

export const getEveSession = internalQuery({
  args: { conversationId: v.string() },
  handler: async (ctx, { conversationId }) =>
    Conversations.getEveSession(ctx, conversationId),
});

export const getPatientById = internalQuery({
  args: { id: v.string() },
  handler: async (ctx, { id }) => Patients.getByExternalId(ctx, id),
});

export const getPatientByHandle = internalQuery({
  args: { handle: v.string() },
  handler: async (ctx, { handle }) => Patients.getByHandle(ctx, handle),
});

export const listPatients = internalQuery({
  args: {},
  handler: async (ctx) => Patients.list(ctx),
});

export const listItinerary = internalQuery({
  args: { patientId: v.string() },
  handler: async (ctx, { patientId }) => Patients.listItinerary(ctx, patientId),
});

export const listCareInstructions = internalQuery({
  args: {
    patientId: v.string(),
    phase: v.optional(
      v.union(v.literal("preop"), v.literal("postop"), v.literal("general")),
    ),
  },
  handler: async (ctx, { patientId, phase }) =>
    Patients.listCareInstructions(ctx, patientId, phase),
});

export const listMessages = internalQuery({
  args: { conversationId: v.string() },
  handler: async (ctx, { conversationId }) => Messages.list(ctx, conversationId),
});

export const listOpenEscalationsForConversation = internalQuery({
  args: { conversationId: v.string() },
  handler: async (ctx, { conversationId }) =>
    Escalations.listOpenForConversation(ctx, conversationId),
});

export const hasMessageWithMetaKind = internalQuery({
  args: {
    conversationId: v.string(),
    kind: v.string(),
    since: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, { conversationId, kind, since }) =>
    Messages.hasMessageWithMetaKind(ctx, conversationId, kind, since ?? null),
});

export const listPendingOutbound = internalQuery({
  args: {},
  handler: async (ctx) => Messages.listPendingOutbound(ctx),
});

// ----------------------------- Writes -----------------------------

export const ensureConversation = internalMutation({
  args: {
    spaceId: v.string(),
    patientId: v.string(),
    channel: v.union(v.literal("terminal"), v.literal("imessage")),
  },
  handler: async (ctx, args) =>
    Conversations.ensure(ctx, {
      spaceId: args.spaceId,
      patientId: args.patientId,
      channel: args.channel,
    }),
});

export const appendMessage = internalMutation({
  args: {
    conversationId: v.string(),
    role: v.union(
      v.literal("patient"),
      v.literal("agent"),
      v.literal("concierge"),
      v.literal("system"),
    ),
    text: v.string(),
    authorHandle: v.optional(v.union(v.string(), v.null())),
    category: v.optional(v.union(v.string(), v.null())),
    meta: v.optional(v.union(v.any(), v.null())),
  },
  handler: async (ctx, args) =>
    Messages.add(ctx, {
      conversationId: args.conversationId,
      role: args.role,
      text: args.text,
      authorHandle: args.authorHandle ?? null,
      category: args.category ?? null,
      meta: (args.meta as Record<string, unknown> | null) ?? null,
    }),
});

export const setAutomationState = internalMutation({
  args: {
    conversationId: v.string(),
    state: v.union(
      v.literal("active"),
      v.literal("paused_for_review"),
      v.literal("taken_over"),
      v.literal("resolved"),
    ),
  },
  handler: async (ctx, { conversationId, state }) =>
    Conversations.setAutomationState(ctx, conversationId, state),
});

export const markConciergeTakeover = internalMutation({
  args: { conversationId: v.string(), assignee: v.string() },
  handler: async (ctx, { conversationId, assignee }) =>
    Escalations.markConciergeTakeover(ctx, conversationId, assignee),
});

export const resumeAutomation = internalMutation({
  args: { conversationId: v.string(), actor: v.string() },
  handler: async (ctx, { conversationId, actor }) =>
    Escalations.resumeAutomation(ctx, conversationId, actor),
});

/** Dev/test cleanup: delete a conversation by space id and its child rows. */
export const deleteConversationBySpace = internalMutation({
  args: { spaceId: v.string() },
  handler: async (ctx, { spaceId }) => {
    const conv = await Conversations.getBySpace(ctx, spaceId);
    if (!conv) return;
    for (const table of ["messages", "escalations", "activity_log"] as const) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_conversation", (q) => q.eq("conversation_id", conv.id))
        .collect();
      for (const row of rows) await ctx.db.delete(row._id);
    }
    await ctx.db.delete(conv._id);
  },
});

export const logActivity = internalMutation({
  args: {
    conversationId: v.string(),
    event: v.union(
      v.literal("message"),
      v.literal("logistics"),
      v.literal("escalated"),
      v.literal("drafted"),
      v.literal("paused"),
      v.literal("taken_over"),
      v.literal("resolved"),
      v.literal("resumed"),
      v.literal("reminder"),
    ),
    actor: v.string(),
    detail: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) =>
    Activity.log(ctx, {
      conversationId: args.conversationId,
      event: args.event,
      actor: args.actor,
      detail: args.detail ?? null,
    }),
});

/** The escalate trip wire: create + pause + log (+ draft), as one transaction. */
export const escalateToHuman = internalMutation({
  args: {
    conversationId: v.string(),
    patientId: v.string(),
    level: v.union(v.literal("High"), v.literal("Med")),
    reason: v.string(),
    summary: v.string(),
    sourceMessageId: v.optional(v.union(v.string(), v.null())),
    suggestedReply: v.optional(v.union(v.string(), v.null())),
    suggestedReplySources: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const escalation = await Escalations.create(ctx, {
      conversationId: args.conversationId,
      patientId: args.patientId,
      level: args.level,
      reason: args.reason,
      summary: args.summary,
      sourceMessageId: args.sourceMessageId ?? null,
      suggestedReply: args.suggestedReply ?? null,
      suggestedReplySources: args.suggestedReplySources ?? null,
    });
    await Conversations.setAutomationState(
      ctx,
      args.conversationId,
      "paused_for_review",
    );
    await Activity.log(ctx, {
      conversationId: args.conversationId,
      event: "escalated",
      actor: "eve",
      detail: `${args.level} • ${args.reason} • ${escalation.id}`,
    });
    if (args.suggestedReply) {
      await Activity.log(ctx, {
        conversationId: args.conversationId,
        event: "drafted",
        actor: "eve",
        detail: "Eve drafted a suggested reply for the concierge.",
      });
    }
    await Activity.log(ctx, {
      conversationId: args.conversationId,
      event: "paused",
      actor: "eve",
      detail: "Automation paused pending human review.",
    });
    return { escalationId: escalation.id, level: args.level };
  },
});

export const saveEveSession = internalMutation({
  args: {
    conversationId: v.string(),
    session: v.object({
      sessionId: v.string(),
      continuationToken: v.string(),
      turns: v.number(),
    }),
  },
  handler: async (ctx, { conversationId, session }) =>
    Conversations.saveEveSession(ctx, conversationId, session),
});

export const markOutboundDelivered = internalMutation({
  args: { messageId: v.string() },
  handler: async (ctx, { messageId }) =>
    Messages.markOutboundDelivered(ctx, messageId),
});

export const recordAgentTurn = internalMutation({
  args: {
    conversationId: v.string(),
    patientId: v.optional(v.union(v.string(), v.null())),
    latencyMs: v.number(),
    toolCalls: v.array(v.string()),
    finishReason: v.optional(v.union(v.string(), v.null())),
    promptTokens: v.optional(v.union(v.number(), v.null())),
    completionTokens: v.optional(v.union(v.number(), v.null())),
    totalTokens: v.optional(v.union(v.number(), v.null())),
    escalated: v.boolean(),
    category: v.optional(v.union(v.string(), v.null())),
    ok: v.boolean(),
    error: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) =>
    Telemetry.record(ctx, {
      conversationId: args.conversationId,
      patientId: args.patientId ?? null,
      latencyMs: args.latencyMs,
      toolCalls: args.toolCalls,
      finishReason: args.finishReason ?? null,
      promptTokens: args.promptTokens ?? null,
      completionTokens: args.completionTokens ?? null,
      totalTokens: args.totalTokens ?? null,
      escalated: args.escalated,
      category: args.category ?? null,
      ok: args.ok,
      error: args.error ?? null,
    }),
});
