import type {
  CareAnswerPolicy,
  CarePhase,
  CareSourceStatus,
  CareSourceType,
  ItineraryKind,
  Procedure,
  SourceDocumentKind,
} from "@essos/shared";

/** Select option lists mirroring the Convex schema unions, with display labels. */

export const PROCEDURE_OPTIONS: { value: Procedure; label: string }[] = [
  { value: "rhinoplasty", label: "Rhinoplasty" },
  { value: "hair_transplant", label: "Hair transplant" },
  { value: "other", label: "Other" },
];

export const ITINERARY_KIND_OPTIONS: { value: ItineraryKind; label: string }[] =
  [
    { value: "flight", label: "Flight" },
    { value: "clinic", label: "Clinic" },
    { value: "hotel", label: "Hotel" },
    { value: "transport", label: "Transport" },
    { value: "followup", label: "Follow-up" },
    { value: "preop", label: "Pre-op" },
  ];

export const CARE_PHASE_OPTIONS: { value: CarePhase; label: string }[] = [
  { value: "preop", label: "Pre-op" },
  { value: "postop", label: "Post-op" },
  { value: "general", label: "General" },
];

export const CARE_SOURCE_TYPE_OPTIONS: {
  value: CareSourceType;
  label: string;
}[] = [
  { value: "clinic_packet", label: "Clinic packet" },
  { value: "essos_summary", label: "Essos summary" },
  { value: "generated_notional", label: "Generated (notional)" },
  { value: "missing", label: "Missing" },
];

export const CARE_SOURCE_STATUS_OPTIONS: {
  value: CareSourceStatus;
  label: string;
}[] = [
  { value: "verified", label: "Verified" },
  { value: "demo_notional", label: "Demo / notional" },
  { value: "missing", label: "Missing" },
  { value: "personalized_pending", label: "Personalized (pending)" },
];

export const ANSWER_POLICY_OPTIONS: {
  value: CareAnswerPolicy;
  label: string;
}[] = [
  { value: "answer_reference", label: "Eve may answer from this" },
  { value: "escalate_only", label: "Escalate only" },
];

export const SOURCE_DOCUMENT_KIND_OPTIONS: {
  value: SourceDocumentKind;
  label: string;
}[] = [
  { value: "itinerary_packet", label: "Itinerary packet" },
  { value: "care_packet", label: "Care packet" },
  { value: "care_note", label: "Care note" },
  { value: "logistics_handoff", label: "Logistics handoff" },
  { value: "guide", label: "Guide" },
  { value: "runbook", label: "Runbook" },
];
