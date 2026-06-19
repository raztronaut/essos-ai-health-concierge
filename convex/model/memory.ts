import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { nowIso } from "../lib/util.js";

/**
 * Per-resource agent memory. Keyed by the person (sender handle), distinct from
 * the per-conversation thread, so the agent remembers who someone is across all
 * of their conversations. The agent writes notes via a tool; the transport
 * injects them into the next turn's context.
 */
export async function get(
  ctx: QueryCtx | MutationCtx,
  resourceId: string
): Promise<Doc<"agent_memory"> | null> {
  return await ctx.db
    .query("agent_memory")
    .withIndex("by_resource", (q) => q.eq("resource_id", resourceId))
    .unique();
}

export async function upsert(
  ctx: MutationCtx,
  resourceId: string,
  workingMemory: string
): Promise<void> {
  const existing = await get(ctx, resourceId);
  if (existing) {
    await ctx.db.patch(existing._id, {
      working_memory: workingMemory,
      updated_at: nowIso(),
    });
  } else {
    await ctx.db.insert("agent_memory", {
      resource_id: resourceId,
      working_memory: workingMemory,
      updated_at: nowIso(),
    });
  }
}
