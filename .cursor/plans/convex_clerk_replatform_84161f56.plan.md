---
name: Convex Clerk Replatform
overview: Re-platform the Essos concierge from local SQLite to Convex (reactive backend/db) with Clerk auth, then use the new foundation to add deep AI observability and concierge-team performance analytics, while removing demo placeholders.
todos:
  - id: provision
    content: Provision Convex (npx convex dev) + Clerk app; enable Clerk Orgs; wire env vars, convex/auth.config.ts, ConvexProviderWithClerk, CONVEX_SERVICE_SECRET + webhook secret
    status: in_progress
  - id: schema
    content: "Define convex/schema.ts: port all SQLite tables (incl. new eve_session, suggested_reply(_sources), drafted/reminder events) + add agentTurns and users tables"
    status: pending
  - id: repo-port
    content: Recreate repo.ts as a convex/model/ helper layer exposed via public (Clerk-gated) + internal functions; conciergeMutation injects user; index-backed + paginated; incl. getEveSession/saveEveSession, hasMessageWithMetaKind, parseSuggestedReplySources, extended createEscalation
    status: pending
  - id: seed
    content: Migrate shared/src/seed.ts to a Convex seed mutation/import reading mock-assets/; update pnpm seed/seed:reset
    status: pending
  - id: machine-path
    content: Add convex/http.ts HTTP actions (Bearer CONVEX_SERVICE_SECRET -> internal functions) + a small essosConvex fetch client for the agent/transport machine path
    status: pending
  - id: rewire-agent
    content: Swap @essos/shared SQLite calls for essosConvex HTTP calls in all 7 eve-concierge tools and transport (core.ts, reminders.ts, outbound.ts, remind.ts)
    status: pending
  - id: telemetry-capture
    content: Extend transport/src/eveClient.ts to capture per-turn latency, tool calls, finishReason, tokens; persist agentTurns in core.ts
    status: pending
  - id: clerk-auth
    content: Add ConvexProviderWithClerk + middleware/proxy + Org RBAC to dashboard; retire hardcoded ASSIGNEE via conciergeMutation; sync users/orgs via storeUser + Clerk webhook httpAction
    status: pending
  - id: ai-performance
    content: Build dashboard/app/performance AI-observability view (resolution rate, latency p50/p95, tool usage, token/cost, draft acceptance, reminders) + per-turn inline telemetry
    status: pending
  - id: team-performance
    content: Build dashboard/app/team concierge-performance view (time-to-first-response, time-to-resolution, per-rep counts, queue age/SLA)
    status: pending
  - id: overview-live
    content: Revamp Overview telemetry-stats and make the escalation queue live via useQuery (preloadQuery + useQuery pattern)
    status: pending
  - id: reminders-cron
    content: After data layer lands, move transport/src/reminders.ts hourly sweep to a Convex scheduled function (convex/crons.ts) per ADR 011 forward note
    status: pending
  - id: placeholders-docs
    content: Label demo data, remove placeholders, update README + add ADRs 012-014 (Convex backend, Clerk identity, telemetry/analytics)
    status: pending
isProject: false
---

# Convex + Clerk Re-platform with AI & Team Observability

Move the source of truth from local SQLite to **Convex**, add **Clerk** concierge identity, capture the agent telemetry we currently throw away, and build the AI-performance and concierge-performance visibility the product needs. Demo-ready now, production-extensible.

> Aligned with the latest push (`4b97547` — AI-assist drafts, AI disclosure, proactive reminders, durable handoff state). [ADR 011](.docs/decisions/011-concierge-ai-assist-and-proactive-care.md) deliberately kept all new persistence behind `@essos/shared` "so the SQLite layer can later be swapped for Convex in one place." That work materially lowers the migration risk and adds new schema/helpers this plan now folds in.

## Guiding decisions
- **Two access paths, one Convex deployment** (refined per the Convex/Clerk plugin skills):
  - **Dashboard = human path.** Clerk-authenticated. Wire with `ConvexProviderWithClerk` from `convex/react-clerk` + `@clerk/nextjs` and a `convex/auth.config.ts` pointing at the Clerk JWT issuer (`CLERK_JWT_ISSUER_DOMAIN`) — NOT the generic WorkOS `convex.setAuth` pattern the quickstart defaults to. Public Convex functions gate on `ctx.auth.getUserIdentity()`.
  - **Agent + transport = machine path.** They have no Clerk user, so they call Convex **HTTP actions** (`convex/http.ts`) guarded by `Authorization: Bearer $CONVEX_SERVICE_SECRET`, which delegate to `internalMutation`/`internalQuery`. This keeps the public API Clerk-gated and satisfies the convex "auth checks in all public functions" rule, and mirrors the existing `ESSOS_TRANSPORT_SECRET` shared-secret pattern.
- **Concierge team = a Clerk Organization.** Model the team as a Clerk Org with roles (`org:admin` = team lead, `org:member` = concierge). Gives real RBAC on the dashboard via `has({ role })`/`<Show>`, attributes work to real people for team metrics, and lays multi-tenant foundations (multiple clinics/teams later) for the production goal.
- **Convex best-practice rules baked in** (from the plugin ruleset): index-backed queries (no `.filter()` scans), **never `Date.now()` inside a query** (pass time windows as args — affects all analytics), cursor pagination for message/activity lists, thin function wrappers with logic in a `convex/model/` helper layer shared by public + internal functions, arg + return validators on every function, and crons scheduling **internal** functions only. Use `convex-helpers` `customQuery`/`customMutation` to build `conciergeQuery`/`conciergeMutation` wrappers that inject the authenticated concierge user.
- **Keep the decoupling.** Eve <-> Spectrum stays HTTP; only the data layer changes from `@essos/shared` SQLite to Convex.
- **Preserve the PHI narrative.** Model routing stays direct-Anthropic ZDR ([ADR 006](.docs/decisions/006-model-routing-direct-anthropic.md)). Record a new ADR acknowledging patient data now lives in Convex cloud and the residency trade-off accepted for the trial.
- **`@essos/shared` becomes a thin client/types package** (generated `convex/_generated` API, shared TS types, taxonomy) so call sites across tools/transport/dashboard change as little as possible.
- **Tooling:** use the Convex MCP server during build, and run the **`convex-reviewer`** subagent over `convex/` before wrapping up for a best-practices pass.

## Phase 1 - Provision Convex + Clerk
- `npx convex dev` (use `dev`, never `deploy`) in repo root to create `convex/` and the dev deployment; add `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`, and `CONVEX_SERVICE_SECRET` (machine path) to `.env` / `.env.example`. The `user-convex` MCP server assists provisioning.
- Create a Clerk application; add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_JWT_ISSUER_DOMAIN`, and `CLERK_WEBHOOK_SIGNING_SECRET` (svix, for the user/org sync webhook). Wire Clerk->Convex via `convex/auth.config.ts` (provider = the Clerk issuer domain, applicationID `"convex"`).
- **Enable Clerk Organizations** (Dashboard → Organizations, or `clerk enable orgs`); pick a Membership mode (likely `Membership required` for this B2B ops tool) and define the concierge roles.
- Decide workspaces: add `convex` deps to root + `convex/react-clerk` + `@clerk/nextjs` to `dashboard/`; the isolated `eve-concierge` only needs `fetch` for the machine HTTP path (no Convex client necessary), reducing its dependency churn.

## Phase 2 - Convex schema (port + extend)
In `convex/schema.ts`, port every SQLite table from `shared/src/db.ts` (patients, sourceDocuments, itineraryEvents, careInstructions, conversations, messages, escalations, activityLog) with the same fields/indexes. Include the columns added by `4b97547`:
- `conversations.eve_session` (persisted `{ sessionId, continuationToken, turns }` for restart-safe session continuity).
- `escalations.suggested_reply` + `escalations.suggested_reply_sources` (the AI-assist draft and its source labels — map cleanly onto a Convex `escalations` document, as ADR 011 intended).
- `activityLog.event` enum now includes `drafted` and `reminder` (feed analytics for draft generation + proactive care).

Plus NEW tables:
- `agentTurns` - per-turn AI telemetry: conversationId, latencyMs, toolCalls (small bounded array), finishReason, promptTokens/completionTokens, escalated (bool), category, createdAt. Indexes `by_conversation` and `by_created` (analytics windows query by time range passed as an arg — never `Date.now()` in the query).
- `users` - concierge profiles synced from Clerk: `tokenIdentifier` (+ `by_token` index, the canonical Convex pattern), `clerkId`, name, email, `orgId`, role. Plus a `storeUser` upsert mutation called on first sign-in.

Schema refinements from the plugin rules:
- **Promote `meta.kind` to a top-level indexed field** on `messages` (e.g. `metaKind`) so `hasMessageWithMetaKind` (disclosure / handoff_holding / reminder latches) uses an index instead of scanning — index `by_conversation_and_kind`.
- Index the outbound bridge (`role` + `outbound` status) so `listPendingOutbound` is index-backed; keep `pending|sent` semantics.
- `escalations` index `by_status_and_created` for the live queue; `messages` `by_conversation_and_created` for paginated threads.
- All fields use strict `v.*` validators; enums via `v.union(v.literal(...))`; timestamps as `v.number()`.

## Phase 3 - Port the repo layer to Convex functions
Put the real logic in a `convex/model/` helper layer (thin function wrappers per the convex rules), then expose it two ways: **public** queries/mutations (Clerk-gated, for the dashboard) and **internal** queries/mutations (for the machine HTTP path + crons). Organize by domain (`convex/conversations.ts`, `convex/escalations.ts`, `convex/messages.ts`, `convex/activity.ts`, `convex/patients.ts`, `convex/telemetry.ts`). Every function gets `args` + `returns` validators. Mirror the existing transactional behaviors:
- `markConciergeTakeover`, `resumeAutomation`, `resolveEscalation` (now writing the real Clerk `assignee`).
- `enqueueConciergeOutbound` / `listPendingOutbound` / `markOutboundDelivered` (transport delivery loop).
- `listConversationSummaries` denormalized list (single query, no N+1).
- Helpers added by `4b97547`: `getEveSession` / `saveEveSession`, `hasMessageWithMetaKind` (now index-backed via the `by_conversation_and_kind` index), `parseSuggestedReplySources`, and the extended `createEscalation` (accepts `suggested_reply` + `suggested_reply_sources`).
- Dashboard read functions become reactive queries; long lists (`listMessages`, `listAllActivity`, conversation list) use cursor `.paginate()` not `.collect()`.
- Dashboard mutations use `conciergeMutation` (a `convex-helpers` custom mutation) that resolves and injects the authenticated concierge user, so `assignee`/actor is stamped automatically — this is what retires the hardcoded `ASSIGNEE = "dashboard"`.

## Phase 4 - Migrate seed
Convert `shared/src/seed.ts` into a Convex seed mutation/action (or `npx convex import`) reading `mock-assets/`. Preserve the 3 patients, source docs, itineraries, care docs, and the pre-seeded "stranded at arrivals" escalation. Update root `pnpm seed` / `seed:reset` scripts.

## Phase 5 - Rewire Eve tools + transport (machine path)
- Expose the internal queries/mutations the agent/transport need as **Convex HTTP actions** in `convex/http.ts`, authenticated by `Authorization: Bearer $CONVEX_SERVICE_SECRET`. Add a tiny shared `essosConvex` fetch client (in `@essos/shared`) so call sites stay terse.
- All 7 tools in `eve-concierge/agent/tools/*.ts` and `transport/src/core.ts` swap `@essos/shared` SQLite repo calls for `essosConvex` HTTP calls (functions are already `async`). `escalate_to_human.ts` now also writes the `suggested_reply` draft; `update_logistics.ts` and `get_*` tools map 1:1.
- Transport `src/core.ts` write paths (`appendMessage`, `ensureConversation`, `markConciergeTakeover`, disclosure + holding-notice latches via `hasMessageWithMetaKind`, `saveEveSession`) go through the machine path.
- The new transport modules from `4b97547` are also `@essos/shared` consumers and must be rewired: `transport/src/reminders.ts` (`listConversations`, `listItinerary`, `listCareInstructions`, `hasMessageWithMetaKind`, `appendMessage`, `logActivity`), `transport/src/outbound.ts`, and the `transport/src/remind.ts` one-shot.

## Phase 6 - Capture agent-turn telemetry (the big visibility win)
Extend `transport/src/eveClient.ts`: today `reduceEveEvents` discards everything but final text. Capture per turn: wall-clock latency, tool-call names/count (from `step.*` / tool-call events), `finishReason`, and token usage if present in the stream. Persist an `agentTurns` row after each turn in `core.ts` step 6. This is what powers AI observability without touching the agent.

## Phase 7 - Clerk auth + real concierge identity
- Add `ClerkProvider` + `ConvexProviderWithClerk` (from `convex/react-clerk`) to `dashboard/`, plus Clerk middleware. Note: Next.js 16 uses `proxy.ts`; Next.js <=15 uses `middleware.ts` — check the dashboard's Next version and name the file accordingly. Protect all routes except the webhook endpoint.
- Model the team via Clerk **Organizations**: gate sensitive actions/pages with `has({ role: 'org:admin' })` / `<Show>`; add `<OrganizationSwitcher hidePersonal />` and (later) member invitations via the Backend API.
- Retire the hardcoded `ASSIGNEE = "dashboard"` in `dashboard/lib/actions.ts`: server actions call `conciergeMutation`s that resolve the signed-in user server-side, so takeover/resume/resolve/reply are stamped with the real concierge.
- **User/org sync two ways:** `storeUser` upsert on first sign-in (synchronous, for immediate use), plus a **Clerk webhook** Convex `httpAction` (`convex/http.ts`, verified with the svix signing secret) handling `user.created/updated/deleted` and `organizationMembership.*` to keep the `users`/membership tables current even for offline members (the skill warns webhooks are eventually consistent, so they back up — not replace — the session-token path).

## Phase 8 - AI performance / observability view
New `dashboard/app/performance/page.tsx` + `features/performance/` reading `agentTurns` + `escalations` + `activityLog`:
- Autonomous resolution rate (answered vs escalated), escalation rate by category/level.
- Latency p50/p95, tool-usage distribution, token/cost totals and trend over time.
- **AI-assist draft quality** (new in `4b97547`): draft-generation rate (escalations with `suggested_reply`) and draft acceptance — sent as-is vs edited vs cleared (compare the drafted text to what the concierge actually sent). This is a high-signal AI+human metric the new schema now makes possible.
- **Proactive care**: pre-op reminders sent (`activityLog` event `reminder`) and disclosure coverage.
- Per-conversation turn timeline; surface latency/tools/tokens inline in `features/conversations/message-thread.tsx`.

## Phase 9 - Concierge team performance view
New `dashboard/app/team/page.tsx` + `features/team/` computing from `escalations` + `activityLog` + `users` (scoped to the active Clerk Org's members):
- Time-to-first-response (escalation.createdAt -> taken_over) and time-to-resolution (-> resolvedAt, already modeled).
- Per-rep resolved/taken-over counts, open-queue age, simple SLA flags. Per-member view keyed off org membership + role.

> Convex-rule constraint for Phases 8-9: queries must NOT call `Date.now()` (it breaks caching/reactivity). Pass the analytics window / "now" as an argument from the client (or a server component), and compute p50/p95, queue age, and "today" against that arg. Keep all reads index-backed and paginated.

## Phase 10 - Revamp Overview + go live
- Rebuild `dashboard/features/overview/telemetry-stats.tsx` (4 stats today) into a richer, reactive summary (containment rate, open-flag age, latency, today's volume) using `useQuery` so the escalation queue updates live.
- Use Convex's Next.js pattern: `preloadQuery` in server components for first paint, `useQuery` for live updates.

## Phase 11 - Remove placeholders + document
- Notional patient data stays (intentional fixtures) but clearly labeled demo vs real; keep `source_status: demo_notional`.
- Update README architecture diagram + setup (Convex/Clerk env, `npx convex dev`).
- New ADRs (011 is taken by the AI-assist push): **012** (Convex backend supersedes local-SQLite parts of [ADR 007](.docs/decisions/007-admin-dashboard-architecture.md); document the two-path access model — Clerk public functions vs service-secret HTTP actions), **013** (Clerk auth + Organizations-as-team + concierge identity), **014** (agent-turn telemetry + analytics). Note the data-residency trade-off vs the [ADR 006](.docs/decisions/006-model-routing-direct-anthropic.md) PHI stance.
- Before wrapping each Convex milestone, run the **`convex-reviewer`** subagent over `convex/` to catch missing validators, `.filter()` scans, `Date.now()`-in-query, and unprotected public functions.

## Opportunity unlocked by the new push
- `transport/src/reminders.ts` `startReminderLoop` is an hourly in-process sweep that ADR 011 explicitly flags as a future **Convex scheduled function**. Two-step migration respecting the constraints:
  1. **Now:** make dedup/state durable in Convex (`metaKind = "reminder"` latch via the indexed query); keep the actual Spectrum send in the transport (the Spectrum SDK lives there). Lowest risk.
  2. **Fuller:** move scheduling to `convex/crons.ts`, which (per the convex `scheduler-usage` rule) must schedule an **internal** function only — an `internalAction` that selects due reminders via an `internalQuery`, then triggers delivery. Because Spectrum delivery lives in the transport, the cron either hits a transport HTTP send endpoint or the transport subscribes to a "due reminders" Convex query. Server-side scheduling then survives transport restarts.

## Risks / sequencing notes
- Biggest blast radius is Phases 3+5 (repo layer touches all three surfaces: 7 Eve tools, `core.ts`, and now `reminders.ts` / `outbound.ts` / `remind.ts`); land schema+functions first, migrate one surface at a time, keep `pnpm typecheck` green.
- Convex is async/hosted vs `node:sqlite` sync/local - the `dynamic = "force-dynamic"` + `serverExternalPackages` config in the dashboard goes away, replaced by Convex providers.
- The durable latches now rely on `hasMessageWithMetaKind` (meta `kind` + since-timestamp filtering) — make sure the Convex `messages` table indexes `conversationId` and stores `meta.kind` queryably so disclosure/holding/reminder dedup stays correct after the swap.
- Verify the Eve stream actually emits token usage; if not, telemetry ships latency + tools + finishReason and tokens are a follow-up.