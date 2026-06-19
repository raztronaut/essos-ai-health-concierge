import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { newId, nowIso } from "../lib/util.js";

export type Patient = Doc<"patients">;
export type SourceDocument = Doc<"source_documents">;
export type ItineraryEvent = Doc<"itinerary_events">;
export type CareInstruction = Doc<"care_instructions">;
export type CarePhase = CareInstruction["phase"];

// --- Patients ---

export async function list(ctx: QueryCtx | MutationCtx): Promise<Patient[]> {
  const rows = await ctx.db.query("patients").collect();
  return rows.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/**
 * Patients visible to a concierge: leads see everyone; members see their own
 * assigned patients plus the unassigned queue. Index-backed via `by_assignee`.
 */
export async function listForConcierge(
  ctx: QueryCtx | MutationCtx,
  opts: { clerkId: string | null; isLead: boolean }
): Promise<Patient[]> {
  if (opts.isLead || !opts.clerkId) {
    return await list(ctx);
  }
  const [mine, unassigned] = await Promise.all([
    ctx.db
      .query("patients")
      .withIndex("by_assignee", (q) => q.eq("assignee_user_id", opts.clerkId))
      .collect(),
    ctx.db
      .query("patients")
      .withIndex("by_assignee", (q) => q.eq("assignee_user_id", null))
      .collect(),
  ]);

  // Also include patients where the user is an associated concierge member
  const allPatients = await list(ctx);
  const associated = allPatients.filter(
    (p) =>
      p.associated_user_ids?.includes(opts.clerkId ?? "") &&
      p.assignee_user_id !== opts.clerkId
  );

  return [...mine, ...associated, ...unassigned].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );
}

/** True when a concierge may view/act on a patient (lead, owner, associated owner, or unassigned). */
export function canAccess(
  patient: { assignee_user_id?: string | null; associated_user_ids?: string[] },
  opts: { clerkId: string | null; isLead: boolean }
): boolean {
  if (opts.isLead) {
    return true;
  }
  const owner = patient.assignee_user_id ?? null;
  const associated = patient.associated_user_ids ?? [];
  return (
    owner === null ||
    owner === opts.clerkId ||
    associated.includes(opts.clerkId ?? "")
  );
}

export async function getByExternalId(
  ctx: QueryCtx | MutationCtx,
  id: string
): Promise<Patient | null> {
  return await ctx.db
    .query("patients")
    .withIndex("by_external_id", (q) => q.eq("id", id))
    .unique();
}

export async function getByHandle(
  ctx: QueryCtx | MutationCtx,
  handle: string
): Promise<Patient | null> {
  return await ctx.db
    .query("patients")
    .withIndex("by_handle", (q) => q.eq("handle", handle))
    .unique();
}

export async function upsert(
  ctx: MutationCtx,
  patient: Omit<
    Patient,
    | "_id"
    | "_creationTime"
    | "created_at"
    | "assignee_user_id"
    | "associated_user_ids"
    | "policy_overrides"
  > & {
    created_at?: string;
    assignee_user_id?: string | null;
    associated_user_ids?: string[];
    policy_overrides?: Patient["policy_overrides"];
  }
): Promise<void> {
  const existing = await getByExternalId(ctx, patient.id);
  const fields = {
    id: patient.id,
    name: patient.name,
    handle: patient.handle,
    procedure: patient.procedure,
    destination_city: patient.destination_city,
    destination_country: patient.destination_country,
    clinic_name: patient.clinic_name,
    hotel_name: patient.hotel_name,
    companion_name: patient.companion_name,
    dietary_notes: patient.dietary_notes,
    assignee_user_id:
      patient.assignee_user_id ?? existing?.assignee_user_id ?? null,
    associated_user_ids:
      patient.associated_user_ids ?? existing?.associated_user_ids ?? [],
    policy_overrides:
      patient.policy_overrides ?? existing?.policy_overrides ?? [],
    created_at: patient.created_at ?? nowIso(),
  };
  if (existing) {
    await ctx.db.patch(existing._id, fields);
    return;
  }
  await ctx.db.insert("patients", fields);
}

function guestNameFor(handle: string, templateName: string): string {
  if (handle.includes("@")) {
    const local = handle.split("@")[0]?.trim();
    if (local) {
      return local
        .split(/[._-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    }
  }
  return templateName;
}

/**
 * Find or create a guest patient bound to an iMessage handle, cloned from a
 * template patient so Eve has real itinerary + care data to ground answers in.
 * Idempotent: a returning handle reuses the same guest patient. Powers the
 * "text the number and start chatting" demo (see ADR 017).
 */
export async function ensureGuest(
  ctx: MutationCtx,
  args: { handle: string; name?: string | null; templateId?: string }
): Promise<Patient> {
  const existing = await getByHandle(ctx, args.handle);
  if (existing && !existing.name.startsWith("Guest")) {
    return existing;
  }
  const templateId = args.templateId ?? "pat_maya";
  const template = await getByExternalId(ctx, templateId);
  if (!template) {
    throw new Error(`Guest template patient "${templateId}" not found`);
  }
  if (existing) {
    const name = args.name?.trim() || guestNameFor(args.handle, template.name);
    if (existing.name !== name) {
      await ctx.db.patch(existing._id, { name });
      return (await getByExternalId(ctx, existing.id)) ?? existing;
    }
    return existing;
  }

  const id = newId("pat_guest");
  await ctx.db.insert("patients", {
    id,
    name: args.name?.trim() || guestNameFor(args.handle, template.name),
    handle: args.handle,
    procedure: template.procedure,
    destination_city: template.destination_city,
    destination_country: template.destination_country,
    clinic_name: template.clinic_name,
    hotel_name: template.hotel_name,
    companion_name: template.companion_name,
    dietary_notes: template.dietary_notes,
    assignee_user_id: null,
    created_at: nowIso(),
  });

  // Clone the template's patient-specific source docs first, then remap any
  // itinerary/care references to those fresh ids. Shared global docs stay shared.
  const sourceDocumentIdMap = new Map<string, string>();
  const templateDocs = (
    await listSourceDocumentsForPatient(ctx, template.id)
  ).filter((d) => d.patient_id === template.id);
  for (const doc of templateDocs) {
    const clonedId = newId("doc_guest");
    sourceDocumentIdMap.set(doc.id, clonedId);
    await insertSourceDocument(ctx, {
      id: clonedId,
      patient_id: id,
      kind: doc.kind,
      title: doc.title,
      source_type: doc.source_type,
      source_status: doc.source_status,
      answer_policy: doc.answer_policy,
      markdown_path: doc.markdown_path,
      pdf_path: doc.pdf_path,
      sha256: doc.sha256,
      storage_id: doc.storage_id,
      file_name: doc.file_name,
      content_type: doc.content_type,
    });
  }

  for (const event of await listItinerary(ctx, template.id)) {
    await insertItineraryEvent(ctx, {
      patient_id: id,
      source_document_id: event.source_document_id
        ? (sourceDocumentIdMap.get(event.source_document_id) ??
          event.source_document_id)
        : null,
      kind: event.kind,
      title: event.title,
      detail: event.detail,
      location: event.location,
      starts_at: event.starts_at,
      ends_at: event.ends_at,
      confirmation_number: event.confirmation_number,
      driver_name: event.driver_name,
      driver_phone: event.driver_phone,
      sort_order: event.sort_order,
    });
  }
  for (const care of await listCareInstructions(ctx, template.id)) {
    await insertCareInstruction(ctx, {
      patient_id: id,
      source_document_id: care.source_document_id
        ? (sourceDocumentIdMap.get(care.source_document_id) ??
          care.source_document_id)
        : null,
      phase: care.phase,
      procedure: care.procedure,
      title: care.title,
      body: care.body,
      source_type: care.source_type,
      source_status: care.source_status,
      answer_policy: care.answer_policy,
      effective_from: care.effective_from,
      effective_until: care.effective_until,
    });
  }
  const created = await getByExternalId(ctx, id);
  if (!created) {
    throw new Error("Failed to create guest patient");
  }
  return created;
}

/** Assign (or unassign) a patient's owning concierge; mirrors onto conversations. */
export async function assign(
  ctx: MutationCtx,
  patientId: string,
  assigneeUserId: string | null
): Promise<void> {
  const patient = await getByExternalId(ctx, patientId);
  if (!patient) {
    throw new Error("Patient not found");
  }
  await ctx.db.patch(patient._id, { assignee_user_id: assigneeUserId });
  const conversations = await ctx.db
    .query("conversations")
    .withIndex("by_patient", (q) => q.eq("patient_id", patientId))
    .collect();
  for (const conv of conversations) {
    await ctx.db.patch(conv._id, { assignee_user_id: assigneeUserId });
  }
}

// --- Source documents ---

export async function listSourceDocuments(
  ctx: QueryCtx | MutationCtx
): Promise<SourceDocument[]> {
  return await ctx.db.query("source_documents").collect();
}

export async function getSourceDocument(
  ctx: QueryCtx | MutationCtx,
  id: string
): Promise<SourceDocument | null> {
  return await ctx.db
    .query("source_documents")
    .withIndex("by_external_id", (q) => q.eq("id", id))
    .unique();
}

export async function listSourceDocumentsForPatient(
  ctx: QueryCtx | MutationCtx,
  patientId: string
): Promise<SourceDocument[]> {
  // Index-backed: this patient's docs plus the global (null-patient) docs.
  const [forPatient, global] = await Promise.all([
    ctx.db
      .query("source_documents")
      .withIndex("by_patient", (q) => q.eq("patient_id", patientId))
      .collect(),
    ctx.db
      .query("source_documents")
      .withIndex("by_patient", (q) => q.eq("patient_id", null))
      .collect(),
  ]);
  return [...forPatient, ...global].sort((a, b) =>
    `${a.kind}${a.title}`.localeCompare(`${b.kind}${b.title}`)
  );
}

export async function insertSourceDocument(
  ctx: MutationCtx,
  doc: Omit<SourceDocument, "_id" | "_creationTime" | "created_at"> & {
    created_at?: string;
  }
): Promise<void> {
  const existing = await getSourceDocument(ctx, doc.id);
  const fields = { ...doc, created_at: doc.created_at ?? nowIso() };
  if (existing) {
    await ctx.db.patch(existing._id, fields);
    return;
  }
  await ctx.db.insert("source_documents", fields);
}

/** Delete a source document and its uploaded blob (if Convex-storage backed). */
export async function deleteSourceDocument(
  ctx: MutationCtx,
  id: string
): Promise<void> {
  const existing = await getSourceDocument(ctx, id);
  if (!existing) {
    return;
  }
  if (existing.storage_id) {
    await ctx.storage.delete(existing.storage_id);
  }
  await ctx.db.delete(existing._id);
}

// --- Itinerary ---

export async function listItinerary(
  ctx: QueryCtx | MutationCtx,
  patientId: string
): Promise<ItineraryEvent[]> {
  return await ctx.db
    .query("itinerary_events")
    .withIndex("by_patient", (q) => q.eq("patient_id", patientId))
    .collect();
}

export async function getItineraryEventByExternalId(
  ctx: QueryCtx | MutationCtx,
  id: string
): Promise<ItineraryEvent | null> {
  return await ctx.db
    .query("itinerary_events")
    .withIndex("by_external_id", (q) => q.eq("id", id))
    .unique();
}

/** Patch an existing itinerary event by its legacy string id. */
export async function updateItineraryEvent(
  ctx: MutationCtx,
  id: string,
  patch: Partial<Omit<ItineraryEvent, "_id" | "_creationTime" | "id">>
): Promise<void> {
  const existing = await getItineraryEventByExternalId(ctx, id);
  if (!existing) {
    throw new Error("Itinerary event not found");
  }
  await ctx.db.patch(existing._id, patch);
}

export async function deleteItineraryEvent(
  ctx: MutationCtx,
  id: string
): Promise<void> {
  const existing = await getItineraryEventByExternalId(ctx, id);
  if (existing) {
    await ctx.db.delete(existing._id);
  }
}

export async function insertItineraryEvent(
  ctx: MutationCtx,
  event: {
    id?: string;
    patient_id: string;
    source_document_id?: string | null;
    kind: ItineraryEvent["kind"];
    title: string;
    detail?: string | null;
    location?: string | null;
    starts_at?: string | null;
    ends_at?: string | null;
    confirmation_number?: string | null;
    driver_name?: string | null;
    driver_phone?: string | null;
    sort_order?: number;
  }
): Promise<void> {
  await ctx.db.insert("itinerary_events", {
    id: event.id ?? newId("itin"),
    patient_id: event.patient_id,
    source_document_id: event.source_document_id ?? null,
    kind: event.kind,
    title: event.title,
    detail: event.detail ?? null,
    location: event.location ?? null,
    starts_at: event.starts_at ?? null,
    ends_at: event.ends_at ?? null,
    confirmation_number: event.confirmation_number ?? null,
    driver_name: event.driver_name ?? null,
    driver_phone: event.driver_phone ?? null,
    sort_order: event.sort_order ?? 0,
  });
}

// --- Care instructions ---

export async function listCareInstructions(
  ctx: QueryCtx | MutationCtx,
  patientId: string,
  phase?: CarePhase
): Promise<CareInstruction[]> {
  const rows = await ctx.db
    .query("care_instructions")
    .withIndex("by_patient", (q) =>
      phase
        ? q.eq("patient_id", patientId).eq("phase", phase)
        : q.eq("patient_id", patientId)
    )
    .collect();
  return rows.sort((a, b) => a.title.localeCompare(b.title));
}

export async function insertCareInstruction(
  ctx: MutationCtx,
  doc: {
    id?: string;
    patient_id: string;
    source_document_id?: string | null;
    phase: CarePhase;
    procedure: CareInstruction["procedure"];
    title: string;
    body: string;
    source_type: CareInstruction["source_type"];
    source_status: CareInstruction["source_status"];
    answer_policy: CareInstruction["answer_policy"];
    effective_from?: string | null;
    effective_until?: string | null;
  }
): Promise<void> {
  const ts = nowIso();
  await ctx.db.insert("care_instructions", {
    id: doc.id ?? newId("care"),
    patient_id: doc.patient_id,
    source_document_id: doc.source_document_id ?? null,
    phase: doc.phase,
    procedure: doc.procedure,
    title: doc.title,
    body: doc.body,
    source_type: doc.source_type,
    source_status: doc.source_status,
    answer_policy: doc.answer_policy,
    effective_from: doc.effective_from ?? null,
    effective_until: doc.effective_until ?? null,
    created_at: ts,
    updated_at: ts,
  });
}

export async function getCareInstructionByExternalId(
  ctx: QueryCtx | MutationCtx,
  id: string
): Promise<CareInstruction | null> {
  return await ctx.db
    .query("care_instructions")
    .withIndex("by_external_id", (q) => q.eq("id", id))
    .unique();
}

/** Patch a care instruction by its legacy string id (stamps `updated_at`). */
export async function updateCareInstruction(
  ctx: MutationCtx,
  id: string,
  patch: Partial<
    Omit<
      CareInstruction,
      "_id" | "_creationTime" | "id" | "created_at" | "updated_at"
    >
  >
): Promise<void> {
  const existing = await getCareInstructionByExternalId(ctx, id);
  if (!existing) {
    throw new Error("Care instruction not found");
  }
  await ctx.db.patch(existing._id, { ...patch, updated_at: nowIso() });
}

export async function deleteCareInstruction(
  ctx: MutationCtx,
  id: string
): Promise<void> {
  const existing = await getCareInstructionByExternalId(ctx, id);
  if (existing) {
    await ctx.db.delete(existing._id);
  }
}

// --- Patient deletion (cascade) ---

/**
 * Delete a patient and all of its child records (itinerary, care instructions,
 * and patient-scoped source documents + their uploaded blobs). Refuses to delete
 * a patient that still has conversations so message/escalation history is never
 * orphaned — unassign or archive those first.
 */
export async function deletePatient(
  ctx: MutationCtx,
  id: string
): Promise<void> {
  const patient = await getByExternalId(ctx, id);
  if (!patient) {
    throw new Error("Patient not found");
  }
  const conversations = await ctx.db
    .query("conversations")
    .withIndex("by_patient", (q) => q.eq("patient_id", id))
    .collect();
  if (conversations.length > 0) {
    throw new Error(
      "Cannot delete a patient with conversations. Resolve or reassign them first."
    );
  }
  const itinerary = await ctx.db
    .query("itinerary_events")
    .withIndex("by_patient", (q) => q.eq("patient_id", id))
    .collect();
  for (const row of itinerary) {
    await ctx.db.delete(row._id);
  }
  const care = await ctx.db
    .query("care_instructions")
    .withIndex("by_patient", (q) => q.eq("patient_id", id))
    .collect();
  for (const row of care) {
    await ctx.db.delete(row._id);
  }
  const docs = await ctx.db
    .query("source_documents")
    .withIndex("by_patient", (q) => q.eq("patient_id", id))
    .collect();
  for (const row of docs) {
    if (row.storage_id) {
      await ctx.storage.delete(row.storage_id);
    }
    await ctx.db.delete(row._id);
  }
  await ctx.db.delete(patient._id);
}
