import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { newId, nowIso } from "../lib/util.js";
import * as Conversations from "./conversations.js";
import * as Patients from "./patients.js";

export type PatientCardLink = Doc<"patient_card_links">;
export type PatientCardPurpose = PatientCardLink["purpose"];

export interface CreatedPatientCardLink {
  expiresAt: string;
  path: string;
  purpose: PatientCardPurpose;
  token: string;
  url: string;
}

const DEFAULT_TTL_MINUTES = 60;

function clampTtlMinutes(ttlMinutes?: number | null): number {
  if (!Number.isFinite(ttlMinutes ?? Number.NaN)) {
    return DEFAULT_TTL_MINUTES;
  }
  return Math.min(
    Math.max(Math.floor(ttlMinutes ?? DEFAULT_TTL_MINUTES), 1),
    24 * 60
  );
}

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let out = "";
  for (const byte of bytes) {
    out += alphabet[byte % alphabet.length];
  }
  return out;
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function compactPhone(phone: string | null): string | null {
  return phone?.trim() || null;
}

function appointmentAddress(events: Doc<"itinerary_events">[]): string | null {
  return (
    events.find((event) => ["clinic", "followup", "preop"].includes(event.kind))
      ?.location ?? null
  );
}

function hotelAddress(events: Doc<"itinerary_events">[]): string | null {
  return events.find((event) => event.kind === "hotel")?.location ?? null;
}

function hotelConfirmation(events: Doc<"itinerary_events">[]): string | null {
  return (
    events.find((event) => event.kind === "hotel" && event.confirmation_number)
      ?.confirmation_number ?? null
  );
}

function sourceLabels(docs: Doc<"source_documents">[]): string[] {
  return docs
    .filter((doc) => doc.patient_id !== null)
    .map((doc) => doc.title)
    .slice(0, 8);
}

function sourceDocuments(
  docs: Doc<"source_documents">[],
  events: Doc<"itinerary_events">[]
) {
  return docs
    .filter((doc) => doc.patient_id !== null)
    .slice(0, 12)
    .map((doc) => ({
      id: doc.id,
      title: doc.title,
      kind: doc.kind,
      sourceType: doc.source_type,
      sourceStatus: doc.source_status,
      fileName: doc.file_name ?? null,
      contentType: doc.content_type ?? null,
      downloadable: Boolean(doc.storage_id),
      relatedEventIds: events
        .filter((event) => event.source_document_id === doc.id)
        .map((event) => event.id),
    }));
}

async function buildPayload(
  ctx: QueryCtx | MutationCtx,
  args: {
    patientId: string;
    conversationId: string;
    purpose: PatientCardPurpose;
    expiresAt: string;
  }
): Promise<string> {
  const patient = await Patients.getByExternalId(ctx, args.patientId);
  if (!patient) {
    throw new Error("Patient not found");
  }
  const [conversation, itinerary, docs] = await Promise.all([
    Conversations.getByExternalId(ctx, args.conversationId),
    Patients.listItinerary(ctx, args.patientId),
    Patients.listSourceDocumentsForPatient(ctx, args.patientId),
  ]);
  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const transportEvents = itinerary.filter(
    (event) => event.kind === "transport"
  );
  const nextTransport =
    transportEvents.find(
      (event) => event.starts_at && event.starts_at >= nowIso()
    ) ??
    transportEvents[0] ??
    null;

  return JSON.stringify({
    version: 1,
    purpose: args.purpose,
    generatedAt: nowIso(),
    expiresAt: args.expiresAt,
    patient: {
      id: patient.id,
      displayName: patient.name,
      firstName: firstName(patient.name),
      procedure: patient.procedure,
      destinationCity: patient.destination_city,
      destinationCountry: patient.destination_country,
    },
    clinic: {
      name: patient.clinic_name,
      address: appointmentAddress(itinerary),
      phone: null,
    },
    hotel: {
      name: patient.hotel_name,
      address: hotelAddress(itinerary),
      confirmationNumber: hotelConfirmation(itinerary),
    },
    transport: {
      driverName: nextTransport?.driver_name ?? null,
      driverPhone: compactPhone(nextTransport?.driver_phone ?? null),
      nextPickupTitle: nextTransport?.title ?? null,
      nextPickupAt: nextTransport?.starts_at ?? null,
      nextPickupLocation: nextTransport?.location ?? null,
    },
    itinerary: itinerary.map((event) => ({
      id: event.id,
      kind: event.kind,
      title: event.title,
      detail: event.detail,
      location: event.location,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      confirmationNumber: event.confirmation_number,
      driverName: event.driver_name,
      driverPhone: event.driver_phone,
      sortOrder: event.sort_order,
      sourceDocumentId: event.source_document_id,
    })),
    documents: sourceDocuments(docs, itinerary),
    sources: sourceLabels(docs),
  });
}

export async function createLink(
  ctx: MutationCtx,
  args: {
    patientId: string;
    conversationId: string;
    purpose: PatientCardPurpose;
    ttlMinutes?: number | null;
    baseUrl?: string | null;
  }
): Promise<CreatedPatientCardLink> {
  const ttlMinutes = clampTtlMinutes(args.ttlMinutes);
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
  const token = randomToken();
  const tokenHash = await hashToken(token);
  const payloadJson = await buildPayload(ctx, {
    patientId: args.patientId,
    conversationId: args.conversationId,
    purpose: args.purpose,
    expiresAt,
  });

  await ctx.db.insert("patient_card_links", {
    id: newId("pcl"),
    token_hash: tokenHash,
    patient_id: args.patientId,
    conversation_id: args.conversationId,
    purpose: args.purpose,
    payload_json: payloadJson,
    expires_at: expiresAt,
    created_at: createdAt,
    used_at: null,
  });

  const path = `/p/${token}`;
  const base = args.baseUrl?.replace(/\/$/, "") || "";
  return {
    expiresAt,
    path,
    purpose: args.purpose,
    token,
    url: base ? `${base}${path}` : path,
  };
}

export async function getByTokenHash(
  ctx: QueryCtx | MutationCtx,
  tokenHash: string
): Promise<PatientCardLink | null> {
  return await ctx.db
    .query("patient_card_links")
    .withIndex("by_token_hash", (q) => q.eq("token_hash", tokenHash))
    .unique();
}

export async function markUsed(
  ctx: MutationCtx,
  tokenHash: string
): Promise<void> {
  const link = await getByTokenHash(ctx, tokenHash);
  if (!link || link.used_at) {
    return;
  }
  await ctx.db.patch(link._id, { used_at: nowIso() });
}
