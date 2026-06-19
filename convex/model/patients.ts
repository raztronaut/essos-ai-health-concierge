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

export async function getByExternalId(
  ctx: QueryCtx | MutationCtx,
  id: string,
): Promise<Patient | null> {
  return await ctx.db
    .query("patients")
    .withIndex("by_external_id", (q) => q.eq("id", id))
    .unique();
}

export async function getByHandle(
  ctx: QueryCtx | MutationCtx,
  handle: string,
): Promise<Patient | null> {
  return await ctx.db
    .query("patients")
    .withIndex("by_handle", (q) => q.eq("handle", handle))
    .unique();
}

export async function upsert(
  ctx: MutationCtx,
  patient: Omit<Patient, "_id" | "_creationTime" | "created_at"> & {
    created_at?: string;
  },
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
    created_at: patient.created_at ?? nowIso(),
  };
  if (existing) {
    await ctx.db.patch(existing._id, fields);
    return;
  }
  await ctx.db.insert("patients", fields);
}

// --- Source documents ---

export async function listSourceDocuments(
  ctx: QueryCtx | MutationCtx,
): Promise<SourceDocument[]> {
  return await ctx.db.query("source_documents").collect();
}

export async function getSourceDocument(
  ctx: QueryCtx | MutationCtx,
  id: string,
): Promise<SourceDocument | null> {
  return await ctx.db
    .query("source_documents")
    .withIndex("by_external_id", (q) => q.eq("id", id))
    .unique();
}

export async function listSourceDocumentsForPatient(
  ctx: QueryCtx | MutationCtx,
  patientId: string,
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
    `${a.kind}${a.title}`.localeCompare(`${b.kind}${b.title}`),
  );
}

export async function insertSourceDocument(
  ctx: MutationCtx,
  doc: Omit<SourceDocument, "_id" | "_creationTime" | "created_at"> & {
    created_at?: string;
  },
): Promise<void> {
  const existing = await getSourceDocument(ctx, doc.id);
  const fields = { ...doc, created_at: doc.created_at ?? nowIso() };
  if (existing) {
    await ctx.db.patch(existing._id, fields);
    return;
  }
  await ctx.db.insert("source_documents", fields);
}

// --- Itinerary ---

export async function listItinerary(
  ctx: QueryCtx | MutationCtx,
  patientId: string,
): Promise<ItineraryEvent[]> {
  return await ctx.db
    .query("itinerary_events")
    .withIndex("by_patient", (q) => q.eq("patient_id", patientId))
    .collect();
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
  },
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
  phase?: CarePhase,
): Promise<CareInstruction[]> {
  const rows = await ctx.db
    .query("care_instructions")
    .withIndex("by_patient", (q) =>
      phase
        ? q.eq("patient_id", patientId).eq("phase", phase)
        : q.eq("patient_id", patientId),
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
  },
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
