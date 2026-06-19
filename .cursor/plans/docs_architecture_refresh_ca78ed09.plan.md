---
name: docs architecture refresh
overview: "Audit found the docs are current through the latest commit except for two shipped-but-under-documented features: the dashboard patient-management CRUD (roster + edit) and the Slack optional activity-feed channel. Update the affected README files to match the actual code."
todos:
  - id: dashboard-readme
    content: "Update dashboard/README.md: add /patients roster row, editable /patients/[id], uploaded source-docs, expanded CRUD mutation list"
    status: completed
  - id: root-readme
    content: Update root README.md to mention dashboard patient-management (roster + CRUD)
    status: completed
  - id: slack-readme
    content: "Update slack/README.md: document SLACK_ACTIVITY_CHANNEL_ID env var and activity-channel routing in Flows"
    status: completed
  - id: adr-index
    content: Update .docs/decisions/README.md ADR 013 summary for SQLite-supersession consistency
    status: completed
  - id: adr-020
    content: Create ADR 020 (patient-management CRUD), register it in the ADR index + groupings, and cross-link from root/dashboard READMEs
    status: completed
  - id: verify
    content: Re-grep docs against code to confirm routes/mutations/env vars match
    status: completed
isProject: false
---

# Docs Architecture & Setup Refresh

## What I verified (already accurate, no change)
- Eve agent: 7 callable tools + 7 disabled built-ins + 4 skills, default model `claude-sonnet-4-5`, ports (convex 3210, eve 3000, dashboard 4000) — all match code.
- Convex two-path access, Clerk auth, guest mode, deploy topology (Convex Cloud + Vercel + Railway), CI workflow `.github/workflows/deploy.yml`, all 19 ADRs present, `.env.example` keys — all match.
- `package.json` scripts (`pnpm setup`, `dev`, `dev:ui`, `seed*`, `transport:*`, `slack:dev`, etc.) match the docs.

## Drift to fix (shipped in code, missing/stale in docs)

### 1. Dashboard patient management (commit `9f4ca7f`) is under-documented
`/patients` is a top-level sidebar nav item ([dashboard/components/layout/sidebar.tsx](dashboard/components/layout/sidebar.tsx) line 92) backed by [dashboard/app/patients/page.tsx](dashboard/app/patients/page.tsx) → `PatientsListView`, plus a full CRUD surface in [dashboard/features/patients/](dashboard/features/patients/) (roster, filters, claim/assign, form/dialog editors, document upload). [convex/mutations.ts](convex/mutations.ts) exposes `upsertPatient`, `deletePatient`, `upsertItineraryEvent`, `deleteItineraryEvent`, `upsertCareInstruction`, `deleteCareInstruction`, `generateUploadUrl`, `createSourceDocument`, `deleteSourceDocument`, `assignPatient` — none of these appear in the docs.

Update [dashboard/README.md](dashboard/README.md):
- Add a `/patients` row to the Views table (roster: sortable, filters, lead assign / member claim).
- Update the `/patients/[id]` row to note it is now editable (patient profile, itinerary, care instructions, source-doc upload), not read-only.
- Update the `/source-docs/[id]` row: serves seeded PDFs and uploaded docs (Convex storage), not just seeded.
- Expand the "Writes" bullet to include the patient/itinerary/care/source-doc CRUD mutations + `assignPatient`.

Update [README.md](README.md):
- Tagline / dashboard description and repo-layout/`dashboard/` line: mention patient records management (roster + CRUD) alongside conversations, escalations, telemetry.

### 2. Slack optional activity channel is undocumented
[slack/src/env.ts](slack/src/env.ts) line 23 and [slack/src/outboxLoop.ts](slack/src/outboxLoop.ts) use `SLACK_ACTIVITY_CHANNEL_ID` (a compact operational activity feed, separate from the escalation channel). It is in [.env.example](.env.example) line 76 but missing from [slack/README.md](slack/README.md).

Update [slack/README.md](slack/README.md):
- Add `SLACK_ACTIVITY_CHANNEL_ID` (optional) to the Env section.
- Note in Flows that activity/lifecycle events route to the activity channel when set (else into the escalation thread).

### 3. ADR index minor consistency (optional)
In [.docs/decisions/README.md](.docs/decisions/README.md), the ADR 013 row summary doesn't note it supersedes local SQLite (the root README and ADR title both do). Add the "(supersedes local SQLite)" parenthetical for consistency. ADR decision bodies are treated as immutable historical records and will NOT be rewritten (e.g. ADR 007's SQLite description stays as history).

### 4. New ADR 020 — patient-management CRUD
No ADR currently captures the dashboard patient-management surface (commit `9f4ca7f`). Create [.docs/decisions/020-patient-management-crud.md](.docs/decisions/020-patient-management-crud.md) following the existing ADR format (`# Title`, `## Decision`, `## Why`, `## Design`, `## Consequences`), documenting:
- The decision: concierges manage patient records (roster + per-patient profile, itinerary, care instructions, source documents) directly from the dashboard via Convex mutations, gated by the same lead/member RBAC as [ADR 016](.docs/decisions/016-concierge-ownership-and-rbac.md).
- Design: the `/patients` roster ([dashboard/features/patients/](dashboard/features/patients/)), the CRUD mutations in [convex/mutations.ts](convex/mutations.ts) (`upsertPatient`, `deletePatient`, `upsertItineraryEvent`, `deleteItineraryEvent`, `upsertCareInstruction`, `deleteCareInstruction`, `assignPatient`), and source-document uploads to Convex storage (`generateUploadUrl` → `createSourceDocument` → `deleteSourceDocument`), which the `/source-docs/[id]` route now serves alongside seeded PDFs.
- Then register it in [.docs/decisions/README.md](.docs/decisions/README.md): add the row 020, and add it to the relevant grouping lists (Dashboard; Concierge experience).
- Reference ADR 020 from the root and dashboard README patient-management edits in steps 1.

## Verification
- After edits, re-grep the docs for the documented routes/mutations/env vars to confirm each matches code; run `pnpm typecheck` is unaffected (docs-only change).