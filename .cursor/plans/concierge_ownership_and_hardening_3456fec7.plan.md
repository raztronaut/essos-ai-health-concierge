---
name: Concierge ownership and hardening
overview: "Finish and harden the Convex+Clerk replatform: close the convex-reviewer findings, add an assigned-patient ownership model with real RBAC inside a single Clerk Org, wire a clean test/dev-accounts story, and make app startup robust."
todos:
  - id: convex-correctness
    content: Add returns validators to all Convex functions; bound listMessages with pagination; fix overviewStats to query open escalations directly; reduce instead of Math.max spread in teamPerformance
    status: pending
  - id: ownership-schema
    content: Add assignee_user_id (+ by_assignee index) to patients/conversations/escalations; extend Concierge ctx with clerkId/role/isLead
    status: pending
  - id: ownership-scoping
    content: Scope public list/detail reads by assignee+unassigned for members (all for leads); add assignPatient mutation + self-claim; stamp assignee_user_id on takeover/resolve; keep machine path unscoped
    status: pending
  - id: rbac-ui
    content: Enable Clerk Orgs; add OrganizationSwitcher, has()/<Show> gating, My-patients/All toggle, lead-only controls; ensure org claims in convex JWT template; flip ESSOS_REQUIRE_AUTH after verifying real sign-in
    status: pending
  - id: team-metrics
    content: Rekey teamPerformance on escalations.assignee_user_id joined to users; add time-to-first-response; surface owner/load on cards
    status: pending
  - id: test-dev-accounts
    content: Seed demo Org + 2-3 concierge members via Backend API and assign sample patients (pnpm seed:team); env-guard seed mutations; document Clerk test identifiers and dev/prod Convex split; add CLERK_TESTING_TOKEN slot
    status: pending
  - id: clean-startup
    content: Make pnpm dev wait for Convex :3210, add dev-preflight script + dashboard connection banner, and a single documented entrypoint in README
    status: pending
  - id: docs-review
    content: Update README + finish ADRs 012-014 (assigned-ownership + single-org); re-run convex-reviewer; keep typecheck/build green
    status: pending
isProject: false
---

# Concierge Ownership + Replatform Hardening

Builds on the completed Convex+Clerk migration. Scope decided with you: **assigned ownership** (each patient/conversation has an owning concierge; members see their assigned + the shared queue, team leads see all) inside a **single Clerk Organization** (real roles/identity, no `orgId` stamped on patient data yet). The machine path (agent/transport) stays unscoped — Eve always operates per-patient.

## A. Convex correctness pass (close the reviewer findings)
- Add `returns:` validators to every function in [convex/queries.ts](convex/queries.ts), [convex/mutations.ts](convex/mutations.ts), [convex/users.ts](convex/users.ts), [convex/machine.ts](convex/machine.ts). Define shared doc validators (e.g. `patientDoc`, `escalationDoc`) and explicit `v.object({...})` for the aggregate shapes (`overviewStats`, `aiPerformance`, `teamPerformance`). Satisfies the `argument-validation` workspace rule and locks the HTTP contract.
- `overviewStats` in [convex/queries.ts](convex/queries.ts): query open escalations directly via `Escalations.listByStatus(ctx, "open")` instead of collecting all + filtering in memory.
- Bound `listMessages`: switch `Messages.list` to cursor `.paginate()` (or `.order("desc").take(n)`) in [convex/model/messages.ts](convex/model/messages.ts) + [convex/queries.ts](convex/queries.ts), and update [conversation-detail-view.tsx](dashboard/features/conversations/conversation-detail-view.tsx) to use `usePaginatedQuery`.
- `teamPerformance`: replace `Math.max(...open.map())` spread with a reduce (avoids arg-limit blowups).
- Note `overviewStats`/`aiPerformance` full-table counts as acceptable at demo scale; leave a comment pointing at `@convex-dev/aggregate` as the scale path (don't add the dep now).

## B. Assigned-ownership data model
- Schema ([convex/schema.ts](convex/schema.ts)): add `assignee_user_id: v.union(v.string(), v.null())` (Clerk user id) to `patients`, `conversations`, and `escalations`; add `.index("by_assignee", ["assignee_user_id"])` to each. Keep the existing `escalations.assignee` string label for display.
- Concierge ctx ([convex/lib/functions.ts](convex/lib/functions.ts)): extend `Concierge` with `clerkId`, `role`, and `isLead` (`role === "org:admin"`). Already resolves `orgId`/identity — add role.
- Scope public reads by the signed-in concierge:
  - Members: `listPatients`/`listConversationSummaries` return patients where `assignee_user_id === clerkId` OR `null` (unassigned). Leads: everything.
  - The open-escalation **queue** (`listOpenEscalations`) stays shared so anyone can triage/claim.
  - Per-conversation/per-patient detail reads add an ownership check (lead, owner, or unassigned) and throw otherwise.
- Assignment mutations in [convex/mutations.ts](convex/mutations.ts): `assignPatient({ patientId, assigneeUserId })` (lead-only or self-claim of unassigned), and stamp `escalations.assignee_user_id = ctx.concierge.clerkId` on takeover/resolve so metrics key off a stable id, not a name string.
- Machine path unchanged: `internal*` functions in [convex/machine.ts](convex/machine.ts) keep returning everything (agent isn't org/assignee aware).

## C. RBAC + Clerk Org UI
- Enable Organizations on the Clerk instance (`clerk enable orgs`, `Membership required`); confirm `org:admin` (team lead) and `org:member` (concierge) roles.
- Add `<OrganizationSwitcher hidePersonal />` near [concierge-identity.tsx](dashboard/components/layout/concierge-identity.tsx); ensure the `convex` JWT template includes `org_id`/`org_role` claims so `ctx.auth.getUserIdentity()` carries them.
- Gate UI with `<Show when={{ role: 'org:admin' }}>`: assignment controls, resume-automation, and a `/team` lead-only view. Add a "My patients / All" toggle for members.
- Enforce server-side too: lead-only mutations check `ctx.concierge.isLead`.
- Turn on backend defense-in-depth: `npx convex env set ESSOS_REQUIRE_AUTH true` once a real sign-in is verified end-to-end (documented as the final flip).

## D. Team + AI performance, keyed on identity
- `teamPerformance` ([convex/queries.ts](convex/queries.ts)): compute per-rep tallies off `escalations.assignee_user_id` joined to `users` (not the name-string match it does now), and add time-to-first-response (escalation `created_at` → first `taken_over` activity).
- Surface assignment + owner on the conversation/overview cards so leads can see load distribution.

## E. Sample / test / dev accounts (best practices)
- Keep Clerk on the **test instance** (`pk_test_*`/`sk_test_*`, already set). Use Clerk's built-in test identifiers for demos/E2E: emails like `you+clerk_test@example.com` and phone `+15555550100` with OTP `424242` (no real inbox needed).
- Seed a **demo concierge team**: create one Org + 2-3 members with mixed roles via the Backend API (`clerk api -X POST /v1/organizations` and `.../memberships`), then assign the 3 sample patients across them so the assigned-ownership and team views are populated out of the box. Add a `pnpm seed:team` script that calls `clerk api` + the Convex assignment mutation.
- Guard seeding: env-gate `clearAll`/`importAll` in [convex/seed.ts](convex/seed.ts) behind `ESSOS_ALLOW_SEED` (or move to `internalMutation` reached only via the machine path) so they can't run against a hardened deployment.
- For E2E later: `setupClerkTestingToken()` + `storageState` (per `clerk-testing`); add a `CLERK_TESTING_TOKEN` slot to `.env.example`. Rotate the committed-to-`.env.local` `sk_test_*` as hygiene (low risk, gitignored).
- Document the dev vs prod Convex deployment split and the one-time `npx convex env set` list (`CLERK_JWT_ISSUER_DOMAIN`, `CONVEX_SERVICE_SECRET`, `ESSOS_REQUIRE_AUTH`).

## F. Clean, simple startup (your last ask)
- Make `pnpm dev` robust in [package.json](package.json): keep `concurrently` for convex/eve/web but (1) start `convex dev` first and **wait for `:3210`** before the dashboard mounts queries, and (2) give the dashboard a friendly "connecting to backend" state instead of the silent `ws 1006` hang seen in the transcript.
- Add a tiny preflight (`scripts/dev-preflight.ts`): verify `.env.local` has `NEXT_PUBLIC_CONVEX_URL`, ping Convex health, and print one-line guidance if the backend isn't up. Surface a Convex connection banner in [ConvexClientProvider.tsx](dashboard/app/ConvexClientProvider.tsx) using the client's connection state.
- Single documented entrypoint in the README: `pnpm setup` (install + `convex dev --once` + seed + seed:team) then `pnpm dev`. Clarify Convex must stay running alongside the dashboard.

## G. Docs + final review
- Update README architecture/setup and finish ADRs 012-014 (note the assigned-ownership model and single-org decision; keep multi-tenant `orgId`-on-data as an explicit future ADR).
- Re-run the `convex-reviewer` subagent over `convex/` after A-D; confirm `returns` validators, no unbounded reactive reads, and ownership scoping on public reads. Keep `pnpm typecheck` + `pnpm build` green throughout.

## Sequencing / risk
- Land A (validators/bounds) first — low risk, satisfies rules. Then B (schema migration: new nullable fields are additive/back-compatible; backfill `assignee_user_id` via seed:team). Then C/D (RBAC + scoped reads — the real behavior change; test signed-in as both a member and a lead). E/F/G are independent and can interleave.
- Watch the JWT template: org claims must be present or `isLead`/scoping silently degrades to "member sees only unassigned". Verify a real signed-in identity before flipping `ESSOS_REQUIRE_AUTH`.