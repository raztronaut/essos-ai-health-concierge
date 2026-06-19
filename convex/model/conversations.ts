import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { newId, nowIso } from "../lib/util.js";

export type Conversation = Doc<"conversations">;

export async function getByExternalId(
  ctx: QueryCtx | MutationCtx,
  id: string
): Promise<Conversation | null> {
  return await ctx.db
    .query("conversations")
    .withIndex("by_external_id", (q) => q.eq("id", id))
    .unique();
}

export async function getBySpace(
  ctx: QueryCtx | MutationCtx,
  spaceId: string
): Promise<Conversation | null> {
  return await ctx.db
    .query("conversations")
    .withIndex("by_space", (q) => q.eq("space_id", spaceId))
    .unique();
}

export async function getByPatient(
  ctx: QueryCtx | MutationCtx,
  patientId: string
): Promise<Conversation | null> {
  return await ctx.db
    .query("conversations")
    .withIndex("by_patient", (q) => q.eq("patient_id", patientId))
    .order("desc")
    .first();
}

export async function list(
  ctx: QueryCtx | MutationCtx
): Promise<Conversation[]> {
  const rows = await ctx.db
    .query("conversations")
    .withIndex("by_updated")
    .order("desc")
    .collect();
  return rows;
}

export async function ensure(
  ctx: MutationCtx,
  args: { spaceId: string; patientId: string; channel: "terminal" | "imessage" }
): Promise<Conversation> {
  const existing = await getBySpace(ctx, args.spaceId);
  if (existing) {
    return existing;
  }
  const ts = nowIso();
  const id = newId("conv");
  // Inherit the owning concierge from the patient so a new thread lands in the
  // right person's queue from the first message.
  const patient = await ctx.db
    .query("patients")
    .withIndex("by_external_id", (q) => q.eq("id", args.patientId))
    .unique();
  await ctx.db.insert("conversations", {
    id,
    patient_id: args.patientId,
    space_id: args.spaceId,
    channel: args.channel,
    automation_state: "active",
    eve_session: null,
    assignee_user_id: patient?.assignee_user_id ?? null,
    created_at: ts,
    updated_at: ts,
  });
  const created = await getByExternalId(ctx, id);
  if (!created) {
    throw new Error("Failed to create conversation");
  }
  return created;
}

export async function setAutomationState(
  ctx: MutationCtx,
  conversationId: string,
  state: Conversation["automation_state"]
): Promise<void> {
  const conv = await getByExternalId(ctx, conversationId);
  if (!conv) {
    return;
  }
  await ctx.db.patch(conv._id, {
    automation_state: state,
    updated_at: nowIso(),
  });
}

export async function touch(
  ctx: MutationCtx,
  conversationId: string
): Promise<void> {
  const conv = await getByExternalId(ctx, conversationId);
  if (!conv) {
    return;
  }
  await ctx.db.patch(conv._id, { updated_at: nowIso() });
}

export async function saveEveSession(
  ctx: MutationCtx,
  conversationId: string,
  session: { sessionId: string; continuationToken: string; turns: number }
): Promise<void> {
  const conv = await getByExternalId(ctx, conversationId);
  if (!conv) {
    return;
  }
  await ctx.db.patch(conv._id, { eve_session: JSON.stringify(session) });
}

export async function getEveSession(
  ctx: QueryCtx | MutationCtx,
  conversationId: string
): Promise<{
  sessionId: string;
  continuationToken: string;
  turns: number;
} | null> {
  const conv = await getByExternalId(ctx, conversationId);
  if (!conv?.eve_session) {
    return null;
  }
  try {
    return JSON.parse(conv.eve_session) as {
      sessionId: string;
      continuationToken: string;
      turns: number;
    };
  } catch {
    return null;
  }
}
