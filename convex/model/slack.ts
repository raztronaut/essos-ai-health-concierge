import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { newId, nowIso } from "../lib/util.js";

/**
 * Slack concierge bridge model.
 *
 * `slack_outbox` is a delivery queue the Slack service drains (mirroring the
 * concierge-reply outbound pattern on `messages`). `slack_links` records the
 * Slack thread created for a conversation so later activity and patient
 * messages thread under the original escalation card.
 *
 * Enqueue is a no-op unless `SLACK_ENABLED` is set, and activity/patient
 * messages only enqueue once a thread exists (an escalation was already posted)
 * so Slack stays focused on escalated threads — one thread per escalation.
 */

export type SlackOutbox = Doc<"slack_outbox">;
export type SlackLink = Doc<"slack_links">;
export type SlackOutboxKind = SlackOutbox["kind"];

/** Activity events worth a threaded progress update (escalated is the card itself). */
const ACTIVITY_NOTIFY = new Set([
  "taken_over",
  "resolved",
  "resumed",
  "reminder",
]);

function slackEnabled(): boolean {
  const flag = process.env.SLACK_ENABLED;
  return flag === "1" || flag === "true";
}

// ----------------------------- Links -----------------------------

export async function getLinkByConversation(
  ctx: QueryCtx | MutationCtx,
  conversationId: string
): Promise<SlackLink | null> {
  return await ctx.db
    .query("slack_links")
    .withIndex("by_conversation", (q) =>
      q.eq("conversation_id", conversationId)
    )
    .first();
}

export async function getLinkByThread(
  ctx: QueryCtx | MutationCtx,
  threadTs: string
): Promise<SlackLink | null> {
  return await ctx.db
    .query("slack_links")
    .withIndex("by_thread", (q) => q.eq("thread_ts", threadTs))
    .unique();
}

export async function upsertLink(
  ctx: MutationCtx,
  args: {
    conversationId: string;
    escalationId?: string | null;
    channelId: string;
    threadTs: string;
  }
): Promise<void> {
  const existing = await getLinkByConversation(ctx, args.conversationId);
  if (existing) {
    await ctx.db.patch(existing._id, {
      escalation_id: args.escalationId ?? existing.escalation_id ?? null,
      channel_id: args.channelId,
      thread_ts: args.threadTs,
    });
    return;
  }
  await ctx.db.insert("slack_links", {
    conversation_id: args.conversationId,
    escalation_id: args.escalationId ?? null,
    channel_id: args.channelId,
    thread_ts: args.threadTs,
    created_at: nowIso(),
  });
}

// ----------------------------- Outbox -----------------------------

async function insertOutbox(
  ctx: MutationCtx,
  args: {
    kind: SlackOutboxKind;
    conversationId: string;
    escalationId?: string | null;
    payload?: Record<string, unknown> | null;
  }
): Promise<void> {
  await ctx.db.insert("slack_outbox", {
    id: newId("sout"),
    kind: args.kind,
    conversation_id: args.conversationId,
    escalation_id: args.escalationId ?? null,
    payload_json: args.payload ? JSON.stringify(args.payload) : null,
    status: "pending",
    slack_ts: null,
    created_at: nowIso(),
  });
}

/** Queue the escalation card. Always enqueues (this row creates the thread). */
export async function enqueueEscalation(
  ctx: MutationCtx,
  args: { conversationId: string; escalationId: string }
): Promise<void> {
  if (!slackEnabled()) {
    return;
  }
  await insertOutbox(ctx, {
    kind: "escalation",
    conversationId: args.conversationId,
    escalationId: args.escalationId,
  });
}

/** Queue a threaded progress update — only for linked, escalated threads. */
export async function enqueueActivity(
  ctx: MutationCtx,
  args: {
    conversationId: string;
    event: string;
    actor: string;
    detail?: string | null;
  }
): Promise<void> {
  if (!slackEnabled()) {
    return;
  }
  if (!ACTIVITY_NOTIFY.has(args.event)) {
    return;
  }
  const link = await getLinkByConversation(ctx, args.conversationId);
  if (!link) {
    return;
  }
  await insertOutbox(ctx, {
    kind: "activity",
    conversationId: args.conversationId,
    escalationId: link.escalation_id,
    payload: {
      event: args.event,
      actor: args.actor,
      detail: args.detail ?? null,
    },
  });
}

/** Mirror an inbound patient message into the Slack thread (if linked). */
export async function enqueuePatientMessage(
  ctx: MutationCtx,
  args: { conversationId: string; text: string; authorHandle?: string | null }
): Promise<void> {
  if (!slackEnabled()) {
    return;
  }
  const link = await getLinkByConversation(ctx, args.conversationId);
  if (!link) {
    return;
  }
  await insertOutbox(ctx, {
    kind: "patient_message",
    conversationId: args.conversationId,
    escalationId: link.escalation_id,
    payload: { text: args.text, authorHandle: args.authorHandle ?? null },
  });
}

export async function listPending(
  ctx: QueryCtx | MutationCtx
): Promise<SlackOutbox[]> {
  const rows = await ctx.db
    .query("slack_outbox")
    .withIndex("by_status", (q) => q.eq("status", "pending"))
    .collect();
  return rows.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function markPosted(
  ctx: MutationCtx,
  id: string,
  slackTs: string
): Promise<void> {
  const row = await ctx.db
    .query("slack_outbox")
    .withIndex("by_external_id", (q) => q.eq("id", id))
    .unique();
  if (!row) {
    return;
  }
  await ctx.db.patch(row._id, { status: "posted", slack_ts: slackTs });
}
