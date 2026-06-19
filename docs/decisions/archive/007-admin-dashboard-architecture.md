# Admin Dashboard Architecture

## Decision

The admin dashboard is a Next.js (App Router) application in `dashboard/` that reads the shared SQLite store **directly** through `@essos/shared`'s repo layer, with no intermediate API. Mutations (resolve / take over / resume) are Next **Server Actions** that call the same repo functions and then `revalidatePath`. It is the single pane of glass described in [003-human-handoff-and-takeover.md](003-human-handoff-and-takeover.md).

## Why direct DB reads, no API layer

The agent, transport, and dashboard all run locally against one SQLite file, and the dashboard is a read-mostly internal operations tool. Server Components can call the `@essos/shared` repo helpers (`listConversations`, `listEscalations`, `listItinerary`, ...) directly at request time, which avoids a redundant HTTP/API tier and keeps behavior identical across the agent tools, transport, and dashboard. This matches the local-first MVP architecture and keeps the shared schema the single source of truth.

## Key configuration

- **`serverExternalPackages: ["@essos/shared"]`** in [dashboard/next.config.mjs](../../../dashboard/next.config.mjs): `@essos/shared` uses the native `node:sqlite` module and `import.meta.url` to locate the repo root + DB file. Keeping it external (not bundled) preserves that path resolution and the native binding.
- **`outputFileTracingRoot`** pinned to the repo root so Next does not mis-infer the workspace root from a stray `package-lock.json` in `$HOME`.
- Pages that read the DB use `export const dynamic = "force-dynamic"` so every load reflects current data.

## Views (single pane of glass)

- **Overview** (`/`): telemetry (patients, conversations, open flags, autonomous replies vs escalated) plus the live open-escalation queue.
- **Conversations** (`/conversations`, `/conversations/[id]`): list and thread view with patient summary, automation-state badge, per-thread flags, and activity log.
- **Patient + itinerary** (`/patients/[id]`): itinerary timeline, care instructions with `source_status`/`answer_policy`, and source documents.
- **Source documents** (`/source-docs/[id]`): a Node route handler that serves the seeded PDF from `mock-assets/pdf/essos/` inline (falling back to the Markdown source, then a 404). Documents are small fixtures, so the body is read fully into memory rather than streamed.

## Server actions

`resolveEscalationAction`, `takeOverConversationAction`, and `resumeAutomationAction` in [dashboard/app/actions.ts](../../../dashboard/app/actions.ts) call `resolveEscalation`, `markConciergeTakeover`, and `resumeAutomation` from `@essos/shared`, then `revalidatePath` the affected routes. This implements the dashboard actions required by the handoff decision (003).

## Styling & shared UI

Tailwind CSS v4 with brand tokens (surface `#F5F1E5`, ink `#171715`, primary `#0000EE`, secondary `#BCB6A7`) extracted from `.essos_branding`, declared via `@theme` in `dashboard/app/globals.css`. Reusable primitives (`Card`, `Button`, `Stat`, `Row`, `CareRow`, `PageHeader`, badges, the shared `ROLE_LABEL` map) live in [dashboard/lib/ui.tsx](../../../dashboard/lib/ui.tsx); the `rounded-card` radius comes from the `--radius-card` theme token.

## Route states

Root-level `loading.tsx`, `error.tsx`, and `not-found.tsx` provide the streaming skeleton, the error boundary (with retry), and the `notFound()` target for unknown conversation/patient ids.

## Consequences

- The dashboard requires the seeded DB (`pnpm seed`) and `@essos/shared` to be built; it runs in the Node runtime (not Edge) because of `node:sqlite`.
- Because it reads the DB directly, the dashboard reflects agent/transport writes immediately on reload — no sync layer.
- Run with `pnpm dashboard:dev` (http://localhost:4000).
