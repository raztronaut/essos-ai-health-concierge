# @essos/dashboard

The admin dashboard — the single pane of glass over every conversation, escalation, and bit of agent telemetry. Next.js (App Router) + React + Tailwind v4. It reads the shared SQLite store directly through `@essos/shared` (no API layer) and mutates via Server Actions. See [ADR 007](../.docs/decisions/007-admin-dashboard-architecture.md) and [ADR 003](../.docs/decisions/003-human-handoff-and-takeover.md).

## Views

| Route | Purpose |
| --- | --- |
| `/` | Overview: telemetry (patients, conversations, open flags, autonomous vs escalated) + the live open-escalation queue. |
| `/conversations` | All conversations, most-recent first, with automation-state and open-flag badges. |
| `/conversations/[id]` | Thread view: messages, patient summary, per-thread flags + actions, activity log. |
| `/patients/[id]` | Itinerary timeline, care instructions (with `source_status`/`answer_policy`), and source documents. |
| `/source-docs/[id]` | Route handler streaming the seeded PDF from `mock-assets/pdf/essos/` (Markdown fallback). |

## Server actions

`app/actions.ts` exposes `resolveEscalationAction`, `takeOverConversationAction`, and `resumeAutomationAction`, which call `resolveEscalation` / `markConciergeTakeover` / `resumeAutomation` from `@essos/shared`, then `revalidatePath`. These power the take over / resolve / resume Eve buttons.

## Data source

Server Components call the `@essos/shared` repo helpers directly at request time against `.data/essos.db`. Pages that read the DB use `dynamic = "force-dynamic"` so each load reflects current data (and agent/transport writes appear on reload). Runs in the Node runtime (not Edge) because of `node:sqlite`.

## Config notes

- `next.config.mjs`: `serverExternalPackages: ["@essos/shared"]` keeps the native `node:sqlite` dependency unbundled; `outputFileTracingRoot` is pinned to the repo root.
- Brand tokens (surface `#F5F1E5`, ink `#171715`, primary `#0000EE`, secondary `#BCB6A7`) are declared via `@theme` in `app/globals.css`.

## Run

```bash
# requires a seeded DB (pnpm seed) and a built @essos/shared (pnpm --filter @essos/shared run build)
pnpm dashboard:dev          # http://localhost:4000
pnpm --filter @essos/dashboard run build
pnpm --filter @essos/dashboard run start
```
