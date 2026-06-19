# Deploy Pipeline (CI/CD)

## Decision

Deploy all three services from a single GitHub Actions workflow ([.github/workflows/deploy.yml](../../../.github/workflows/deploy.yml)) on every push to `main` (plus manual `workflow_dispatch`): **Convex → then Vercel + Railway**. Topology and per-service hosting are unchanged from [ADR 017](017-guest-onboarding-and-deployment.md); this only automates the existing manual runbook.

## Choices

- **Convex deploys first; Vercel + Railway `need` it.** Backend schema/functions should be live before the frontend and agent that call them, so an additive deploy never leaves the UI talking to a missing function.
- **No concurrent deploys** (`concurrency: deploy-production`, `cancel-in-progress: false`). Two overlapping production pushes to the same Convex deployment / Vercel project can race; we let an in-flight deploy finish rather than cancel it.
- **Vercel builds remotely** (`vercel deploy --prod`, not `--prebuilt`). This is the exact path proven to work by hand for this monorepo — Vercel applies the project's Root Directory = `dashboard` and [dashboard/vercel.json](../../../dashboard/vercel.json) (which compiles `@essos/shared` first). Building prebuilt in CI would re-implement that monorepo wiring for no benefit.
- **Railway job is opt-in** (`if: vars.RAILWAY_EVE_SERVICE != ''`). If Railway's own GitHub auto-deploy is enabled, leave the variable unset and the job is skipped instead of double-deploying.

## Consequences

- Secrets live in GitHub Actions: `CONVEX_DEPLOY_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `RAILWAY_TOKEN` (+ optional `RAILWAY_EVE_SERVICE` / `RAILWAY_TRANSPORT_SERVICE` variables).
- CI installs with `--frozen-lockfile`, so an out-of-sync `pnpm-lock.yaml` fails the build by design — commit the lockfile alongside any `package.json` change.
- The manual runbook in the README still works unchanged as a fallback / first-time bootstrap.
