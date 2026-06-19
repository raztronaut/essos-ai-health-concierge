import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Concierge, Scope } from "./lib/functions.js";
import { conciergeMutation, effectiveScope } from "./lib/functions.js";
import * as Conversations from "./model/conversations.js";
import * as Escalations from "./model/escalations.js";
import * as Messages from "./model/messages.js";
import * as Patients from "./model/patients.js";

/**
 * Public, Clerk-gated dashboard mutations. The signed-in concierge is resolved
 * by `conciergeMutation` and stamped as the actor/assignee (both the display
 * `label` and the stable `clerkId`) — this is what retires the old hardcoded
 * `ASSIGNEE = "dashboard"`. Members can only act on patients they own or that
 * are unassigned; leads (`org:admin`) can act on anything.
 *
 * In demo mode the optional `viewAs` lets the dashboard act as another concierge
 * (see `effectiveScope`); it is ignored when `ESSOS_DEMO_MODE` is off.
 */

type CtxWithConcierge = MutationCtx & { concierge: Concierge };

/** Optional demo-only "view as" override (a Clerk user id). */
const viewAsArg = { viewAs: v.optional(v.union(v.string(), v.null())) };

async function assertConversationAccess(
  ctx: CtxWithConcierge,
  conversationId: string,
  scope: Scope
): Promise<void> {
  const conv = await Conversations.getByExternalId(ctx, conversationId);
  if (!conv) {
    return;
  }
  if (!Patients.canAccess({ assignee_user_id: conv.assignee_user_id }, scope)) {
    throw new Error("Not authorized for this conversation");
  }
}

export const resolveEscalation = conciergeMutation({
  args: { escalationId: v.string(), ...viewAsArg },
  returns: v.null(),
  handler: async (ctx, { escalationId, viewAs }) => {
    const scope = await effectiveScope(ctx, ctx.concierge, viewAs);
    const escalation = await Escalations.getByExternalId(ctx, escalationId);
    if (escalation) {
      await assertConversationAccess(ctx, escalation.conversation_id, scope);
    }
    await Escalations.resolve(ctx, escalationId, scope.label, scope.clerkId);
    return null;
  },
});

export const takeOverConversation = conciergeMutation({
  args: { conversationId: v.string(), ...viewAsArg },
  returns: v.null(),
  handler: async (ctx, { conversationId, viewAs }) => {
    const scope = await effectiveScope(ctx, ctx.concierge, viewAs);
    await assertConversationAccess(ctx, conversationId, scope);
    await Escalations.markConciergeTakeover(
      ctx,
      conversationId,
      scope.label,
      scope.clerkId
    );
    return null;
  },
});

export const resumeAutomation = conciergeMutation({
  args: { conversationId: v.string(), ...viewAsArg },
  returns: v.null(),
  handler: async (ctx, { conversationId, viewAs }) => {
    const scope = await effectiveScope(ctx, ctx.concierge, viewAs);
    await assertConversationAccess(ctx, conversationId, scope);
    await Escalations.resumeAutomation(ctx, conversationId, scope.label);
    return null;
  },
});

/**
 * Compose the patient-facing signature appended to every concierge reply. A
 * named agent signs "— {name}, Essos Care Team"; an unsigned reply falls back to
 * the team signature so the patient always sees a human, branded sign-off.
 */
function composeConciergeReply(text: string, agentName: string): string {
  const signature = agentName
    ? `— ${agentName}, Essos Care Team`
    : "— Essos Care Team";
  return `${text}\n\n${signature}`;
}

/**
 * Concierge reply authored in the dashboard: queue for the transport to deliver
 * to the patient, and mark the thread taken over so Eve stays paused. The reply
 * is signed with the concierge's name (or the team) before delivery.
 */
export const sendConciergeReply = conciergeMutation({
  args: {
    conversationId: v.string(),
    text: v.string(),
    agentName: v.optional(v.union(v.string(), v.null())),
    ...viewAsArg,
  },
  returns: v.null(),
  handler: async (ctx, { conversationId, text, agentName, viewAs }) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return null;
    }
    const scope = await effectiveScope(ctx, ctx.concierge, viewAs);
    await assertConversationAccess(ctx, conversationId, scope);
    const signedName = (agentName ?? "").trim();
    const composed = composeConciergeReply(trimmed, signedName);
    await Messages.enqueueConciergeOutbound(ctx, {
      conversationId,
      text: composed,
      authorHandle: signedName || scope.label,
    });
    await Escalations.markConciergeTakeover(
      ctx,
      conversationId,
      scope.label,
      scope.clerkId
    );
    return null;
  },
});

/**
 * Assign (or unassign) a patient's owning concierge. Leads can assign to anyone;
 * members may only self-claim a currently-unassigned patient.
 */
export const assignPatient = conciergeMutation({
  args: {
    patientId: v.string(),
    assigneeUserId: v.union(v.string(), v.null()),
    ...viewAsArg,
  },
  returns: v.null(),
  handler: async (ctx, { patientId, assigneeUserId, viewAs }) => {
    const scope = await effectiveScope(ctx, ctx.concierge, viewAs);
    const patient = await Patients.getByExternalId(ctx, patientId);
    if (!patient) {
      throw new Error("Patient not found");
    }
    if (!scope.isLead) {
      const selfClaim =
        patient.assignee_user_id === null && assigneeUserId === scope.clerkId;
      if (!selfClaim) {
        throw new Error("Only a team lead can reassign patients");
      }
    }
    await Patients.assign(ctx, patientId, assigneeUserId);
    return null;
  },
});

/** Upsert the signed-in Clerk user (called on first dashboard load). */
export const storeUser = conciergeMutation({
  args: {},
  returns: v.null(),
  handler: async () => {
    // The conciergeMutation custom ctx already upserts the user; nothing else.
    return null;
  },
});
