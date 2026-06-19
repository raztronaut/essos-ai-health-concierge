import type { MutationCtx } from "../_generated/server";
import { nowIso } from "../lib/util.js";

/**
 * Job-failure audit log for the pipeline. A small table that pays back when a
 * stage misbehaves: which chain, when, with what payload, and why. Recording is
 * fail-safe at the call site; a periodic sweep enforces retention.
 */
export async function record(
  ctx: MutationCtx,
  args: {
    queue: string;
    jobId: string;
    conversationId?: string | null;
    payloadJson?: string | null;
    error: string;
  }
): Promise<void> {
  await ctx.db.insert("job_failures", {
    queue: args.queue,
    job_id: args.jobId,
    conversation_id: args.conversationId ?? null,
    payload_json: args.payloadJson ?? null,
    error: args.error,
    created_at: nowIso(),
  });
}

const MS_PER_DAY = 86_400_000;

/** Delete failures older than `retentionDays`; returns how many were removed. */
export async function sweep(
  ctx: MutationCtx,
  retentionDays: number
): Promise<number> {
  const cutoff = new Date(
    Date.now() - retentionDays * MS_PER_DAY
  ).toISOString();
  const old = await ctx.db
    .query("job_failures")
    .withIndex("by_created", (q) => q.lt("created_at", cutoff))
    .collect();
  for (const row of old) {
    await ctx.db.delete(row._id);
  }
  return old.length;
}
