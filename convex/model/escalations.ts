import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { newId, normalizedEditDistance, nowIso } from "../lib/util.js";
import * as Activity from "./activity.js";
import * as Conversations from "./conversations.js";

export type Escalation = Doc<"escalations">;
export type EscalationStatus = Escalation["status"];
export type EscalationLevel = Escalation["level"];

export async function create(
  ctx: MutationCtx,
  args: {
    conversationId: string;
    patientId: string;
    level: EscalationLevel;
    reason: string;
    summary: string;
    sourceMessageId?: string | null;
    suggestedReply?: string | null;
    suggestedReplySources?: string[] | null;
  }
): Promise<Escalation> {
  const id = newId("esc");
  await ctx.db.insert("escalations", {
    id,
    conversation_id: args.conversationId,
    patient_id: args.patientId,
    level: args.level,
    reason: args.reason,
    summary: args.summary,
    source_message_id: args.sourceMessageId ?? null,
    status: "open",
    assignee: null,
    assignee_user_id: null,
    created_at: nowIso(),
    resolved_at: null,
    suggested_reply: args.suggestedReply ?? null,
    suggested_reply_sources:
      args.suggestedReplySources && args.suggestedReplySources.length > 0
        ? JSON.stringify(args.suggestedReplySources)
        : null,
    feedback_valid: null,
    feedback_note: null,
    feedback_by: null,
    feedback_at: null,
    draft_edit_distance: null,
  });
  const created = await ctx.db
    .query("escalations")
    .withIndex("by_external_id", (q) => q.eq("id", id))
    .unique();
  if (!created) {
    throw new Error("Failed to create escalation");
  }
  return created;
}

export async function getByExternalId(
  ctx: QueryCtx | MutationCtx,
  id: string
): Promise<Escalation | null> {
  return await ctx.db
    .query("escalations")
    .withIndex("by_external_id", (q) => q.eq("id", id))
    .unique();
}

export async function listByStatus(
  ctx: QueryCtx | MutationCtx,
  status?: EscalationStatus
): Promise<Escalation[]> {
  if (status) {
    return await ctx.db
      .query("escalations")
      .withIndex("by_status", (q) => q.eq("status", status))
      .order("desc")
      .collect();
  }
  return await ctx.db.query("escalations").order("desc").collect();
}

export async function listForConversation(
  ctx: QueryCtx | MutationCtx,
  conversationId: string
): Promise<Escalation[]> {
  return await ctx.db
    .query("escalations")
    .withIndex("by_conversation", (q) =>
      q.eq("conversation_id", conversationId)
    )
    .order("desc")
    .collect();
}

export async function listOpenForConversation(
  ctx: QueryCtx | MutationCtx,
  conversationId: string
): Promise<Escalation[]> {
  const all = await listForConversation(ctx, conversationId);
  return all.filter((e) => e.status === "open");
}

export async function takeOver(
  ctx: MutationCtx,
  id: string,
  assignee: string,
  assigneeUserId?: string | null
): Promise<void> {
  const esc = await ctx.db
    .query("escalations")
    .withIndex("by_external_id", (q) => q.eq("id", id))
    .unique();
  if (!esc) {
    return;
  }
  await ctx.db.patch(esc._id, {
    status: "taken_over",
    assignee,
    assignee_user_id: assigneeUserId ?? esc.assignee_user_id ?? null,
  });
}

export async function resolve(
  ctx: MutationCtx,
  id: string,
  assignee?: string,
  assigneeUserId?: string | null
): Promise<void> {
  const esc = await ctx.db
    .query("escalations")
    .withIndex("by_external_id", (q) => q.eq("id", id))
    .unique();
  if (!esc) {
    return;
  }
  await ctx.db.patch(esc._id, {
    status: "resolved",
    resolved_at: nowIso(),
    assignee: assignee ?? esc.assignee,
    assignee_user_id: assigneeUserId ?? esc.assignee_user_id ?? null,
  });

  // Resolving the last open flag on an Eve-paused thread restores service.
  // Otherwise the conversation stays `paused_for_review` and the transport's
  // holding-notice latch silently drops every later patient message (a black
  // hole). A human `taken_over` thread stays manual: the concierge owns it and
  // resumes explicitly (or via Resolve + Resume).
  const stillOpen = await listOpenForConversation(ctx, esc.conversation_id);
  if (stillOpen.length === 0) {
    const conv = await Conversations.getByExternalId(ctx, esc.conversation_id);
    if (conv?.automation_state === "paused_for_review") {
      await Conversations.setAutomationState(
        ctx,
        esc.conversation_id,
        "active"
      );
      await Activity.log(ctx, {
        conversationId: esc.conversation_id,
        event: "resumed",
        actor: assignee ?? "system",
        detail: "Escalation resolved — Eve automation resumed.",
      });
    }
  }
}

/**
 * Resolve every open/taken-over flag on a conversation and resume Eve in one
 * step — the "Resolve + Resume" action. Use when a concierge is done handling a
 * thread (whether Eve auto-paused or a human took it over) and wants automation
 * back on immediately.
 */
export async function resolveAndResume(
  ctx: MutationCtx,
  conversationId: string,
  actor: string,
  actorUserId?: string | null
): Promise<void> {
  const open = await listForConversation(ctx, conversationId);
  for (const escalation of open) {
    if (escalation.status !== "resolved") {
      await resolve(ctx, escalation.id, actor, actorUserId);
    }
  }
  await resumeAutomation(ctx, conversationId, actor);
}

/**
 * Record the human verdict on whether an escalation was necessary (ADR 022).
 * This is the gold label that turns over-escalation from a vibe into a number;
 * it is intentionally decoupled from `resolve` so a concierge can label a flag
 * at any time without changing its lifecycle.
 */
export async function setFeedback(
  ctx: MutationCtx,
  id: string,
  args: { valid: boolean; note?: string | null; by: string }
): Promise<void> {
  const esc = await getByExternalId(ctx, id);
  if (!esc) {
    return;
  }
  await ctx.db.patch(esc._id, {
    feedback_valid: args.valid,
    feedback_note: args.note ?? null,
    feedback_by: args.by,
    feedback_at: nowIso(),
  });
}

/**
 * When a concierge sends a reply, record how much they changed Eve's draft
 * (ADR 022). Finds the most recent open escalation on the conversation that
 * carried a `suggested_reply` and stores the normalized edit distance between
 * that draft and the (unsigned) sent text. No-op when there's no drafted flag.
 */
export async function recordDraftEdit(
  ctx: MutationCtx,
  conversationId: string,
  sentText: string
): Promise<void> {
  const open = await listOpenForConversation(ctx, conversationId);
  const drafted = open.find((e) => e.suggested_reply?.trim());
  if (!drafted?.suggested_reply) {
    return;
  }
  await ctx.db.patch(drafted._id, {
    draft_edit_distance: normalizedEditDistance(
      drafted.suggested_reply.trim(),
      sentText.trim()
    ),
  });
}

/** Human takes over a thread: open escalations -> taken_over, automation paused. */
export async function markConciergeTakeover(
  ctx: MutationCtx,
  conversationId: string,
  assignee: string,
  assigneeUserId?: string | null
): Promise<void> {
  const open = await listOpenForConversation(ctx, conversationId);
  for (const escalation of open) {
    await takeOver(ctx, escalation.id, assignee, assigneeUserId);
  }
  await Conversations.setAutomationState(ctx, conversationId, "taken_over");
  await Activity.log(ctx, {
    conversationId,
    event: "taken_over",
    actor: assignee,
    detail: "Human concierge replied during an open escalation.",
  });
}

export async function resumeAutomation(
  ctx: MutationCtx,
  conversationId: string,
  actor: string
): Promise<void> {
  await Conversations.setAutomationState(ctx, conversationId, "active");
  await Activity.log(ctx, {
    conversationId,
    event: "resumed",
    actor,
    detail: "Human concierge resumed Eve automation.",
  });
}
