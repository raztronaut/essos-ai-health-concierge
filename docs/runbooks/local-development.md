# Local development runbook

Set up, run, and demo Essos on a single machine. For the live iMessage line see [live-imessage.md](live-imessage.md); for cloud deploys see [deploy.md](deploy.md).

## Prerequisites

- Node.js >= 22
- pnpm 10+
- An Anthropic API key (the work-trial zero-data-retention key). Optional: a Google Places API key.
- Convex (provisioned by `npx convex dev` — a local deployment needs no account). Optional: a Clerk app for real dashboard auth (the demo runs without it).

## Setup (first time)

```bash
# 1) configure env (edit .env: set ANTHROPIC_API_KEY; eve-concierge/.env symlinks to it)
cp .env.example .env

# 2) one-shot bootstrap: installs deps, provisions a local Convex deployment,
#    builds the shared client, and seeds the fixture pack
pnpm setup
```

`pnpm setup` runs `pnpm install` + the eve sub-project install + builds `@essos/shared` + `convex dev --once` (writes `CONVEX_*` to `.env.local`) + `convex env set ESSOS_ALLOW_SEED 1` (seeding is destructive, so it's env-gated) + `pnpm seed:reset` (3 patients, source docs, itineraries, care docs, and a pre-seeded "stranded at arrivals" escalation) + `pnpm seed:team` (a demo concierge team and patient assignments).

**Dashboard auth (optional).** The dashboard runs as a "demo concierge" (treated as a team lead) with no keys. To enable real Clerk auth, put `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` in `dashboard/.env.local` (Next reads env from the dashboard dir), set `CLERK_JWT_ISSUER_DOMAIN` on the Convex deployment (`npx convex env set …`), enable Organizations, and add a Clerk JWT template named `convex` that includes org claims (`org_id`, `org_role`). See [ADR 014](../decisions/archive/014-clerk-auth-and-identity.md).

**Demo / test accounts.** Use Clerk's **test instance** (`pk_test_*`/`sk_test_*`). Clerk's built-in test identifiers need no real inbox — sign up/in with an email like `you+clerk_test@example.com` (or phone `+15555550100`), verification code `424242`. `pnpm seed:team` provisions a demo org with a lead + two concierges (`lead+clerk_test@essos.dev`, `ada+clerk_test@essos.dev`, `ben+clerk_test@essos.dev`) and assigns patients to them — when `CLERK_SECRET_KEY` is set it creates the real Clerk users + org via the Backend API, otherwise it populates Convex only. Harden the backend with `npx convex env set ESSOS_REQUIRE_AUTH true` once you've verified a real signed-in session.

**Concierge ownership & roles.** Patients have an owning concierge. A **team lead** (`org:admin`) sees all patients and can (re)assign anyone; a **concierge** (`org:member`) sees their assigned patients plus the unassigned queue and can claim unassigned patients. The escalation queue is shared so anyone can triage. See [ADR 016](../decisions/archive/016-concierge-ownership-and-rbac.md).

## Run

One command starts the always-on services (Convex + Eve agent + dashboard) with labeled, color-coded output; `Ctrl-C` stops them all:

```bash
pnpm dev            # convex (:3210) + eve (:3000) + dashboard (:4000)
# or, for UI work without the agent:
pnpm dev:ui         # convex + dashboard only
# or, the full live iMessage stack in one command (needs SPECTRUM_* in .env):
pnpm demo           # convex + eve + dashboard + supervised iMessage transport
```

`pnpm demo` is the one-command live demo: it adds the **supervised** iMessage transport (restarts on crash) to the `pnpm dev` set. Use plain `pnpm dev` when you don't have Spectrum credentials.

The **terminal** transport is interactive (it reads your keystrokes as the patient), so run it in its own terminal:

```bash
pnpm transport:terminal     # local: play the patient in your shell
pnpm transport:imessage     # live: a single Spectrum Cloud iMessage transport
```

> **Local iMessage is guarded.** Spectrum Cloud allows exactly one live consumer per project, and the deployed Railway transport already holds it. To prevent a local transport from fighting Railway over the stream (dropped/duplicated messages), `pnpm transport:imessage` refuses to start locally unless you set `ESSOS_ALLOW_LOCAL_IMESSAGE=1` (only do this when the Railway transport is intentionally stopped). For everyday local work, exercise the agent over the **terminal** transport and use the deployed line for iMessage. On Railway the guard is a no-op (it detects `RAILWAY_ENVIRONMENT`).

The optional **Slack bridge** is another long-running worker — run it in its own terminal once a Slack app is configured (see [slack/README.md](../../slack/README.md)):

```bash
pnpm slack:dev              # post escalations to Slack; reply/act from threads
```

Then open the dashboard at http://localhost:4000.

> The dashboard needs Convex running — `pnpm dev` guarantees that. If you ever start the dashboard alone, start `pnpm convex:dev` too, or its data will hang on "Loading…" (the reactive client retries until Convex is up).

Other root scripts: `pnpm seed` / `pnpm seed:reset`, `pnpm eve:build`, `pnpm assets:generate` (regenerate PDFs), `pnpm transport:remind` (fire a proactive pre-op reminder on demand), `pnpm typecheck` (all packages + the agent).

## Demo accounts & roles

The dashboard ships in **demo mode** (`NEXT_PUBLIC_ESSOS_DEMO_MODE=1` for the UI, `ESSOS_DEMO_MODE=1` on the Convex deployment), which makes showing off roles effortless:

- **"View as" switcher** (sidebar): flip between **You / Team lead (Tess) / Ada / Ben** and the whole dashboard instantly re-scopes — a lead sees every patient and the full team view; a concierge sees only their assigned patients + the shared unassigned queue, and gets a "Claim" button instead of the lead's assignment dropdown. No sign-out needed; reads *and* actions are attributed to the selected concierge.
- **One account is enough.** A reviewer signs up, lands as a lead on the fully-seeded dashboard, and uses the switcher to walk through every role.

**Seeded demo team** (created by `pnpm seed:team`): `lead+clerk_test@essos.dev` (lead), `ada+clerk_test@essos.dev` and `ben+clerk_test@essos.dev` (concierges); Maya → Ada, Diego → Ben, Sofia left unassigned so the queue is visible. When `CLERK_SECRET_KEY` is set the seeder also creates these as real Clerk accounts + an org; otherwise they exist in Convex for the switcher.

> **`ESSOS_REQUIRE_AUTH`** is the production "fail-closed" switch that makes the Convex backend *reject* any unauthenticated request. The deployed dashboard middleware is a **passthrough** (signed-out reviewers see the demo and sign in optionally), so leave `ESSOS_REQUIRE_AUTH` **off** for the demo; set it once you're hardening for production.
