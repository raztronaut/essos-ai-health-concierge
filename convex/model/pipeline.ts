import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { nowIso } from "../lib/util.js";

/**
 * Durable substrate for the five-stage inbound pipeline (see ADR 020).
 *
 * `batch_queue` accumulates inbound messages during the debounce window;
 * `carried_messages` holds rows a cancelled chain had already drained so the
 * next chain still sees them; `inflight_chains` is the single per-conversation
 * record used for cancellation and send-resume. All three are bounded per
 * conversation, so full reads here are safe.
 */
export interface PipelineMessage {
  author_handle: string | null;
  client_guid: string;
  created_at: string;
  source_message_id: string;
  text: string;
}

export type ChainStage = Doc<"inflight_chains">["stage"];

function toPipelineMessage(
  row: Doc<"batch_queue"> | Doc<"carried_messages">
): PipelineMessage {
  return {
    client_guid: row.client_guid,
    author_handle: row.author_handle,
    source_message_id: row.source_message_id,
    text: row.text,
    created_at: row.created_at,
  };
}

// --------------------------- batch_queue ---------------------------

export async function enqueueInbound(
  ctx: MutationCtx,
  args: {
    conversationId: string;
    spaceId: string;
    clientGuid: string;
    authorHandle: string | null;
    sourceMessageId: string;
    text: string;
  }
): Promise<void> {
  await ctx.db.insert("batch_queue", {
    conversation_id: args.conversationId,
    space_id: args.spaceId,
    client_guid: args.clientGuid,
    author_handle: args.authorHandle,
    source_message_id: args.sourceMessageId,
    text: args.text,
    created_at: nowIso(),
  });
}

/** Read + delete all queued rows for a conversation, oldest first. */
export async function drainBatch(
  ctx: MutationCtx,
  conversationId: string
): Promise<PipelineMessage[]> {
  const rows = await ctx.db
    .query("batch_queue")
    .withIndex("by_conversation", (q) =>
      q.eq("conversation_id", conversationId)
    )
    .collect();
  rows.sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.map(toPipelineMessage);
}

// --------------------------- carried_messages ---------------------------

/** Read + clear carried rows for a conversation, oldest first. */
export async function readCarried(
  ctx: MutationCtx,
  conversationId: string
): Promise<PipelineMessage[]> {
  const rows = await ctx.db
    .query("carried_messages")
    .withIndex("by_conversation", (q) =>
      q.eq("conversation_id", conversationId)
    )
    .collect();
  rows.sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.map(toPipelineMessage);
}

export async function carryForward(
  ctx: MutationCtx,
  conversationId: string,
  messages: PipelineMessage[]
): Promise<void> {
  const carriedAt = nowIso();
  for (const m of messages) {
    await ctx.db.insert("carried_messages", {
      conversation_id: conversationId,
      client_guid: m.client_guid,
      author_handle: m.author_handle,
      source_message_id: m.source_message_id,
      text: m.text,
      created_at: m.created_at,
      carried_at: carriedAt,
    });
  }
}

// --------------------------- inflight_chains ---------------------------

export async function readInflight(
  ctx: QueryCtx | MutationCtx,
  conversationId: string
): Promise<Doc<"inflight_chains"> | null> {
  return await ctx.db
    .query("inflight_chains")
    .withIndex("by_conversation", (q) =>
      q.eq("conversation_id", conversationId)
    )
    .unique();
}

/** Begin a fresh chain: resets the cancel flag and send cursor (single row). */
export async function claimChain(
  ctx: MutationCtx,
  args: { conversationId: string; chainId: string; chainStartedAt: number }
): Promise<void> {
  const existing = await readInflight(ctx, args.conversationId);
  const fields = {
    chain_id: args.chainId,
    chain_started_at: args.chainStartedAt,
    stage: "flush" as const,
    cancelled_at: null,
    start_index: 0,
    sent_guids: [] as string[],
    updated_at: nowIso(),
  };
  if (existing) {
    await ctx.db.patch(existing._id, fields);
  } else {
    await ctx.db.insert("inflight_chains", {
      conversation_id: args.conversationId,
      ...fields,
    });
  }
}

export async function setStage(
  ctx: MutationCtx,
  conversationId: string,
  stage: ChainStage
): Promise<void> {
  const chain = await readInflight(ctx, conversationId);
  if (chain) {
    await ctx.db.patch(chain._id, { stage, updated_at: nowIso() });
  }
}

export async function cancelChain(
  ctx: MutationCtx,
  conversationId: string,
  cancelledAt: number
): Promise<void> {
  const chain = await readInflight(ctx, conversationId);
  if (chain) {
    await ctx.db.patch(chain._id, {
      cancelled_at: cancelledAt,
      updated_at: nowIso(),
    });
  }
}

/** Persist the send-resume cursor after a bubble is delivered. */
export async function advanceStartIndex(
  ctx: MutationCtx,
  args: { conversationId: string; startIndex: number; sentGuid: string }
): Promise<void> {
  const chain = await readInflight(ctx, args.conversationId);
  if (!chain) {
    return;
  }
  await ctx.db.patch(chain._id, {
    start_index: args.startIndex,
    sent_guids: [...chain.sent_guids, args.sentGuid],
    updated_at: nowIso(),
  });
}

// --------------------------- recovery ---------------------------

/** Conversation ids with queued or carried rows (need a re-armed chain). */
export async function listQueuedConversations(
  ctx: QueryCtx
): Promise<string[]> {
  const queued = await ctx.db.query("batch_queue").collect();
  const carried = await ctx.db.query("carried_messages").collect();
  return [...new Set([...queued, ...carried].map((r) => r.conversation_id))];
}

/** Conversation ids whose chain a crash left non-terminal (stage != done). */
export async function listOrphanedChains(ctx: QueryCtx): Promise<string[]> {
  const rows = await ctx.db.query("inflight_chains").collect();
  return rows.filter((r) => r.stage !== "done").map((r) => r.conversation_id);
}
