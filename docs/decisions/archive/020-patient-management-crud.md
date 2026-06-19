# Patient Management CRUD

## Decision

Concierges manage patient records directly from the dashboard: a sortable/filterable roster at `/patients`, per-patient editing of profile, itinerary, care instructions, and source documents, and document uploads to Convex file storage. All writes go through Clerk-gated Convex mutations; Eve reads the same tables via the machine path, so dashboard edits are reflected on its next tool call.

Patient roster reads respect the lead/member scoping from [ADR 016](016-concierge-ownership-and-rbac.md). Record editing (create/update/delete patients, itinerary events, care instructions, and source documents) is available to any signed-in concierge — the data is the shared source of truth Eve quotes from, not a per-rep silo.

## Why

The trial started with a read-only patient detail view backed by seeded fixtures. Concierges need to maintain records as trips evolve (flight changes, new care packets, uploaded clinic PDFs) without re-running the seed script. Because Eve's tools (`get_patient_overview`, `get_itinerary`, `get_care_instructions`) read the same Convex tables, letting humans edit in the dashboard keeps the agent grounded without a separate sync layer.

## Design

- **Roster** ([dashboard/features/patients/](../../../dashboard/features/patients/)): `/patients` lists every patient the signed-in concierge can see (scoped by [ADR 016](016-concierge-ownership-and-rbac.md)), with search, procedure/assignee filters, sortable columns, optional grouping, lead assign / member claim controls, and a "New patient" flow.
- **Detail editing** (`/patients/[id]`): dialog forms for patient profile, itinerary events, and care instructions; inline delete; document upload via `generateUploadUrl` → POST to Convex storage → `createSourceDocument`.
- **Mutations** ([convex/mutations.ts](../../../convex/mutations.ts)): `upsertPatient`, `deletePatient`, `upsertItineraryEvent`, `deleteItineraryEvent`, `upsertCareInstruction`, `deleteCareInstruction`, `assignPatient`, `generateUploadUrl`, `createSourceDocument`, `deleteSourceDocument`. All use `conciergeMutation` (Clerk identity required when `ESSOS_REQUIRE_AUTH` is on).
- **Serving documents**: `/source-docs/[id]` serves seeded fixture PDFs from disk and uploaded documents from Convex storage (Markdown fallback for fixture docs without a PDF).
- **Agent path unchanged**: the transport and Eve continue to reach patient data through the `/machine` HTTP action with the service secret — they do not use these dashboard mutations.

## Consequences

- Concierges can keep patient records current during live trips; Eve stays aligned with human-maintained data.
- Uploads land in Convex file storage, extending beyond the static `mock-assets/` fixture pack.
- Editing is not ownership-gated (any signed-in concierge can edit any record they can read); tighten later if a clinic needs stricter write isolation.
- Deletes cascade related itinerary, care, and source-document rows (including Convex storage blobs); patients with existing conversations cannot be deleted until those are resolved or reassigned.
