import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { nowIso } from "../lib/util.js";

export type AgentTurn = Doc<"agent_turns">;

export async function record(
  ctx: MutationCtx,
  args: {
    conversationId: string;
    patientId?: string | null;
    latencyMs: number;
    toolCalls: string[];
    finishReason?: string | null;
    promptTokens?: number | null;
    completionTokens?: number | null;
    totalTokens?: number | null;
    escalated: boolean;
    category?: string | null;
    ok: boolean;
    error?: string | null;
  }
): Promise<void> {
  await ctx.db.insert("agent_turns", {
    conversation_id: args.conversationId,
    patient_id: args.patientId ?? null,
    latency_ms: args.latencyMs,
    tool_calls: args.toolCalls,
    tool_call_count: args.toolCalls.length,
    finish_reason: args.finishReason ?? null,
    prompt_tokens: args.promptTokens ?? null,
    completion_tokens: args.completionTokens ?? null,
    total_tokens: args.totalTokens ?? null,
    escalated: args.escalated,
    category: args.category ?? null,
    ok: args.ok,
    error: args.error ?? null,
    created_at: nowIso(),
  });
}

export async function listSince(
  ctx: QueryCtx | MutationCtx,
  since: string
): Promise<AgentTurn[]> {
  return await ctx.db
    .query("agent_turns")
    .withIndex("by_created", (q) => q.gte("created_at", since))
    .collect();
}

export async function listForConversation(
  ctx: QueryCtx | MutationCtx,
  conversationId: string
): Promise<AgentTurn[]> {
  return await ctx.db
    .query("agent_turns")
    .withIndex("by_conversation", (q) =>
      q.eq("conversation_id", conversationId)
    )
    .collect();
}
