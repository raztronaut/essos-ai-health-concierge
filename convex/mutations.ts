import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Concierge, Scope } from "./lib/functions.js";
import { conciergeMutation, effectiveScope } from "./lib/functions.js";
import { newId } from "./lib/util.js";
import {
  careAnswerPolicy,
  carePhase,
  careSourceStatus,
  careSourceType,
  itineraryKind,
  policyOverride,
  procedure,
  sourceDocumentKind,
} from "./lib/validators.js";
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

/**
 * Record whether an escalation was necessary (ADR 022). Decoupled from resolve
 * so a concierge can label a flag at any point; surfaced as the escalation-
 * validity rate in AI performance.
 */
export const setEscalationFeedback = conciergeMutation({
  args: {
    escalationId: v.string(),
    valid: v.boolean(),
    note: v.optional(v.union(v.string(), v.null())),
    ...viewAsArg,
  },
  returns: v.null(),
  handler: async (ctx, { escalationId, valid, note, viewAs }) => {
    const scope = await effectiveScope(ctx, ctx.concierge, viewAs);
    const escalation = await Escalations.getByExternalId(ctx, escalationId);
    if (escalation) {
      await assertConversationAccess(ctx, escalation.conversation_id, scope);
    }
    await Escalations.setFeedback(ctx, escalationId, {
      valid,
      note: note ?? null,
      by: scope.label,
    });
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
 * One-tap "Resolve + Resume Eve": close every flag on the thread and hand
 * control back to Eve. The single action a concierge takes when they've
 * answered (or the situation no longer needs a human) and want automation on.
 */
export const resolveAndResume = conciergeMutation({
  args: { conversationId: v.string(), ...viewAsArg },
  returns: v.null(),
  handler: async (ctx, { conversationId, viewAs }) => {
    const scope = await effectiveScope(ctx, ctx.concierge, viewAs);
    await assertConversationAccess(ctx, conversationId, scope);
    await Escalations.resolveAndResume(
      ctx,
      conversationId,
      scope.label,
      scope.clerkId
    );
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
    // Draft-quality signal: how much the concierge changed Eve's draft (ADR 022).
    await Escalations.recordDraftEdit(ctx, conversationId, trimmed);
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

// --- Patient record editing ---
//
// Any signed-in concierge can create/edit/remove patient records and their
// itinerary, care plans, and documents. eve reads these same tables live via
// the `/machine` path, so edits are reflected on its next tool call.

const nullableString = v.union(v.string(), v.null());

/** Create a new patient (no `id`) or edit an existing one (`id` provided). */
export const upsertPatient = conciergeMutation({
  args: {
    id: v.optional(v.string()),
    name: v.string(),
    handle: v.string(),
    procedure,
    destination_city: v.string(),
    destination_country: v.string(),
    clinic_name: v.string(),
    hotel_name: v.string(),
    companion_name: nullableString,
    dietary_notes: nullableString,
    assignee_user_id: v.optional(nullableString),
    associated_user_ids: v.optional(v.array(v.string())),
    policy_overrides: v.optional(v.array(policyOverride)),
    ...viewAsArg,
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = args.id ?? newId("pat");
    await Patients.upsert(ctx, {
      id,
      name: args.name,
      handle: args.handle,
      procedure: args.procedure,
      destination_city: args.destination_city,
      destination_country: args.destination_country,
      clinic_name: args.clinic_name,
      hotel_name: args.hotel_name,
      companion_name: args.companion_name,
      dietary_notes: args.dietary_notes,
      assignee_user_id: args.assignee_user_id,
      associated_user_ids: args.associated_user_ids,
      policy_overrides: args.policy_overrides,
    });
    return id;
  },
});

export const deletePatient = conciergeMutation({
  args: { patientId: v.string(), ...viewAsArg },
  returns: v.null(),
  handler: async (ctx, { patientId }) => {
    await Patients.deletePatient(ctx, patientId);
    return null;
  },
});

/** Add (no `id`) or edit (`id` provided) an itinerary event for a patient. */
export const upsertItineraryEvent = conciergeMutation({
  args: {
    id: v.optional(v.string()),
    patientId: v.string(),
    kind: itineraryKind,
    title: v.string(),
    detail: v.optional(nullableString),
    location: v.optional(nullableString),
    starts_at: v.optional(nullableString),
    ends_at: v.optional(nullableString),
    confirmation_number: v.optional(nullableString),
    driver_name: v.optional(nullableString),
    driver_phone: v.optional(nullableString),
    sort_order: v.optional(v.number()),
    ...viewAsArg,
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const fields = {
      kind: args.kind,
      title: args.title,
      detail: args.detail ?? null,
      location: args.location ?? null,
      starts_at: args.starts_at ?? null,
      ends_at: args.ends_at ?? null,
      confirmation_number: args.confirmation_number ?? null,
      driver_name: args.driver_name ?? null,
      driver_phone: args.driver_phone ?? null,
      sort_order: args.sort_order ?? 0,
    };
    if (args.id) {
      await Patients.updateItineraryEvent(ctx, args.id, fields);
      return args.id;
    }
    const id = newId("itin");
    await Patients.insertItineraryEvent(ctx, {
      id,
      patient_id: args.patientId,
      ...fields,
    });
    return id;
  },
});

export const deleteItineraryEvent = conciergeMutation({
  args: { id: v.string(), ...viewAsArg },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await Patients.deleteItineraryEvent(ctx, id);
    return null;
  },
});

/** Add (no `id`) or edit (`id` provided) a care instruction for a patient. */
export const upsertCareInstruction = conciergeMutation({
  args: {
    id: v.optional(v.string()),
    patientId: v.string(),
    phase: carePhase,
    procedure,
    title: v.string(),
    body: v.string(),
    source_type: careSourceType,
    source_status: careSourceStatus,
    answer_policy: careAnswerPolicy,
    effective_from: v.optional(nullableString),
    effective_until: v.optional(nullableString),
    ...viewAsArg,
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    if (args.id) {
      await Patients.updateCareInstruction(ctx, args.id, {
        phase: args.phase,
        procedure: args.procedure,
        title: args.title,
        body: args.body,
        source_type: args.source_type,
        source_status: args.source_status,
        answer_policy: args.answer_policy,
        effective_from: args.effective_from ?? null,
        effective_until: args.effective_until ?? null,
      });
      return args.id;
    }
    const id = newId("care");
    await Patients.insertCareInstruction(ctx, {
      id,
      patient_id: args.patientId,
      phase: args.phase,
      procedure: args.procedure,
      title: args.title,
      body: args.body,
      source_type: args.source_type,
      source_status: args.source_status,
      answer_policy: args.answer_policy,
      effective_from: args.effective_from ?? null,
      effective_until: args.effective_until ?? null,
    });
    return id;
  },
});

export const deleteCareInstruction = conciergeMutation({
  args: { id: v.string(), ...viewAsArg },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await Patients.deleteCareInstruction(ctx, id);
    return null;
  },
});

// --- Document uploads (Convex file storage) ---

/** Short-lived upload URL the dashboard POSTs a file to before recording it. */
export const generateUploadUrl = conciergeMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

/** Record an uploaded file as a patient (or global) source document. */
export const createSourceDocument = conciergeMutation({
  args: {
    patientId: nullableString,
    kind: sourceDocumentKind,
    title: v.string(),
    source_type: careSourceType,
    source_status: careSourceStatus,
    answer_policy: careAnswerPolicy,
    storageId: v.id("_storage"),
    fileName: v.optional(nullableString),
    contentType: v.optional(nullableString),
    ...viewAsArg,
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = newId("doc");
    await Patients.insertSourceDocument(ctx, {
      id,
      patient_id: args.patientId,
      kind: args.kind,
      title: args.title,
      source_type: args.source_type,
      source_status: args.source_status,
      answer_policy: args.answer_policy,
      markdown_path: null,
      pdf_path: null,
      sha256: null,
      storage_id: args.storageId,
      file_name: args.fileName ?? null,
      content_type: args.contentType ?? null,
    });
    return id;
  },
});

export const deleteSourceDocument = conciergeMutation({
  args: { id: v.string(), ...viewAsArg },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await Patients.deleteSourceDocument(ctx, id);
    return null;
  },
});
