# @essos/dashboard

The admin dashboard — the single pane of glass over every conversation, escalation, and bit of agent telemetry. Next.js (App Router) + React + Tailwind v4. It is **reactive**: it subscribes to Convex queries with `useQuery`, so escalations, messages, and telemetry update live with no reload. Auth is **Clerk** (optional for local demos). See [ADR 013](../.docs/decisions/013-convex-backend.md), [ADR 014](../.docs/decisions/014-clerk-auth-and-identity.md), and [ADR 015](../.docs/decisions/015-agent-telemetry-and-analytics.md).

## Views

| Route | Purpose |
| --- | --- |
| `/` | Overview: live telemetry tiles + the live open-escalation queue. |
| `/conversations` | All conversations, most-recent first, with automation-state and open-flag badges. |
| `/conversations/[id]` | Thread view: messages, patient summary, per-thread flags + actions, AI-draft reply box, activity log. |
| `/patients/[id]` | Itinerary timeline, care instructions, and source documents. |
| `/performance` | AI observability: autonomy rate, latency p50/p95, tool usage, tokens, draft quality, daily volume. |
| `/team` | Concierge performance: resolution time, queue age, per-rep workload (scoped to the active Clerk org). |
| `/source-docs/[id]` | Route handler serving the seeded PDF inline (Markdown fallback, then 404). |
| `/api/webhooks` | Clerk → Convex user/org sync webhook (svix-verified). |

## Data + auth

- **Reads** are `useQuery(api.queries.*)` in client view components (e.g. `features/overview/overview-view.tsx`), so the UI is reactive. Server page files stay thin (metadata + render the client view).
- **Writes** are `useMutation(api.mutations.*)` — `resolveEscalation`, `takeOverConversation`, `resumeAutomation`, `sendConciergeReply`. The signed-in concierge is resolved server-side by Convex and stamped as the actor (no more hardcoded `ASSIGNEE`).
- **Auth**: `app/ConvexClientProvider.tsx` wires `ConvexProviderWithClerk` when `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set, otherwise a plain `ConvexProvider` (dev "demo concierge"). `proxy.ts` (Next 16's middleware) protects routes except the webhook.

## Config notes

- `next.config.mjs`: `outputFileTracingRoot` is pinned to the repo root so the `/source-docs` route can read fixture files. No `node:sqlite` / `serverExternalPackages` anymore.
- The Convex API is imported via the `@convex/*` path alias (→ `../convex/*`).
- Brand tokens + UI layering (primitives in `components/ui/`, domain badges in `components/badges/`, page sections in `features/`) are unchanged from the original design system.

## Run

```bash
# requires the Convex backend running (pnpm convex:dev) and a built @essos/shared
pnpm dashboard:dev          # http://localhost:4000
pnpm --filter @essos/dashboard run build
```
