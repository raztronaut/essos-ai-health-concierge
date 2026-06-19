# @essos/shared

The shared foundation for the backend processes: domain types, the escalation taxonomy, the local-places helper, and the **Convex machine-path client**. The Eve agent tools and the transport import these so behavior stays consistent. Built to `dist/` and consumed as `@essos/shared`. (The dashboard reaches Convex directly via the React client + Clerk, not through this package.)

## Modules (`src/`)

| Module | Purpose |
| --- | --- |
| `types.ts` | Row/domain types (Patient, ItineraryEvent, CareInstruction, SourceDocument, Conversation, Message, Escalation, ActivityLogEntry, ConversationSummary) and enums. |
| `taxonomy.ts` | The escalation categories, per-category policy (autonomous? default level), and helpers. See [ADR 001](../.docs/decisions/001-escalation-taxonomy.md). |
| `convex.ts` | The machine-path client: async functions (`getPatientById`, `appendMessage`, `escalateToHuman`, `recordAgentTurn`, …) that POST to the Convex `/machine` HTTP action with the service secret. Keeps the old repo function names so the agent + transport changed minimally. See [ADR 013](../.docs/decisions/013-convex-backend.md). |
| `places.ts` | `searchLocalPlaces` — Google Places (Text Search) when `GOOGLE_PLACES_API_KEY` is set, else curated offline results. |
| `ids.ts` | `newId` / `nowIso` helpers. |
| `index.ts` | Barrel re-export. |

## Data layer

The source of truth is **Convex** ([convex/schema.ts](../convex/schema.ts), [ADR 013](../.docs/decisions/013-convex-backend.md)), not a local file. This package no longer contains a SQLite schema, repo, or seed — those moved to `convex/` (functions) and `scripts/seed.ts` (the fixture runner). The handoff model from [ADR 003](../.docs/decisions/003-human-handoff-and-takeover.md) lives in `convex/model/` and is exposed to the transport as `setAutomationState`, `markConciergeTakeover`, `resumeAutomation`, `escalateToHuman`, and `logActivity`.

## Config

The client reads `CONVEX_SITE_URL` (the deployment's HTTP-actions base; local default `http://127.0.0.1:3211`) and the optional `CONVEX_SERVICE_SECRET` bearer.

## Commands

```bash
pnpm --filter @essos/shared run build        # tsc -> dist/
pnpm --filter @essos/shared run typecheck
pnpm seed        # from repo root: load fixtures into Convex
pnpm seed:reset  # clear + reload fixtures
```
