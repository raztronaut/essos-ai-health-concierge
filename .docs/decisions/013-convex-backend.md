# Convex Backend (supersedes the local SQLite store)

## Decision

The shared source of truth moves from a local SQLite file (`node:sqlite` via `@essos/shared`) to **Convex** — a reactive, hosted document database. The schema lives in [convex/schema.ts](../../convex/schema.ts); reads/writes go through Convex functions. This supersedes the local-SQLite parts of [ADR 007](007-admin-dashboard-architecture.md).

The motivating product win is **reactivity**: the dashboard subscribes to Convex queries (`useQuery`), so escalations, messages, and telemetry update live with no reload — the right behavior for a 3am operations console. It also makes the system deployable beyond a single machine.

## Two-path access model

Convex has two classes of caller, with different auth:

1. **Dashboard (human path).** Clerk-authenticated. Public queries/mutations in [convex/queries.ts](../../convex/queries.ts) and [convex/mutations.ts](../../convex/mutations.ts) are wrapped by `conciergeQuery`/`conciergeMutation` ([convex/lib/functions.ts](../../convex/lib/functions.ts)), which resolve the signed-in concierge from `ctx.auth` (see [ADR 014](014-clerk-auth-and-identity.md)).
2. **Agent + transport (machine path).** They have no Clerk identity, so they call a single service-secret-guarded HTTP action, `/machine` in [convex/http.ts](../../convex/http.ts), which dispatches to a whitelist of `internal*` functions in [convex/machine.ts](../../convex/machine.ts). Auth is `Authorization: Bearer $CONVEX_SERVICE_SECRET`, mirroring the existing `ESSOS_TRANSPORT_SECRET` pattern. The thin client lives in [shared/src/convex.ts](../../shared/src/convex.ts) and keeps the old repo function names (now async) so the agent tools and transport changed minimally.

This keeps the public API auth-gated while giving trusted backends one authenticated door, satisfying Convex's "auth checks in all public functions" guidance.

## Conventions (from the Convex plugin ruleset)

- **Index-backed reads only** — no `.filter()` scans. Legacy string ids (`pat_maya`, `conv_…`) are preserved as an indexed `id` column alongside Convex's `_id`, so the `ESSOS_CONTEXT` contract and tool I/O are unchanged.
- **Never `Date.now()` inside a query** (it breaks caching/reactivity). Time-derived analytics take the window/`now` as an argument from the client.
- **Thin function wrappers, logic in a `convex/model/` layer** shared by public + internal functions.
- Durable message latches (`disclosure`, `handoff_holding`, `reminder`) use a promoted, indexed `meta_kind` field (`by_conversation_and_kind`) instead of scanning JSON.

## Local vs hosted

`npx convex dev` provisions a local (anonymous) deployment for the work-trial demo — no account required — writing `CONVEX_DEPLOYMENT`/`CONVEX_URL`/`CONVEX_SITE_URL` to `.env.local`. The same code deploys to Convex Cloud with `npx convex deploy`.

## Consequences / trade-offs

- **Data residency:** patient records now live in Convex cloud (when hosted). This softens the strict "PHI off third parties" posture, but model routing stays direct-Anthropic ZDR ([ADR 006](006-model-routing-direct-anthropic.md)) and trial data remains notional. A production build would revisit BAA/residency.
- The dashboard no longer needs `node:sqlite`, `dynamic = "force-dynamic"`, or `serverExternalPackages`; it uses the Convex React client instead.
- Seeding is a Node runner ([scripts/seed.ts](../../scripts/seed.ts)) that parses the fixture pack and calls a Convex import mutation ([convex/seed.ts](../../convex/seed.ts)), since Convex functions can't read the filesystem.
