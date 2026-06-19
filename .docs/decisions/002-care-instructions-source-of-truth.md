# Care Instructions Source-of-Truth Model

## Decision

Use a general `care_instructions` model instead of a narrow `preop_instructions` table. The current demo has strong pre-op source material, but post-op instructions are explicitly less clean and may be personalized after surgery. The schema should represent that reality from day one, even if Eve only answers from pre-op instructions in the first build.

## Why

The context says the patient itinerary and pre-op instructions are reliable sources of truth. It also says post-op instructions exist, but may be personalized, incomplete, or not yet captured in the app. A single care-instruction model lets the dashboard show which sources are trusted and lets Eve escalate when the source is missing.

## Suggested Schema

```sql
create table care_instructions (
  id text primary key,
  patient_id text not null references patients(id) on delete cascade,
  source_document_id text references source_documents(id) on delete set null,
  phase text not null, -- preop | postop | general
  procedure text not null, -- rhinoplasty | hair_transplant | etc.
  title text not null,
  body text not null,
  source_type text not null, -- clinic_packet | essos_summary | generated_notional | missing
  source_status text not null, -- verified | demo_notional | missing | personalized_pending
  answer_policy text not null, -- answer_reference | escalate_only
  effective_from text,
  effective_until text,
  created_at text not null,
  updated_at text not null
);
```

`source_document_id` links an instruction back to the `source_documents` row it was derived from (the PDF/Markdown packet surfaced in the dashboard); see the live schema in [shared/src/db.ts](../../shared/src/db.ts).

## Answer Policy

`answer_reference`:

- Eve may answer by quoting or summarizing this document.
- Eve should mention it is using the documented instruction.
- Eve should not extend beyond the text.

`escalate_only`:

- Eve may acknowledge the question and explain that the concierge/clinic should confirm.
- Eve must create an escalation.
- Eve should not provide recovery or clinical advice.

## Initial Seed Data

Seed at least:

- One Turkey rhinoplasty patient using the provided itinerary and pre-op instructions.
- One Mexico rhinoplasty or hair-transplant patient with notional itinerary and notional pre-op docs.
- One patient with `postop` source status `personalized_pending`, to demonstrate why post-op recovery questions escalate.

## Dashboard Behavior

The patient view should display care docs grouped by phase:

- Pre-op: visible, answerable reference.
- Post-op: missing/personalized pending, not answerable.
- General: optional notional support docs.

The escalation queue should show whether an escalation happened because the source was missing, personalized, or clinically unsafe.
