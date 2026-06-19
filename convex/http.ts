import type { FunctionReference } from "convex/server";
import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import { httpAction } from "./_generated/server";
import { hashToken } from "./model/patientCards.js";

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
  getMessageBySourceEvent: internal.machine.getMessageBySourceEvent,
  listPendingOutbound: internal.machine.listPendingOutbound,
  getPatientCardLinkByTokenHash: internal.machine.getPatientCardLinkByTokenHash,
  listPendingSlackOutbox: internal.machine.listPendingSlackOutbox,
  getSlackLinkByConversation: internal.machine.getSlackLinkByConversation,
  getSlackLinkByThread: internal.machine.getSlackLinkByThread,
  getEscalationCard: internal.machine.getEscalationCard,
  getPatientOverview: internal.machine.getPatientOverview,
  listSourceDocumentsWithUrls: internal.machine.listSourceDocumentsWithUrls,
  getMiniappSourceDocument: internal.machine.getMiniappSourceDocument,
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
  resolveAndResume: internal.machine.resolveAndResume,
  deleteConversationBySpace: internal.machine.deleteConversationBySpace,
  logActivity: internal.machine.logActivity,
  escalateToHuman: internal.machine.escalateToHuman,
  saveEveSession: internal.machine.saveEveSession,
  markOutboundDelivered: internal.machine.markOutboundDelivered,
  recordOutboundFailure: internal.machine.recordOutboundFailure,
  recordAgentTurn: internal.machine.recordAgentTurn,
  assignPatient: internal.machine.assignPatient,
  ensureGuestPatient: internal.machine.ensureGuestPatient,
  createPatientCardLink: internal.machine.createPatientCardLink,
  markPatientCardLinkUsed: internal.machine.markPatientCardLinkUsed,
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
  resolveAndResumeFromSlack: internal.machine.resolveAndResumeFromSlack,
  setEscalationFeedbackFromSlack:
    internal.machine.setEscalationFeedbackFromSlack,
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

const patientCard = httpAction(async (ctx, request) => {
  const validated = await validatePatientCardRequest(ctx, request);
  if (validated instanceof Response) {
    return validated;
  }

  await ctx
    .runMutation(internal.machine.markPatientCardLinkUsed, {
      tokenHash: validated.tokenHash,
    })
    .catch(() => null);

  return new Response(validated.link.payload_json, {
    status: 200,
    headers: {
      ...corsHeaders(),
      "content-type": "application/json",
      "cache-control": "private, max-age=30",
    },
  });
});

const patientDocument = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const documentId = url.searchParams.get("documentId")?.trim() ?? "";
  if (!documentId) {
    return jsonError("missing documentId", 400, corsHeaders());
  }

  const validated = await validatePatientCardRequest(ctx, request);
  if (validated instanceof Response) {
    return validated;
  }

  const payload = parsePatientCardPayload(validated.link.payload_json);
  const allowed = payload?.documents.find((doc) => doc.id === documentId);
  if (!allowed) {
    return jsonError("document not found", 404, corsHeaders());
  }
  if (!allowed.downloadable) {
    return jsonError("document file unavailable", 404, corsHeaders());
  }

  const doc = await ctx.runQuery(internal.machine.getMiniappSourceDocument, {
    patientId: validated.link.patient_id,
    documentId,
  });
  if (!doc?.url) {
    return jsonError("document file unavailable", 404, corsHeaders());
  }

  const upstream = await fetch(doc.url);
  if (!upstream.ok) {
    return jsonError("document file unavailable", 502, corsHeaders());
  }

  await ctx
    .runMutation(internal.machine.markPatientCardLinkUsed, {
      tokenHash: validated.tokenHash,
    })
    .catch(() => null);

  const disposition =
    url.searchParams.get("download") === "1" ? "attachment" : "inline";
  const filename = safeFilename(doc.file_name ?? `${doc.title}.pdf`);
  return new Response(await upstream.arrayBuffer(), {
    status: 200,
    headers: {
      ...corsHeaders(),
      "cache-control": "private, max-age=30",
      "content-disposition": `${disposition}; filename="${filename}"`,
      "content-type":
        doc.content_type ??
        upstream.headers.get("content-type") ??
        "application/octet-stream",
    },
  });
});

const corsPreflight = httpAction(
  async () => new Response(null, { status: 204, headers: corsHeaders() })
);

async function validatePatientCardRequest(
  ctx: ActionCtx,
  request: Request
): Promise<
  | Response
  | {
      link: {
        expires_at: string;
        patient_id: string;
        payload_json: string;
      };
      tokenHash: string;
    }
> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return jsonError("missing token", 400, corsHeaders());
  }

  const tokenHash = await hashToken(token);
  const link = await ctx.runQuery(
    internal.machine.getPatientCardLinkByTokenHash,
    {
      tokenHash,
    }
  );
  if (!link) {
    return jsonError("card not found", 404, corsHeaders());
  }
  if (link.expires_at <= new Date().toISOString()) {
    return jsonError("card expired", 410, corsHeaders());
  }
  return { link, tokenHash };
}

function parsePatientCardPayload(
  payloadJson: string
): { documents: Array<{ downloadable: boolean; id: string }> } | null {
  try {
    const parsed = JSON.parse(payloadJson) as {
      documents?: Array<{ downloadable?: boolean; id?: string }>;
    };
    return {
      documents: Array.isArray(parsed.documents)
        ? parsed.documents
            .filter(
              (doc): doc is { downloadable?: boolean; id: string } =>
                typeof doc.id === "string"
            )
            .map((doc) => ({
              downloadable: doc.downloadable === true,
              id: doc.id,
            }))
        : [],
    };
  } catch {
    return null;
  }
}

function safeFilename(value: string): string {
  const filename = value
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return filename || "essos-document";
}

function corsHeaders(): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
  };
}

function jsonOk(result: unknown): Response {
  return new Response(JSON.stringify({ ok: true, result: result ?? null }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function jsonError(
  error: string,
  status: number,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: { "content-type": "application/json", ...extraHeaders },
  });
}

const http = httpRouter();
http.route({ path: "/machine", method: "POST", handler: machine });
http.route({ path: "/miniapp/card", method: "GET", handler: patientCard });
http.route({
  path: "/miniapp/document",
  method: "GET",
  handler: patientDocument,
});
http.route({
  path: "/miniapp/card",
  method: "OPTIONS",
  handler: corsPreflight,
});
http.route({
  path: "/miniapp/document",
  method: "OPTIONS",
  handler: corsPreflight,
});
export default http;
