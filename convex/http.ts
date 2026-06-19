import type { FunctionReference } from "convex/server";
import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

/**
 * Machine path for the trusted Eve agent + Spectrum transport.
 *
 * They have no Clerk identity, so they POST to `/machine` with
 * `{ fn, args }` and an `Authorization: Bearer $CONVEX_SERVICE_SECRET` header.
 * The endpoint dispatches to a whitelist of `internal*` functions. This keeps
 * the public Convex API Clerk-gated while giving backends a single auth'd door.
 *
 * Set the secret with: `npx convex env set CONVEX_SERVICE_SECRET <value>` and
 * the same value as `CONVEX_SERVICE_SECRET` in the repo `.env`. When unset
 * (local anonymous dev) the endpoint is open for convenience.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRef = FunctionReference<any, any, any, any>;

const QUERIES: Record<string, AnyRef> = {
  getConversationBySpace: internal.machine.getConversationBySpace,
  getConversationById: internal.machine.getConversationById,
  listConversations: internal.machine.listConversations,
  getEveSession: internal.machine.getEveSession,
  getPatientById: internal.machine.getPatientById,
  getPatientByHandle: internal.machine.getPatientByHandle,
  listPatients: internal.machine.listPatients,
  listItinerary: internal.machine.listItinerary,
  listCareInstructions: internal.machine.listCareInstructions,
  listMessages: internal.machine.listMessages,
  listOpenEscalationsForConversation:
    internal.machine.listOpenEscalationsForConversation,
  hasMessageWithMetaKind: internal.machine.hasMessageWithMetaKind,
  listPendingOutbound: internal.machine.listPendingOutbound,
  listPendingSlackOutbox: internal.machine.listPendingSlackOutbox,
  getSlackLinkByConversation: internal.machine.getSlackLinkByConversation,
  getSlackLinkByThread: internal.machine.getSlackLinkByThread,
  getEscalationCard: internal.machine.getEscalationCard,
  getPatientOverview: internal.machine.getPatientOverview,
  listSourceDocumentsWithUrls: internal.machine.listSourceDocumentsWithUrls,
  getQueueForConcierge: internal.machine.getQueueForConcierge,
  readInflight: internal.machine.readInflight,
  listQueuedConversations: internal.machine.listQueuedConversations,
  listOrphanedChains: internal.machine.listOrphanedChains,
  getAgentMemory: internal.machine.getAgentMemory,
};

const MUTATIONS: Record<string, AnyRef> = {
  ensureConversation: internal.machine.ensureConversation,
  appendMessage: internal.machine.appendMessage,
  setAutomationState: internal.machine.setAutomationState,
  markConciergeTakeover: internal.machine.markConciergeTakeover,
  resumeAutomation: internal.machine.resumeAutomation,
  deleteConversationBySpace: internal.machine.deleteConversationBySpace,
  logActivity: internal.machine.logActivity,
  escalateToHuman: internal.machine.escalateToHuman,
  saveEveSession: internal.machine.saveEveSession,
  markOutboundDelivered: internal.machine.markOutboundDelivered,
  recordOutboundFailure: internal.machine.recordOutboundFailure,
  recordAgentTurn: internal.machine.recordAgentTurn,
  assignPatient: internal.machine.assignPatient,
  ensureGuestPatient: internal.machine.ensureGuestPatient,
  upsertClerkUser: internal.users.upsertClerkUser,
  setClerkMembership: internal.users.setClerkMembership,
  deleteClerkUser: internal.users.deleteClerkUser,
  resolveConciergeBySlackUser: internal.machine.resolveConciergeBySlackUser,
  markSlackOutboxPosted: internal.machine.markSlackOutboxPosted,
  upsertSlackLink: internal.machine.upsertSlackLink,
  conciergeReplyFromSlack: internal.machine.conciergeReplyFromSlack,
  takeOverFromSlack: internal.machine.takeOverFromSlack,
  resolveEscalationFromSlack: internal.machine.resolveEscalationFromSlack,
  resumeAutomationFromSlack: internal.machine.resumeAutomationFromSlack,
  enqueueInbound: internal.machine.enqueueInbound,
  drainBatch: internal.machine.drainBatch,
  readCarried: internal.machine.readCarried,
  carryForward: internal.machine.carryForward,
  claimChain: internal.machine.claimChain,
  setChainStage: internal.machine.setChainStage,
  cancelChain: internal.machine.cancelChain,
  advanceStartIndex: internal.machine.advanceStartIndex,
  recordJobFailure: internal.machine.recordJobFailure,
  sweepJobFailures: internal.machine.sweepJobFailures,
  upsertAgentMemory: internal.machine.upsertAgentMemory,
};

const machine = httpAction(async (ctx, request) => {
  const expected = process.env.CONVEX_SERVICE_SECRET;
  if (expected) {
    const auth = request.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (token !== expected) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
  }

  let body: { fn?: string; args?: Record<string, unknown> };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("invalid json body", 400);
  }
  const fn = body.fn;
  const args = body.args ?? {};
  if (!fn) {
    return jsonError("missing fn", 400);
  }

  try {
    if (fn in QUERIES) {
      const result = await ctx.runQuery(QUERIES[fn]!, args);
      return jsonOk(result);
    }
    if (fn in MUTATIONS) {
      const result = await ctx.runMutation(MUTATIONS[fn]!, args);
      return jsonOk(result);
    }
    return jsonError(`unknown fn: ${fn}`, 404);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonError(message, 500);
  }
});

function jsonOk(result: unknown): Response {
  return new Response(JSON.stringify({ ok: true, result: result ?? null }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const http = httpRouter();
http.route({ path: "/machine", method: "POST", handler: machine });
export default http;
