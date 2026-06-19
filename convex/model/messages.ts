import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { newId, nowIso } from "../lib/util.js";
import * as Conversations from "./conversations.js";

export type Message = Doc<"messages">;
export type MessageRole = Message["role"];

export async function list(
  ctx: QueryCtx | MutationCtx,
  conversationId: string
): Promise<Message[]> {
  return await ctx.db
    .query("messages")
    .withIndex("by_conversation", (q) =>
      q.eq("conversation_id", conversationId)
    )
    .collect();
}

export async function add(
  ctx: MutationCtx,
  args: {
    conversationId: string;
    role: MessageRole;
    text: string;
    authorHandle?: string | null;
    category?: string | null;
    meta?: Record<string, unknown> | null;
  }
): Promise<Message> {
  const meta = args.meta ?? null;
  const metaKind =
    meta && typeof meta.kind === "string" ? (meta.kind as string) : null;
  const outbound =
    meta && (meta.outbound === "pending" || meta.outbound === "sent")
      ? (meta.outbound as "pending" | "sent")
      : null;
  const id = newId("msg");
  await ctx.db.insert("messages", {
    id,
    conversation_id: args.conversationId,
    role: args.role,
    author_handle: args.authorHandle ?? null,
    text: args.text,
    category: args.category ?? null,
    created_at: nowIso(),
    meta_kind: metaKind,
    outbound,
    meta_json: meta ? JSON.stringify(meta) : null,
  });
  await Conversations.touch(ctx, args.conversationId);
  const created = await ctx.db
    .query("messages")
    .withIndex("by_external_id", (q) => q.eq("id", id))
    .unique();
  if (!created) {
    throw new Error("Failed to create message");
  }
  return created;
}

/**
 * The most recent `limit` messages in a conversation, returned chronologically.
 * Bounds the reactive dashboard read so a long-lived thread can't grow the
 * payload without limit (the agent's machine-path `list` stays full).
 */
export async function listRecent(
  ctx: QueryCtx | MutationCtx,
  conversationId: string,
  limit = 300
): Promise<Message[]> {
  const newestFirst = await ctx.db
    .query("messages")
    .withIndex("by_conversation", (q) =>
      q.eq("conversation_id", conversationId)
    )
    .order("desc")
    .take(limit);
  return newestFirst.reverse();
}

/** The most recent message in a conversation (index-backed, single row). */
export async function last(
  ctx: QueryCtx | MutationCtx,
  conversationId: string
): Promise<Message | null> {
  return await ctx.db
    .query("messages")
    .withIndex("by_conversation", (q) =>
      q.eq("conversation_id", conversationId)
    )
    .order("desc")
    .first();
}

export async function countByRole(
  ctx: QueryCtx | MutationCtx,
  role: MessageRole
): Promise<number> {
  const rows = await ctx.db
    .query("messages")
    .withIndex("by_role", (q) => q.eq("role", role))
    .collect();
  return rows.length;
}

/**
 * Whether a durable latch message (meta.kind) exists for a conversation,
 * optionally only since a timestamp. Index-backed via by_conversation_and_kind.
 */
export async function hasMessageWithMetaKind(
  ctx: QueryCtx | MutationCtx,
  conversationId: string,
  kind: string,
  since?: string | null
): Promise<boolean> {
  const rows = await ctx.db
    .query("messages")
    .withIndex("by_conversation_and_kind", (q) =>
      q.eq("conversation_id", conversationId).eq("meta_kind", kind)
    )
    .collect();
  if (!since) {
    return rows.length > 0;
  }
  return rows.some((m) => m.created_at >= since);
}

export async function enqueueConciergeOutbound(
  ctx: MutationCtx,
  args: { conversationId: string; text: string; authorHandle?: string | null }
): Promise<Message> {
  return await add(ctx, {
    conversationId: args.conversationId,
    role: "concierge",
    authorHandle: args.authorHandle ?? null,
    text: args.text,
    meta: { outbound: "pending" },
  });
}

export async function listPendingOutbound(
  ctx: QueryCtx | MutationCtx
): Promise<Message[]> {
  const rows = await ctx.db
    .query("messages")
    .withIndex("by_outbound", (q) => q.eq("outbound", "pending"))
    .collect();
  return rows
    .filter((m) => m.role === "concierge")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function markOutboundDelivered(
  ctx: MutationCtx,
  messageId: string
): Promise<void> {
  const msg = await ctx.db
    .query("messages")
    .withIndex("by_external_id", (q) => q.eq("id", messageId))
    .unique();
  if (!msg) {
    return;
  }
  await ctx.db.patch(msg._id, { outbound: "sent" });
}
