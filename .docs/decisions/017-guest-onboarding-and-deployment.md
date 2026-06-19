# Guest Onboarding (iMessage) and Deployment Topology

## Decision

Let anyone test the live Eve experience by **texting the Spectrum iMessage line** — no per-reviewer setup. An unknown sender is auto-provisioned a **guest patient** cloned from a template patient, so Eve has real itinerary + care data to ground its answers. The whole system deploys as: **Convex Cloud** (data + functions), **Vercel** (dashboard), and **Railway** (Eve agent + Spectrum transport, both long-running Node services).

## Why

Over real iMessage a person's identity *is* their Apple handle — there's no software "user" to hand out. Binding every reviewer's handle to a patient by hand (edit fixtures + reseed) doesn't scale to "here's a number, go try it." Guest provisioning makes the demo self-serve while keeping Eve grounded (a blank guest would just escalate everything).

## Design

- **`ensureGuest`** ([convex/model/patients.ts](../../convex/model/patients.ts)): find-or-create by handle; on first contact, clone the template patient (`pat_maya` by default) — patient row, itinerary, care instructions, and patient-specific source docs — under a fresh `pat_guest_*` id bound to the sender's handle. Idempotent: a returning handle reuses the same guest.
- Exposed as the internal `ensureGuestPatient` mutation ([convex/machine.ts](../../convex/machine.ts)), routed through the service-secret `/machine` action, and called from the transport via `@essos/shared`.
- **Transport guest mode** ([transport/src/core.ts](../../transport/src/core.ts), [transport/src/imessage.ts](../../transport/src/imessage.ts)): gated by `ESSOS_GUEST_MODE`. When an unknown, non-concierge handle messages the line, `handleInbound` provisions a guest and proceeds as normal (disclosure, grounded answers, escalation, handoff all work). Off by default; enable for the public demo. Template overridable with `ESSOS_GUEST_TEMPLATE`.

## Deployment topology

| Component | Host | Notes |
|---|---|---|
| Convex (data + functions + `/machine`) | Convex Cloud (`npx convex deploy` with a `prod:` deploy key) | Prod env (`CLERK_JWT_ISSUER_DOMAIN`, `CONVEX_SERVICE_SECRET`, `ESSOS_DEMO_MODE`, `ESSOS_GUEST_MODE`; `ESSOS_ALLOW_SEED` only while seeding) must be set **before** `deploy` — `auth.config.ts` validates referenced vars at deploy time. |
| Dashboard (Next.js) | Vercel | Linked at the **repo root** with Root Directory = `dashboard` so the whole monorepo uploads; [dashboard/vercel.json](../../dashboard/vercel.json) compiles `@essos/shared` before `next build`. Public env `NEXT_PUBLIC_CONVEX_URL`, Clerk keys, `NEXT_PUBLIC_ESSOS_DEMO_MODE`. |
| Eve agent (eve/Nitro) | Railway (web service) | Built from [deploy/eve.Dockerfile](../../deploy/eve.Dockerfile) (Node 24; installs `just-bash` for eve's default sandbox). Gets a public Railway domain, protected by the transport bearer. Vars `ANTHROPIC_API_KEY`, `ESSOS_AGENT_MODEL`, `ESSOS_TRANSPORT_SECRET`. |
| Spectrum transport | Railway (worker, no domain) | Built from [deploy/transport.Dockerfile](../../deploy/transport.Dockerfile). Holds the live Spectrum connection + outbound/reminder loops (can't be serverless). Vars `CONVEX_SITE_URL` + `CONVEX_SERVICE_SECRET`, `EVE_BASE_URL` + `ESSOS_TRANSPORT_SECRET`, `SPECTRUM_*`, `ESSOS_GUEST_MODE=1`, `ESSOS_CONCIERGE_HANDLES`. |
| Slack bridge (opt-in) | Railway (worker, no domain) | Built from [deploy/slack.Dockerfile](../../deploy/slack.Dockerfile). Holds the Slack Socket Mode websocket (can't be serverless). Vars `CONVEX_SITE_URL` + `CONVEX_SERVICE_SECRET`, `SLACK_ENABLED=1`, `SLACK_APP_TOKEN`, `SLACK_BOT_TOKEN`, `SLACK_ESCALATION_CHANNEL_ID`, `ESSOS_DASHBOARD_URL`. Also set `SLACK_ENABLED=1` on Convex so the backend enqueues. See [ADR 019](019-slack-concierge-bridge.md). |

**Eve + transport on Railway, not Vercel:** the transport is inherently a persistent process, and Eve links `@essos/shared` and is happiest as a long-running Nitro `node-server`. Co-locating both on Railway (Docker builds over the full monorepo) avoids the workspace `link:` gymnastics of a serverless build and keeps the agent↔transport hop on one platform. Railway's per-service builder is selected with `RAILWAY_DOCKERFILE_PATH` so the Railway services share one repo (the Slack bridge, [ADR 019](019-slack-concierge-bridge.md), is a third such worker).

**As deployed (trial):** dashboard `https://essos-dashboard.vercel.app`, Eve `https://eve-production-0971.up.railway.app`, Convex `intent-hare-36`. Clerk runs as a **development instance** on the `vercel.app` domain (fine for the trial; a production instance + custom domain is the path for a long-lived public deploy). The dashboard middleware ([dashboard/proxy.ts](../../dashboard/proxy.ts)) is a **passthrough** — signed-out reviewers see the demo (Convex dev-fallback = lead) and sign in optionally; `ESSOS_REQUIRE_AUTH` on Convex is the fail-closed hardening switch.

## Consequences

- "Text this number to try Eve" works for any reviewer with an Apple device; each becomes an isolated guest conversation visible in the dashboard.
- Guest patients accumulate in the data; clear them with `pnpm seed:reset` (dev) or prune by `id` prefix `pat_guest_` (prod).
- Three platforms (Convex Cloud, Vercel, Railway); Eve + transport are two Railway services in one project. Full runbook in the README.
- The Clerk org-sync webhook was left unconfigured (the available tooling exposes no webhook CRUD); concierge profiles still sync on first dashboard action, so it's an optional add.
