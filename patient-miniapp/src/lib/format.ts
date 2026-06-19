import type { ItineraryKind, Procedure, SourceDocumentKind } from "./types";

export function procedureLabel(procedure: Procedure): string {
  if (procedure === "hair_transplant") {
    return "Hair transplant";
  }
  if (procedure === "rhinoplasty") {
    return "Rhinoplasty";
  }
  return "Procedure";
}

export function kindLabel(kind: ItineraryKind): string {
  return {
    clinic: "Clinic",
    flight: "Flight",
    followup: "Follow-up",
    hotel: "Hotel",
    preop: "Pre-op",
    transport: "Transport",
  }[kind];
}

export function documentKindLabel(kind: SourceDocumentKind): string {
  return {
    care_note: "Care note",
    care_packet: "Care packet",
    guide: "Guide",
    itinerary_packet: "Itinerary packet",
    logistics_handoff: "Logistics handoff",
    runbook: "Runbook",
  }[kind];
}

export function formatDateTime(value: string | null): string {
  if (!value) {
    return "Time pending";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function mapUrl(address: string): string {
  return `http://maps.apple.com/?q=${encodeURIComponent(address)}`;
}
