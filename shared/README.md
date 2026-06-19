# @essos/shared

The shared foundation: the SQLite schema, a typed data-access layer, the escalation taxonomy, the local-places helper, the seed, and config. The Eve agent tools, the transport, and the dashboard all read/write through this package so behavior stays consistent. Built to `dist/` and consumed as `@essos/shared`.

## Modules (`src/`)

| Module | Purpose |
| --- | --- |
| `db.ts` | Opens the local SQLite store (`node:sqlite` `DatabaseSync`), creates the schema, runs lightweight migrations, and exposes `getDb` / `resetDb`. |
| `types.ts` | Row/domain types (Patient, ItineraryEvent, CareInstruction, SourceDocument, Conversation, Message, Escalation, ActivityLogEntry) and enums. |
| `taxonomy.ts` | The escalation categories, per-category policy (autonomous? default level), and helpers. See [ADR 001](../.docs/decisions/001-escalation-taxonomy.md). |
| `repo.ts` | The query/command layer: patients, source documents, itinerary, care instructions, conversations, messages, escalations, activity log. |
| `places.ts` | `searchLocalPlaces` — Google Places (Text Search) when `GOOGLE_PLACES_API_KEY` is set, else curated offline results. |
| `seed.ts` | Loads `mock-assets/` fixtures into the DB (`pnpm seed` / `pnpm seed:reset`). |
| `config.ts` | Resolves the repo root (marker search) and the DB path (`ESSOS_DB_PATH`, default `.data/essos.db`); exposes `REPO_ROOT`. |
| `index.ts` | Barrel re-export. |

## Schema

Tables: `patients`, `source_documents`, `itinerary_events`, `care_instructions`, `conversations`, `messages`, `escalations`, `activity_log` (with indexes). `getDb()` creates the schema if missing and runs additive migrations (e.g. `source_document_id` columns). The care-instructions model carries `source_type`, `source_status`, and `answer_policy` — see [ADR 002](../.docs/decisions/002-care-instructions-source-of-truth.md).

## Handoff helpers

`repo.ts` implements the automation-state model from [ADR 003](../.docs/decisions/003-human-handoff-and-takeover.md): `setAutomationState`, `markConciergeTakeover`, `resumeAutomation`, plus escalation lifecycle (`createEscalation`, `listEscalations`, `takeOverEscalation`, `resolveEscalation`) and `logActivity` for telemetry. `ensureConversation`/`appendMessage` are aliases used by the transport.

## Config / paths

`config.ts` walks up to find the repo root (the `essos-concierge` `package.json`), so the same DB file is resolved whether the package is consumed from source, a workspace symlink, or the agent's `link:` copy. Override the DB location with `ESSOS_DB_PATH`.

## Commands

```bash
pnpm --filter @essos/shared run build        # tsc -> dist/
pnpm --filter @essos/shared run typecheck
pnpm seed        # from repo root: append fixtures
pnpm seed:reset  # drop + recreate + reseed
```
