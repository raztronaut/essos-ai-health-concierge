# @essos/dashboard

The admin dashboard — the single pane of glass over every conversation, escalation, patient record, and bit of agent telemetry. Next.js (App Router) + React + Tailwind v4. It is **reactive**: it subscribes to Convex queries with `useQuery`, so escalations, messages, and telemetry update live with no reload. Auth is **Clerk** (optional for local demos). See [ADR 007](../docs/decisions/archive/007-admin-dashboard-architecture.md), [ADR 013](../docs/decisions/archive/013-convex-backend.md), [ADR 014](../docs/decisions/archive/014-clerk-auth-and-identity.md).

## Views

| Route | Purpose |
| --- | --- |
| `/` | Overview: live telemetry tiles + the live open-escalation queue. |
| `/conversations` · `/conversations/[id]` | All conversations with automation-state/flag badges; thread view with patient summary, per-thread actions, AI-draft reply box, activity log. |
| `/patients` · `/patients/[id]` | Roster (search, filters, lead assign / member claim, create) and editable patient profile: itinerary, care instructions, source documents (upload). |
| `/performance` | AI observability: autonomy rate, latency p50/p95, tool usage, tokens, draft quality, daily volume. |
| `/team` | Concierge performance: resolution time, queue age, per-rep workload (scoped to the active Clerk org). |
| `/source-docs/[id]` | Route handler serving seeded PDFs + uploaded documents from Convex storage inline (Markdown fallback, then 404). |
| `/api/webhooks` | Clerk → Convex user/org sync webhook (svix-verified). |

## Data + auth

- **Reads** are `useQuery(api.queries.*)` in client view components, so the UI is reactive; server page files stay thin.
- **Writes** are `useMutation(api.mutations.*)` — handoff (`resolveEscalation`, `takeOverConversation`, `resumeAutomation`, `sendConciergeReply`), ownership (`assignPatient`), patient records and documents (`upsertPatient`, `upsertItineraryEvent`, `upsertCareInstruction`, `generateUploadUrl`, `createSourceDocument`, …). The signed-in concierge is resolved server-side and stamped as the actor. Eve reads the same patient tables via the machine path, so dashboard edits show up on its next tool call. See [ADR 020](../docs/decisions/archive/020-patient-management-crud.md).
- **Auth**: `app/ConvexClientProvider.tsx` wires `ConvexProviderWithClerk` when `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set, otherwise a plain `ConvexProvider` (dev "demo concierge"). `proxy.ts` (Next 16 middleware) is a **passthrough**; server-side `ESSOS_REQUIRE_AUTH` on Convex is the fail-closed control. See [ADR 014](../docs/decisions/archive/014-clerk-auth-and-identity.md).
- **Demo mode** (`NEXT_PUBLIC_ESSOS_DEMO_MODE=1`): adds the sidebar "view as" role switcher and treats org-less sign-ins as leads. See [ADR 016](../docs/decisions/archive/016-concierge-ownership-and-rbac.md).

## Run

```bash
# requires the Convex backend running (pnpm convex:dev) and a built @essos/shared
pnpm dashboard:dev          # http://localhost:4000
pnpm --filter @essos/dashboard run build
```

The Convex API is imported via the `@convex/*` path alias (→ `../convex/*`); `next.config.mjs` pins `outputFileTracingRoot` to the repo root so `/source-docs` can read fixtures.

## Deploy (Vercel)

Live at **https://essos-dashboard.vercel.app**. Linked at the repo root with Root Directory = `dashboard` so the whole pnpm monorepo uploads; [`vercel.json`](./vercel.json) compiles `@essos/shared` before `next build`. See the [deploy runbook](../docs/runbooks/deploy.md).
