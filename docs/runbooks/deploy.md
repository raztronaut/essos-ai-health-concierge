# Deploy runbook (live)

The trial is deployed across **Convex Cloud** (data), **Vercel** (dashboard), and **Railway** (Eve agent + Spectrum transport + Slack bridge). Topology and rationale: [ADR 017](../decisions/archive/017-guest-onboarding-and-deployment.md). Pushes to `main` auto-deploy all three platforms via [GitHub Actions](../../.github/workflows/deploy.yml) ([ADR 018](../decisions/archive/018-deploy-pipeline-cicd.md)); the manual steps below still work as a fallback.

| Piece | Where | URL |
| --- | --- | --- |
| Dashboard | Vercel | https://essos-dashboard.vercel.app |
| Patient mini-app / App Clip URL | Static web host | https://patient-miniapp.vercel.app now; `https://mini.essos.dev` after DNS attach |
| Eve agent | Railway (web) | https://eve-production-0971.up.railway.app |
| Spectrum transport | Railway (worker) | — (connects out to Spectrum, Eve, Convex) |
| Slack bridge | Railway (worker) | — (Socket Mode; opt-in via `SLACK_ENABLED`, [ADR 019](../decisions/archive/019-slack-concierge-bridge.md)) |
| Data / functions | Convex Cloud | `intent-hare-36` (`.convex.cloud` reactive, `.convex.site` machine) |

Eve, the transport, and the Slack bridge live on Railway because all three are long-running Node services that share the repo and the `@essos/shared` build (the transport holds a live Spectrum connection and Slack holds a Socket Mode websocket, so neither can be serverless). The dashboard is a natural Vercel fit.

## Reproduce

1. **Convex Cloud** — `CONVEX_DEPLOY_KEY="prod:<name>|..." npx convex deploy`. Set env (auth-config vars must exist *before* deploy):
   ```bash
   npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<app>.clerk.accounts.dev
   npx convex env set CONVEX_SERVICE_SECRET <strong-random>   # machine-path guard
   npx convex env set ESSOS_DEMO_MODE 1                        # demo switcher + lead onboarding
   npx convex env set ESSOS_GUEST_MODE 1                       # allow guest provisioning
   # seed once, then lock:
   npx convex env set ESSOS_ALLOW_SEED 1
   CONVEX_URL=https://<name>.convex.cloud pnpm seed:reset
   CONVEX_SITE_URL=https://<name>.convex.site CONVEX_SERVICE_SECRET=<same> pnpm seed:team
   npx convex env remove ESSOS_ALLOW_SEED
   ```
2. **Railway (Eve + transport + Slack)** — `railway init`, then one service per worker. Because the build needs the whole monorepo (Eve links `@essos/shared`), each service is built from a Dockerfile selected with the `RAILWAY_DOCKERFILE_PATH` variable (`deploy/eve.Dockerfile`, `deploy/transport.Dockerfile`, `deploy/slack.Dockerfile`) rather than Railpack auto-detection. The Slack worker is opt-in: it needs `SLACK_ENABLED=1`, `SLACK_APP_TOKEN`, `SLACK_BOT_TOKEN`, `SLACK_ESCALATION_CHANNEL_ID` (plus the shared `CONVEX_SITE_URL` + `CONVEX_SERVICE_SECRET`), and `SLACK_ENABLED=1` on the Convex deployment so the backend enqueues. See [slack/README.md](../../slack/README.md) for the Slack app scopes.
   - `eve` (web): `railway domain` for a public URL; vars `ANTHROPIC_API_KEY`, `ESSOS_AGENT_MODEL`, `ESSOS_TRANSPORT_SECRET`. Eve binds `$PORT`; the public URL is protected by the transport bearer.
   - `transport` (worker, no domain): `CONVEX_SITE_URL` (prod `.convex.site`) + `CONVEX_SERVICE_SECRET`, `EVE_BASE_URL` (the eve public URL) + `ESSOS_TRANSPORT_SECRET`, `SPECTRUM_PROJECT_ID`/`SPECTRUM_PROJECT_SECRET`, `ESSOS_GUEST_MODE=1`, `ESSOS_CONCIERGE_HANDLES`, `ESSOS_PATIENT_MINIAPP_BASE_URL=https://patient-miniapp.vercel.app` for current reviewers, `ESSOS_MINIAPP_DELIVERY=spectrum_app`, `ESSOS_APPLE_TEAM_ID=6JY9M75PT4`, `ESSOS_PATIENT_CARD_TTL_MINUTES=1440` for reviewer links.
   - `patient-miniapp` (static web/App Clip surface): deploy with `EXPO_PUBLIC_CARD_API_URL=https://intent-hare-36.convex.site/miniapp/card`, `ESSOS_PATIENT_MINIAPP_DOMAIN=patient-miniapp.vercel.app` for current reviewers, and `ESSOS_APPLE_TEAM_ID=6JY9M75PT4`. Apple bundles: main `com.essos.raziworktrial`, App Clip `com.essos.raziworktrial.Clip`. Switch `ESSOS_PATIENT_MINIAPP_DOMAIN` to `mini.essos.dev` after that domain resolves to the deployed mini-app.
3. **Dashboard (Vercel)** — link the project at the **repo root** with **Root Directory = `dashboard`** (so the whole monorepo uploads); [dashboard/vercel.json](../../dashboard/vercel.json) sets the build to compile `@essos/shared` first. Env: `NEXT_PUBLIC_CONVEX_URL` (prod `.convex.cloud`), `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_JWT_ISSUER_DOMAIN`, `NEXT_PUBLIC_ESSOS_DEMO_MODE=1`, plus `CONVEX_SITE_URL` + `CONVEX_SERVICE_SECRET` (and `CLERK_WEBHOOK_SIGNING_SECRET` if you wire the webhook). `vercel deploy --prod` from the repo root.
4. **Clerk** — the `convex` JWT template carries `org_id`/`org_role`/`org_slug` claims (for role scoping). The org-sync webhook (`/api/webhooks`) is optional — concierge profiles are also synced on first dashboard action.

## Notes / gotchas (learned in this deploy)

- **Eve needs Node 24** and its default sandbox backend (`just-bash`) installed — both handled in [deploy/eve.Dockerfile](../../deploy/eve.Dockerfile).
- The deployed dashboard middleware ([dashboard/proxy.ts](../../dashboard/proxy.ts)) is a **passthrough**: signed-out reviewers see the demo (Convex dev-fallback = lead) and sign in optionally. Harden by setting `ESSOS_REQUIRE_AUTH=true` on Convex to fail closed.
- Clerk runs as a **development instance** on the `vercel.app` domain — fine for the trial; use a production instance on a custom domain for a long-lived public deployment.
- Rotate the Convex deploy key, Railway token, and `CLERK_SECRET_KEY` after the trial.
