# Clerk Auth, Organizations-as-Team, and Concierge Identity

## Decision

The admin dashboard authenticates concierges with **Clerk**, and the concierge team is modeled as a **Clerk Organization** (roles `org:admin` = team lead, `org:member` = concierge). This gives real identities to attribute work to — the prerequisite for the team-performance analytics ([ADR 015](015-agent-telemetry-and-analytics.md)) — and real RBAC for the operations console.

## Why

The old dashboard had no auth and stamped every action with a hardcoded `ASSIGNEE = "dashboard"`, so "who resolved this / how fast is each rep" was unanswerable. Clerk gives each concierge an identity; Organizations give the team a tenant boundary and roles, and lay multi-tenant foundations (multiple clinics/teams) for a production build.

## Design

- **Convex binding:** [convex/auth.config.ts](../../convex/auth.config.ts) trusts the Clerk issuer (`CLERK_JWT_ISSUER_DOMAIN`, applicationID `"convex"`). The dashboard wraps the app in `ConvexProviderWithClerk` ([dashboard/app/ConvexClientProvider.tsx](../../dashboard/app/ConvexClientProvider.tsx)), so Convex calls carry the Clerk JWT.
- **Identity injection:** `conciergeMutation`/`conciergeQuery` ([convex/lib/functions.ts](../../convex/lib/functions.ts)) resolve the signed-in user and stamp `assignee`/`actor` automatically. This retires the hardcoded `ASSIGNEE`.
- **Middleware:** [dashboard/proxy.ts](../../dashboard/proxy.ts) (Next.js 16 renamed `middleware.ts` → `proxy.ts`) attaches Clerk auth context to every request as a **passthrough** — it does not wall the app. Signed-out visitors see the (demo-mode) dashboard and sign in from the sidebar; the fail-closed control is `ESSOS_REQUIRE_AUTH` on Convex, enforced server-side. (An earlier `auth.protect()` edge wall was dropped: on the deployed dev Clerk instance it returned 404s instead of redirecting, and a wall hurts the public demo.)
- **User/org sync, two ways:** `storeUser` on first sign-in (synchronous), plus a verified **Clerk webhook** ([dashboard/app/api/webhooks/route.ts](../../dashboard/app/api/webhooks/route.ts)) handling `user.*` and `organizationMembership.*` → Convex `users` table, so members exist even before they open the app (webhooks are eventually consistent, so they back up rather than replace the session path).

## Graceful degradation for the demo

Clerk is optional for local runs. With no `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, the provider falls back to a plain `ConvexProvider`, `proxy.ts` is a passthrough, and `getConcierge` returns a "dashboard" dev concierge. Set `ESSOS_REQUIRE_AUTH` on the Convex deployment to fail closed (production). This keeps the work-trial demo runnable with zero auth setup while the production path is real.

## Consequences

- Actions are attributable to real people; team metrics become possible.
- A `convex` JWT template must exist in the Clerk dashboard; Organizations must be enabled for org roles to populate.
