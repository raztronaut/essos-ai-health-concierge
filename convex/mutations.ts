import { v } from "convex/values";
import { conciergeMutation } from "./lib/functions.js";
import * as Escalations from "./model/escalations.js";
import * as Messages from "./model/messages.js";

/**
 * Public, Clerk-gated dashboard mutations. The signed-in concierge is resolved
 * by `conciergeMutation` and stamped as the actor/assignee — this is what
 * retires the old hardcoded `ASSIGNEE = "dashboard"`.
 */

export const resolveEscalation = conciergeMutation({
  args: { escalationId: v.string() },
  handler: async (ctx, { escalationId }) => {
    await Escalations.resolve(ctx, escalationId, ctx.concierge.label);
  },
});

export const takeOverConversation = conciergeMutation({
  args: { conversationId: v.string() },
  handler: async (ctx, { conversationId }) => {
    await Escalations.markConciergeTakeover(
      ctx,
      conversationId,
      ctx.concierge.label,
    );
  },
});

export const resumeAutomation = conciergeMutation({
  args: { conversationId: v.string() },
  handler: async (ctx, { conversationId }) => {
    await Escalations.resumeAutomation(ctx, conversationId, ctx.concierge.label);
  },
});

/**
 * Concierge reply authored in the dashboard: queue for the transport to deliver
 * to the patient, and mark the thread taken over so Eve stays paused.
 */
export const sendConciergeReply = conciergeMutation({
  args: { conversationId: v.string(), text: v.string() },
  handler: async (ctx, { conversationId, text }) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    await Messages.enqueueConciergeOutbound(ctx, {
      conversationId,
      text: trimmed,
      authorHandle: ctx.concierge.label,
    });
    await Escalations.markConciergeTakeover(
      ctx,
      conversationId,
      ctx.concierge.label,
    );
  },
});

/** Upsert the signed-in Clerk user (called on first dashboard load). */
export const storeUser = conciergeMutation({
  args: {},
  handler: async () => {
    // The conciergeMutation custom ctx already upserts the user; nothing else.
    return null;
  },
});
