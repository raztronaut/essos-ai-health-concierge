import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { newId, nowIso } from "../lib/util.js";
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
    created_at: nowIso(),
    resolved_at: null,
    suggested_reply: args.suggestedReply ?? null,
    suggested_reply_sources:
      args.suggestedReplySources && args.suggestedReplySources.length > 0
        ? JSON.stringify(args.suggestedReplySources)
        : null,
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
  assignee: string
): Promise<void> {
  const esc = await ctx.db
    .query("escalations")
    .withIndex("by_external_id", (q) => q.eq("id", id))
    .unique();
  if (!esc) {
    return;
  }
  await ctx.db.patch(esc._id, { status: "taken_over", assignee });
}

export async function resolve(
  ctx: MutationCtx,
  id: string,
  assignee?: string
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
  });
}

/** Human takes over a thread: open escalations -> taken_over, automation paused. */
export async function markConciergeTakeover(
  ctx: MutationCtx,
  conversationId: string,
  assignee: string
): Promise<void> {
  const open = await listOpenForConversation(ctx, conversationId);
  for (const escalation of open) {
    await takeOver(ctx, escalation.id, assignee);
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
