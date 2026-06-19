import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import {
  activityLogDoc,
  agentMemoryDoc,
  careInstructionDoc,
  conversationDoc,
  escalationDoc,
  escalationLevel,
  eveSessionValidator,
  inflightChainDoc,
  itineraryEventDoc,
  messageDoc,
  patientCardLinkDoc,
  patientCardLinkResult,
  patientCardPurpose,
  patientDoc,
  pipelineMessageDoc,
  slackLinkDoc,
  slackOutboxDoc,
} from "./lib/validators.js";
import * as Activity from "./model/activity.js";
import * as Conversations from "./model/conversations.js";
import * as Escalations from "./model/escalations.js";
import * as JobFailures from "./model/jobFailures.js";
import * as Memory from "./model/memory.js";
import * as Messages from "./model/messages.js";
import * as PatientCards from "./model/patientCards.js";
import * as Patients from "./model/patients.js";
import * as Pipeline from "./model/pipeline.js";
import * as Slack from "./model/slack.js";
import * as Telemetry from "./model/telemetry.js";

/** Patient-facing signature appended to every concierge reply (matches dashboard). */
function composeConciergeReply(text: string, agentName: string): string {
  const signature = agentName
    ? `— ${agentName}, Essos Care Team`
    : "— Essos Care Team";
  return `${text}\n\n${signature}`;
}

/**
 * Machine-path functions for the Eve agent + Spectrum transport. These are
 * `internal*` (never publicly callable) and are reached only through the
 * service-secret-guarded HTTP action in `http.ts`. The dashboard never calls
 * these — it uses the Clerk-gated public functions in the domain files.
 */

// ----------------------------- Reads -----------------------------

export const getConversationBySpace = internalQuery({
  args: { spaceId: v.string() },
  returns: v.union(conversationDoc, v.null()),
  handler: async (ctx, { spaceId }) => Conversations.getBySpace(ctx, spaceId),
});

export const getConversationById = internalQuery({
  args: { id: v.string() },
  returns: v.union(conversationDoc, v.null()),
  handler: async (ctx, { id }) => Conversations.getByExternalId(ctx, id),
});

export const listConversations = internalQuery({
  args: {},
  returns: v.array(conversationDoc),
  handler: async (ctx) => Conversations.list(ctx),
});

export const getEveSession = internalQuery({
  args: { conversationId: v.string() },
  returns: v.union(eveSessionValidator, v.null()),
  handler: async (ctx, { conversationId }) =>
    Conversations.getEveSession(ctx, conversationId),
});

export const getPatientById = internalQuery({
  args: { id: v.string() },
  returns: v.union(patientDoc, v.null()),
  handler: async (ctx, { id }) => Patients.getByExternalId(ctx, id),
});

export const getPatientByHandle = internalQuery({
  args: { handle: v.string() },
  returns: v.union(patientDoc, v.null()),
  handler: async (ctx, { handle }) => Patients.getByHandle(ctx, handle),
});

export const listPatients = internalQuery({
  args: {},
  returns: v.array(patientDoc),
  handler: async (ctx) => Patients.list(ctx),
});

export const listItinerary = internalQuery({
  args: { patientId: v.string() },
  returns: v.array(itineraryEventDoc),
  handler: async (ctx, { patientId }) => Patients.listItinerary(ctx, patientId),
});

export const listCareInstructions = internalQuery({
  args: {
    patientId: v.string(),
    phase: v.optional(
      v.union(v.literal("preop"), v.literal("postop"), v.literal("general"))
    ),
  },
  returns: v.array(careInstructionDoc),
  handler: async (ctx, { patientId, phase }) =>
    Patients.listCareInstructions(ctx, patientId, phase),
});

export const listMessages = internalQuery({
  args: { conversationId: v.string() },
  returns: v.array(messageDoc),
  handler: async (ctx, { conversationId }) =>
    Messages.list(ctx, conversationId),
});

export const listOpenEscalationsForConversation = internalQuery({
  args: { conversationId: v.string() },
  returns: v.array(escalationDoc),
  handler: async (ctx, { conversationId }) =>
    Escalations.listOpenForConversation(ctx, conversationId),
});

export const hasMessageWithMetaKind = internalQuery({
  args: {
    conversationId: v.string(),
    kind: v.string(),
    since: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.boolean(),
  handler: async (ctx, { conversationId, kind, since }) =>
    Messages.hasMessageWithMetaKind(ctx, conversationId, kind, since ?? null),
});

export const getMessageBySourceEvent = internalQuery({
  args: { conversationId: v.string(), sourceEventId: v.string() },
  returns: v.union(messageDoc, v.null()),
  handler: async (ctx, { conversationId, sourceEventId }) =>
    Messages.getBySourceEvent(ctx, conversationId, sourceEventId),
});

export const listPendingOutbound = internalQuery({
  args: {},
  returns: v.array(messageDoc),
  handler: async (ctx) => Messages.listPendingOutbound(ctx),
});

export const getPatientCardLinkByTokenHash = internalQuery({
  args: { tokenHash: v.string() },
  returns: v.union(patientCardLinkDoc, v.null()),
  handler: async (ctx, { tokenHash }) =>
    PatientCards.getByTokenHash(ctx, tokenHash),
});

// ----------------------------- Writes -----------------------------

export const ensureConversation = internalMutation({
  args: {
    spaceId: v.string(),
    patientId: v.string(),
    channel: v.union(v.literal("terminal"), v.literal("imessage")),
  },
  returns: conversationDoc,
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
      v.literal("system")
    ),
    text: v.string(),
    authorHandle: v.optional(v.union(v.string(), v.null())),
    category: v.optional(v.union(v.string(), v.null())),
    meta: v.optional(v.union(v.any(), v.null())),
    sourceEventId: v.optional(v.union(v.string(), v.null())),
  },
  returns: messageDoc,
  handler: async (ctx, args) =>
    Messages.add(ctx, {
      conversationId: args.conversationId,
      role: args.role,
      text: args.text,
      authorHandle: args.authorHandle ?? null,
      category: args.category ?? null,
      meta: (args.meta as Record<string, unknown> | null) ?? null,
      sourceEventId: args.sourceEventId ?? null,
    }),
});

export const setAutomationState = internalMutation({
  args: {
    conversationId: v.string(),
    state: v.union(
      v.literal("active"),
      v.literal("paused_for_review"),
      v.literal("taken_over"),
      v.literal("resolved")
    ),
  },
  returns: v.null(),
  handler: async (ctx, { conversationId, state }) =>
    Conversations.setAutomationState(ctx, conversationId, state),
});

export const markConciergeTakeover = internalMutation({
  args: { conversationId: v.string(), assignee: v.string() },
  returns: v.null(),
  handler: async (ctx, { conversationId, assignee }) =>
    Escalations.markConciergeTakeover(ctx, conversationId, assignee),
});

export const resumeAutomation = internalMutation({
  args: { conversationId: v.string(), actor: v.string() },
  returns: v.null(),
  handler: async (ctx, { conversationId, actor }) =>
    Escalations.resumeAutomation(ctx, conversationId, actor),
});

/** Resolve all flags on a conversation and resume Eve in one step (patient "resume"). */
export const resolveAndResume = internalMutation({
  args: { conversationId: v.string(), actor: v.string() },
  returns: v.null(),
  handler: async (ctx, { conversationId, actor }) =>
    Escalations.resolveAndResume(ctx, conversationId, actor),
});

/** Dev/test cleanup: delete a conversation by space id and its child rows. */
export const deleteConversationBySpace = internalMutation({
  args: { spaceId: v.string() },
  returns: v.null(),
  handler: async (ctx, { spaceId }) => {
    const conv = await Conversations.getBySpace(ctx, spaceId);
    if (!conv) {
      return;
    }
    for (const table of ["messages", "escalations", "activity_log"] as const) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_conversation", (q) => q.eq("conversation_id", conv.id))
        .collect();
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
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
      v.literal("reminder")
    ),
    actor: v.string(),
    detail: v.optional(v.union(v.string(), v.null())),
  },
  returns: activityLogDoc,
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
  returns: v.object({ escalationId: v.string(), level: escalationLevel }),
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
      "paused_for_review"
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
    // Fan the escalation out to Slack (no-op unless SLACK_ENABLED).
    await Slack.enqueueEscalation(ctx, {
      conversationId: args.conversationId,
      escalationId: escalation.id,
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
  returns: v.null(),
  handler: async (ctx, { conversationId, session }) =>
    Conversations.saveEveSession(ctx, conversationId, session),
});

export const markOutboundDelivered = internalMutation({
  args: { messageId: v.string() },
  returns: v.null(),
  handler: async (ctx, { messageId }) =>
    Messages.markOutboundDelivered(ctx, messageId),
});

export const recordOutboundFailure = internalMutation({
  args: {
    messageId: v.string(),
    error: v.string(),
    permanent: v.boolean(),
    maxAttempts: v.optional(v.number()),
  },
  returns: v.object({
    outbound: v.union(v.literal("pending"), v.literal("failed")),
    attempts: v.number(),
  }),
  handler: async (ctx, args) => Messages.recordOutboundFailure(ctx, args),
});

/** Assign a patient to a concierge (Clerk user id). Used by the team seeder. */
export const assignPatient = internalMutation({
  args: {
    patientId: v.string(),
    assigneeUserId: v.union(v.string(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, { patientId, assigneeUserId }) => {
    await Patients.assign(ctx, patientId, assigneeUserId);
    return null;
  },
});

/**
 * Find or create a guest patient bound to an iMessage handle (cloned from a
 * template patient). Lets an unknown sender start chatting with Eve immediately.
 */
export const ensureGuestPatient = internalMutation({
  args: {
    handle: v.string(),
    name: v.optional(v.union(v.string(), v.null())),
    templateId: v.optional(v.string()),
  },
  returns: patientDoc,
  handler: async (ctx, { handle, name, templateId }) =>
    Patients.ensureGuest(ctx, {
      handle,
      name: name ?? null,
      templateId,
    }),
});

export const createPatientCardLink = internalMutation({
  args: {
    patientId: v.string(),
    conversationId: v.string(),
    purpose: patientCardPurpose,
    ttlMinutes: v.optional(v.union(v.number(), v.null())),
    baseUrl: v.optional(v.union(v.string(), v.null())),
  },
  returns: patientCardLinkResult,
  handler: async (ctx, args) =>
    PatientCards.createLink(ctx, {
      patientId: args.patientId,
      conversationId: args.conversationId,
      purpose: args.purpose,
      ttlMinutes: args.ttlMinutes ?? null,
      baseUrl: args.baseUrl ?? null,
    }),
});

export const markPatientCardLinkUsed = internalMutation({
  args: { tokenHash: v.string() },
  returns: v.null(),
  handler: async (ctx, { tokenHash }) => {
    await PatientCards.markUsed(ctx, tokenHash);
    return null;
  },
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
  returns: v.null(),
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

// --------------------------- Slack bridge ---------------------------

const conciergeIdentity = v.object({
  clerkId: v.union(v.string(), v.null()),
  name: v.string(),
  email: v.union(v.string(), v.null()),
  isLead: v.boolean(),
  label: v.string(),
});

export const listPendingSlackOutbox = internalQuery({
  args: {},
  returns: v.array(slackOutboxDoc),
  handler: async (ctx) => Slack.listPending(ctx),
});

export const getSlackLinkByConversation = internalQuery({
  args: { conversationId: v.string() },
  returns: v.union(slackLinkDoc, v.null()),
  handler: async (ctx, { conversationId }) =>
    Slack.getLinkByConversation(ctx, conversationId),
});

export const getSlackLinkByThread = internalQuery({
  args: { threadTs: v.string() },
  returns: v.union(slackLinkDoc, v.null()),
  handler: async (ctx, { threadTs }) => Slack.getLinkByThread(ctx, threadTs),
});

/** Full data for an escalation card: the escalation plus its patient + conversation. */
export const getEscalationCard = internalQuery({
  args: { escalationId: v.string() },
  returns: v.union(
    v.object({
      escalation: escalationDoc,
      patient: v.union(patientDoc, v.null()),
      conversation: v.union(conversationDoc, v.null()),
    }),
    v.null()
  ),
  handler: async (ctx, { escalationId }) => {
    const escalation = await Escalations.getByExternalId(ctx, escalationId);
    if (!escalation) {
      return null;
    }
    const [patient, conversation] = await Promise.all([
      Patients.getByExternalId(ctx, escalation.patient_id),
      Conversations.getByExternalId(ctx, escalation.conversation_id),
    ]);
    return { escalation, patient, conversation };
  },
});

/** Patient status snapshot for the `/essos patient` slash command. */
export const getPatientOverview = internalQuery({
  args: { patientId: v.string() },
  returns: v.union(
    v.object({
      patient: patientDoc,
      conversation: v.union(conversationDoc, v.null()),
      openEscalations: v.number(),
      itinerary: v.array(itineraryEventDoc),
    }),
    v.null()
  ),
  handler: async (ctx, { patientId }) => {
    const patient = await Patients.getByExternalId(ctx, patientId);
    if (!patient) {
      return null;
    }
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_patient", (q) => q.eq("patient_id", patientId))
      .collect();
    const conversation =
      conversations.sort((a, b) =>
        b.updated_at.localeCompare(a.updated_at)
      )[0] ?? null;
    let openEscalations = 0;
    if (conversation) {
      const open = await Escalations.listOpenForConversation(
        ctx,
        conversation.id
      );
      openEscalations = open.length;
    }
    const itinerary = await Patients.listItinerary(ctx, patientId);
    return { patient, conversation, openEscalations, itinerary };
  },
});

/** Patient source documents with resolved download URLs for `/essos files`. */
export const listSourceDocumentsWithUrls = internalQuery({
  args: { patientId: v.string() },
  returns: v.array(
    v.object({
      id: v.string(),
      title: v.string(),
      kind: v.string(),
      file_name: v.union(v.string(), v.null()),
      url: v.union(v.string(), v.null()),
    })
  ),
  handler: async (ctx, { patientId }) => {
    const docs = await Patients.listSourceDocumentsForPatient(ctx, patientId);
    const out: {
      id: string;
      title: string;
      kind: string;
      file_name: string | null;
      url: string | null;
    }[] = [];
    for (const doc of docs) {
      const url = doc.storage_id
        ? await ctx.storage.getUrl(doc.storage_id)
        : null;
      out.push({
        id: doc.id,
        title: doc.title,
        kind: doc.kind,
        file_name: doc.file_name ?? null,
        url,
      });
    }
    return out;
  },
});

/** Resolve one patient-card document after the HTTP layer validates the token. */
export const getMiniappSourceDocument = internalQuery({
  args: { patientId: v.string(), documentId: v.string() },
  returns: v.union(
    v.object({
      content_type: v.union(v.string(), v.null()),
      file_name: v.union(v.string(), v.null()),
      title: v.string(),
      url: v.union(v.string(), v.null()),
    }),
    v.null()
  ),
  handler: async (ctx, { patientId, documentId }) => {
    const doc = await Patients.getSourceDocument(ctx, documentId);
    if (!(doc && (doc.patient_id === patientId || doc.patient_id === null))) {
      return null;
    }
    return {
      content_type: doc.content_type ?? null,
      file_name: doc.file_name ?? null,
      title: doc.title,
      url: doc.storage_id ? await ctx.storage.getUrl(doc.storage_id) : null,
    };
  },
});

/** Patients + open escalations a concierge should see (App Home queue). */
export const getQueueForConcierge = internalQuery({
  args: { clerkId: v.union(v.string(), v.null()), isLead: v.boolean() },
  returns: v.object({
    patients: v.array(patientDoc),
    escalations: v.array(escalationDoc),
  }),
  handler: async (ctx, { clerkId, isLead }) => {
    const [patients, escalations] = await Promise.all([
      Patients.listForConcierge(ctx, { clerkId, isLead }),
      Escalations.listByStatus(ctx, "open"),
    ]);
    return { patients, escalations };
  },
});

/**
 * Resolve a Slack user to a concierge, matching by email and persisting the
 * Slack user id for future fast lookups. Returns a usable identity even when no
 * concierge matches (label falls back to the Slack display name).
 */
export const resolveConciergeBySlackUser = internalMutation({
  args: {
    slackUserId: v.string(),
    email: v.union(v.string(), v.null()),
    displayName: v.union(v.string(), v.null()),
  },
  returns: conciergeIdentity,
  handler: async (ctx, { slackUserId, email, displayName }) => {
    const bySlack = await ctx.db
      .query("users")
      .withIndex("by_slack_user", (q) => q.eq("slack_user_id", slackUserId))
      .first();
    let user = bySlack;
    if (!user && email) {
      const byEmail = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique();
      if (byEmail) {
        await ctx.db.patch(byEmail._id, { slack_user_id: slackUserId });
        user = byEmail;
      }
    }
    if (user) {
      return {
        clerkId: user.clerkId,
        name: user.name,
        email: user.email,
        isLead: user.role === "org:admin",
        label: user.name || user.email,
      };
    }
    return {
      clerkId: null,
      name: displayName ?? "Concierge",
      email,
      isLead: false,
      label: displayName ?? "Concierge",
    };
  },
});

export const markSlackOutboxPosted = internalMutation({
  args: { id: v.string(), slackTs: v.string() },
  returns: v.null(),
  handler: async (ctx, { id, slackTs }) => {
    await Slack.markPosted(ctx, id, slackTs);
    return null;
  },
});

export const upsertSlackLink = internalMutation({
  args: {
    conversationId: v.string(),
    escalationId: v.optional(v.union(v.string(), v.null())),
    channelId: v.string(),
    threadTs: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await Slack.upsertLink(ctx, {
      conversationId: args.conversationId,
      escalationId: args.escalationId ?? null,
      channelId: args.channelId,
      threadTs: args.threadTs,
    });
    return null;
  },
});

/** Concierge reply authored in Slack: sign, queue for delivery, take over. */
export const conciergeReplyFromSlack = internalMutation({
  args: {
    conversationId: v.string(),
    text: v.string(),
    label: v.string(),
    clerkId: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, { conversationId, text, label, clerkId }) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return null;
    }
    const composed = composeConciergeReply(trimmed, label);
    // Draft-quality signal: how much the concierge changed Eve's draft (ADR 022).
    await Escalations.recordDraftEdit(ctx, conversationId, trimmed);
    await Messages.enqueueConciergeOutbound(ctx, {
      conversationId,
      text: composed,
      authorHandle: label,
    });
    await Escalations.markConciergeTakeover(
      ctx,
      conversationId,
      label,
      clerkId ?? null
    );
    return null;
  },
});

export const takeOverFromSlack = internalMutation({
  args: {
    conversationId: v.string(),
    label: v.string(),
    clerkId: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, { conversationId, label, clerkId }) => {
    await Escalations.markConciergeTakeover(
      ctx,
      conversationId,
      label,
      clerkId ?? null
    );
    return null;
  },
});

export const resolveEscalationFromSlack = internalMutation({
  args: {
    escalationId: v.string(),
    label: v.string(),
    clerkId: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, { escalationId, label, clerkId }) => {
    await Escalations.resolve(ctx, escalationId, label, clerkId ?? null);
    return null;
  },
});

export const resumeAutomationFromSlack = internalMutation({
  args: { conversationId: v.string(), label: v.string() },
  returns: v.null(),
  handler: async (ctx, { conversationId, label }) =>
    Escalations.resumeAutomation(ctx, conversationId, label),
});

export const setEscalationFeedbackFromSlack = internalMutation({
  args: {
    escalationId: v.string(),
    valid: v.boolean(),
    label: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { escalationId, valid, label }) => {
    await Escalations.setFeedback(ctx, escalationId, { valid, by: label });
    return null;
  },
});

export const resolveAndResumeFromSlack = internalMutation({
  args: {
    conversationId: v.string(),
    label: v.string(),
    clerkId: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, { conversationId, label, clerkId }) =>
    Escalations.resolveAndResume(ctx, conversationId, label, clerkId ?? null),
});

// ----------------------------- Pipeline (ADR 020) -----------------------------

const chainStage = v.union(
  v.literal("flush"),
  v.literal("read"),
  v.literal("generate"),
  v.literal("send"),
  v.literal("done")
);

export const enqueueInbound = internalMutation({
  args: {
    conversationId: v.string(),
    spaceId: v.string(),
    clientGuid: v.string(),
    sourceEventId: v.optional(v.union(v.string(), v.null())),
    authorHandle: v.union(v.string(), v.null()),
    sourceMessageId: v.string(),
    text: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await Pipeline.enqueueInbound(ctx, args);
    return null;
  },
});

export const drainBatch = internalMutation({
  args: { conversationId: v.string() },
  returns: v.array(pipelineMessageDoc),
  handler: async (ctx, { conversationId }) =>
    Pipeline.drainBatch(ctx, conversationId),
});

export const readCarried = internalMutation({
  args: { conversationId: v.string() },
  returns: v.array(pipelineMessageDoc),
  handler: async (ctx, { conversationId }) =>
    Pipeline.readCarried(ctx, conversationId),
});

export const carryForward = internalMutation({
  args: {
    conversationId: v.string(),
    messages: v.array(pipelineMessageDoc),
  },
  returns: v.null(),
  handler: async (ctx, { conversationId, messages }) => {
    await Pipeline.carryForward(ctx, conversationId, messages);
    return null;
  },
});

export const readInflight = internalQuery({
  args: { conversationId: v.string() },
  returns: v.union(inflightChainDoc, v.null()),
  handler: async (ctx, { conversationId }) =>
    Pipeline.readInflight(ctx, conversationId),
});

export const claimChain = internalMutation({
  args: {
    conversationId: v.string(),
    chainId: v.string(),
    chainStartedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await Pipeline.claimChain(ctx, args);
    return null;
  },
});

export const setChainStage = internalMutation({
  args: { conversationId: v.string(), stage: chainStage },
  returns: v.null(),
  handler: async (ctx, { conversationId, stage }) => {
    await Pipeline.setStage(ctx, conversationId, stage);
    return null;
  },
});

export const cancelChain = internalMutation({
  args: { conversationId: v.string(), cancelledAt: v.number() },
  returns: v.null(),
  handler: async (ctx, { conversationId, cancelledAt }) => {
    await Pipeline.cancelChain(ctx, conversationId, cancelledAt);
    return null;
  },
});

export const advanceStartIndex = internalMutation({
  args: {
    conversationId: v.string(),
    startIndex: v.number(),
    sentGuid: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await Pipeline.advanceStartIndex(ctx, args);
    return null;
  },
});

export const listQueuedConversations = internalQuery({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => Pipeline.listQueuedConversations(ctx),
});

export const listOrphanedChains = internalQuery({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => Pipeline.listOrphanedChains(ctx),
});

export const recordJobFailure = internalMutation({
  args: {
    queue: v.string(),
    jobId: v.string(),
    conversationId: v.optional(v.union(v.string(), v.null())),
    payloadJson: v.optional(v.union(v.string(), v.null())),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await JobFailures.record(ctx, args);
    return null;
  },
});

export const sweepJobFailures = internalMutation({
  args: { retentionDays: v.number() },
  returns: v.number(),
  handler: async (ctx, { retentionDays }) =>
    JobFailures.sweep(ctx, retentionDays),
});

export const getAgentMemory = internalQuery({
  args: { resourceId: v.string() },
  returns: v.union(agentMemoryDoc, v.null()),
  handler: async (ctx, { resourceId }) => Memory.get(ctx, resourceId),
});

export const upsertAgentMemory = internalMutation({
  args: { resourceId: v.string(), workingMemory: v.string() },
  returns: v.null(),
  handler: async (ctx, { resourceId, workingMemory }) => {
    await Memory.upsert(ctx, resourceId, workingMemory);
    return null;
  },
});
