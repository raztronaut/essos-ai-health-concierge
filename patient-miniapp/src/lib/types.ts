export type Procedure = "rhinoplasty" | "hair_transplant" | "other";

export type ItineraryKind =
  | "flight"
  | "clinic"
  | "hotel"
  | "transport"
  | "followup"
  | "preop";

export type PatientCardPurpose = "itinerary" | "clinic" | "source_data";

export type CareSourceType =
  | "clinic_packet"
  | "essos_summary"
  | "generated_notional"
  | "missing";

export type CareSourceStatus =
  | "verified"
  | "demo_notional"
  | "missing"
  | "personalized_pending";

export type SourceDocumentKind =
  | "itinerary_packet"
  | "care_packet"
  | "care_note"
  | "logistics_handoff"
  | "guide"
  | "runbook";

export interface PatientCardPayload {
  clinic: {
    address: string | null;
    name: string;
    phone: string | null;
  };
  documents: PatientSourceDocument[];
  expiresAt: string;
  generatedAt: string;
  hotel: {
    address: string | null;
    confirmationNumber: string | null;
    name: string;
  };
  itinerary: ItineraryEvent[];
  patient: {
    destinationCity: string;
    destinationCountry: string;
    displayName: string;
    firstName: string;
    id: string;
    procedure: Procedure;
  };
  purpose: PatientCardPurpose;
  sources: string[];
  transport: {
    driverName: string | null;
    driverPhone: string | null;
    nextPickupAt: string | null;
    nextPickupLocation: string | null;
    nextPickupTitle: string | null;
  };
  version: 1;
}

export interface PatientSourceDocument {
  contentType: string | null;
  downloadable: boolean;
  fileName: string | null;
  id: string;
  kind: SourceDocumentKind;
  relatedEventIds: string[];
  sourceStatus: CareSourceStatus;
  sourceType: CareSourceType;
  title: string;
}

export interface ItineraryEvent {
  confirmationNumber: string | null;
  detail: string | null;
  driverName: string | null;
  driverPhone: string | null;
  endsAt: string | null;
  id: string;
  kind: ItineraryKind;
  location: string | null;
  sortOrder: number;
  sourceDocumentId: string | null;
  startsAt: string | null;
  title: string;
}
