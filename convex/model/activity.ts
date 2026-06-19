import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { newId, nowIso } from "../lib/util.js";

export type ActivityLogEntry = Doc<"activity_log">;
export type ActivityEvent = ActivityLogEntry["event"];

export async function log(
  ctx: MutationCtx,
  args: {
    conversationId: string;
    event: ActivityEvent;
    actor: string;
    detail?: string | null;
  },
): Promise<ActivityLogEntry> {
  const id = newId("act");
  await ctx.db.insert("activity_log", {
    id,
    conversation_id: args.conversationId,
    event: args.event,
    actor: args.actor,
    detail: args.detail ?? null,
    created_at: nowIso(),
  });
  const created = await ctx.db
    .query("activity_log")
    .withIndex("by_external_id", (q) => q.eq("id", id))
    .unique();
  if (!created) throw new Error("Failed to create activity entry");
  return created;
}

export async function listForConversation(
  ctx: QueryCtx | MutationCtx,
  conversationId: string,
): Promise<ActivityLogEntry[]> {
  return await ctx.db
    .query("activity_log")
    .withIndex("by_conversation", (q) => q.eq("conversation_id", conversationId))
    .collect();
}

export async function listAll(
  ctx: QueryCtx | MutationCtx,
  limit = 200,
): Promise<ActivityLogEntry[]> {
  return await ctx.db
    .query("activity_log")
    .withIndex("by_created")
    .order("desc")
    .take(limit);
}

export async function countByEvent(
  ctx: QueryCtx | MutationCtx,
  event: ActivityEvent,
): Promise<number> {
  const rows = await ctx.db
    .query("activity_log")
    .withIndex("by_event", (q) => q.eq("event", event))
    .collect();
  return rows.length;
}
