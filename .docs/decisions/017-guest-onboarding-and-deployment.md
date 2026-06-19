# Guest Onboarding (iMessage) and Deployment Topology

## Decision

Let anyone test the live Eve experience by **texting the Spectrum iMessage line** — no per-reviewer setup. An unknown sender is auto-provisioned a **guest patient** cloned from a template patient, so Eve has real itinerary + care data to ground its answers. The whole system deploys as: **Convex Cloud** (data + functions), **Vercel** (dashboard + Eve agent), and a **persistent host** for the Spectrum transport.

## Why

Over real iMessage a person's identity *is* their Apple handle — there's no software "user" to hand out. Binding every reviewer's handle to a patient by hand (edit fixtures + reseed) doesn't scale to "here's a number, go try it." Guest provisioning makes the demo self-serve while keeping Eve grounded (a blank guest would just escalate everything).

## Design

- **`ensureGuest`** ([convex/model/patients.ts](../../convex/model/patients.ts)): find-or-create by handle; on first contact, clone the template patient (`pat_maya` by default) — patient row, itinerary, care instructions, and patient-specific source docs — under a fresh `pat_guest_*` id bound to the sender's handle. Idempotent: a returning handle reuses the same guest.
- Exposed as the internal `ensureGuestPatient` mutation ([convex/machine.ts](../../convex/machine.ts)), routed through the service-secret `/machine` action, and called from the transport via `@essos/shared`.
- **Transport guest mode** ([transport/src/core.ts](../../transport/src/core.ts), [transport/src/imessage.ts](../../transport/src/imessage.ts)): gated by `ESSOS_GUEST_MODE`. When an unknown, non-concierge handle messages the line, `handleInbound` provisions a guest and proceeds as normal (disclosure, grounded answers, escalation, handoff all work). Off by default; enable for the public demo. Template overridable with `ESSOS_GUEST_TEMPLATE`.

## Deployment topology

| Component | Host | Notes |
|---|---|---|
| Convex (data + functions + `/machine`) | Convex Cloud (`npx convex deploy`) | Set prod env (`CLERK_JWT_ISSUER_DOMAIN`, `CONVEX_SERVICE_SECRET`, `ESSOS_DEMO_MODE`, `ESSOS_GUEST_MODE`; `ESSOS_ALLOW_SEED` only while seeding). |
| Dashboard (Next.js) | Vercel | Root directory `dashboard/`; build needs `@essos/shared` compiled first. Public env `NEXT_PUBLIC_CONVEX_URL`, Clerk keys, `NEXT_PUBLIC_ESSOS_DEMO_MODE`. |
| Eve agent (eve/Nitro) | Vercel (separate project) | `eve build` has a Vercel target; exposes `EVE_BASE_URL`. Set `ANTHROPIC_API_KEY`, `ESSOS_TRANSPORT_SECRET`. |
| Spectrum transport | **Persistent host** (Railway / Render / Fly / a small VM) | NOT Vercel: it holds a long-lived Spectrum connection (`app.messages` stream) plus the outbound + reminder loops. Serverless can't keep that alive. Needs `CONVEX_SITE_URL` + `CONVEX_SERVICE_SECRET`, `EVE_BASE_URL` + `ESSOS_TRANSPORT_SECRET`, `SPECTRUM_*`, `ESSOS_GUEST_MODE=1`, `ESSOS_CONCIERGE_HANDLES`. |

The transport being the one non-serverless piece is inherent to a push-based chat bridge; a fuller build could move scheduling to `convex/crons.ts` and inbound to a Spectrum webhook, but the live socket + delivery loop still want a process.

## Consequences

- "Text this number to try Eve" works for any reviewer with an Apple device; each becomes an isolated guest conversation visible in the dashboard.
- Guest patients accumulate in the data; clear them with `pnpm seed:reset` (dev) or prune by `id` prefix `pat_guest_` (prod).
- Three deploy targets (Convex, Vercel x2) + one persistent host. Documented in the README deploy runbook.
