# Concierge Patient Ownership and Role-Based Access

## Decision

Patients (and their conversations and escalations) carry an **owning concierge** (`assignee_user_id`, a Clerk user id). The dashboard scopes what each signed-in concierge sees by ownership and role, inside a **single Clerk Organization**:

- **Team lead** (`org:admin`): sees every patient, can (re)assign anyone, sees the whole team's metrics.
- **Concierge** (`org:member`): sees their assigned patients plus the **unassigned queue**, and can self-claim an unassigned patient.
- The **open-escalation queue** stays shared across the team so any concierge can triage/claim a flag.

The machine path (Eve agent + Spectrum transport) is **not** ownership-aware — it always operates per-patient regardless of assignment.

## Why

A real concierge team has many patients and a division of labour: each rep owns a book of patients, leads see everything, and nobody should wade through other reps' threads to find their own. The previous build returned all data to everyone and attributed work to a single `"dashboard"` actor, so "my patients", per-rep workload, and time-to-first-response were impossible. Ownership + roles make the console usable for a team and make the [team analytics](015-agent-telemetry-and-analytics.md) attributable.

Single-org (not multi-clinic) is deliberate for the trial: it delivers real roles/identity without stamping `orgId` onto patient data. True multi-tenancy (multiple clinics as separate orgs, org-scoped reads and machine path) is a clean follow-up, not a rewrite — the ownership plumbing is the hard part and it's in place.

## Design

- **Schema** ([convex/schema.ts](../../convex/schema.ts)): `assignee_user_id` added to `patients`, `conversations`, `escalations` with a `by_assignee` index each. It is `v.optional(...)` so rows written by external/live writers (e.g. the transport before a deploy) never break the schema; new writes always set it.
- **Identity ctx** ([convex/lib/functions.ts](../../convex/lib/functions.ts)): `conciergeQuery`/`conciergeMutation` resolve `clerkId`, `role`, and `isLead` from the Clerk JWT. The dev fallback (no Clerk) is treated as a lead so the local demo shows everything.
- **Scoped reads** ([convex/queries.ts](../../convex/queries.ts)): list reads use `Patients.listForConcierge` (index-backed: own + unassigned, or all for leads); detail reads assert access via `Patients.canAccess` and throw otherwise.
- **Assignment** ([convex/mutations.ts](../../convex/mutations.ts)): `assignPatient` — leads assign anyone; members self-claim only an unassigned patient. Assignment mirrors onto the patient's conversations; takeover/resolve stamp `assignee_user_id` so metrics key off a stable id, not a name string.
- **UI**: `<OrganizationSwitcher>` + role-gated `AssignControl` (lead dropdown / member "Claim"), a "Mine only" filter and owner badges on the conversation list, and a team view keyed on `assignee_user_id` with time-to-first-response.

## Consequences

- Concierges get a focused queue; leads get oversight; metrics attribute to real people.
- Cross-cutting reads (the escalation queue) stay shared by design — tune later if a clinic wants stricter isolation.
- Multi-tenant `orgId`-on-data is intentionally deferred; revisit when onboarding a second clinic/team.
