# Decision records (archive)

These are the original, long-form architecture decision records (ADRs) — one file per decision, with full reasoning, schemas, and trade-offs. They are kept for reference and are no longer the primary read.

The canonical, consolidated summary of every major product / UI / UX / platform decision now lives one level up in [docs/decisions/README.md](../README.md). Start there; come here when you need the full detail behind a specific decision.

Numbers are stable and append-only. Note: `023-spectrum-inbound-pipeline.md` was historically authored as a second `020`; it was renumbered to `023` here to remove the collision (the indexed `020` is patient-management CRUD).

| # | Decision |
| --- | --- |
| [001](001-escalation-taxonomy.md) | Escalation taxonomy |
| [002](002-care-instructions-source-of-truth.md) | Care-instructions source of truth |
| [003](003-human-handoff-and-takeover.md) | Human handoff and takeover |
| [004](004-spectrum-imessage-transport.md) | Spectrum iMessage transport |
| [005](005-eve-agent-project-structure.md) | Eve agent project structure |
| [006](006-model-routing-direct-anthropic.md) | Model routing: direct Anthropic |
| [007](007-admin-dashboard-architecture.md) | Admin dashboard architecture |
| [008](008-transport-eve-streaming-contract.md) | Transport / Eve streaming contract |
| [009](009-agent-hardening-and-transport-auth.md) | Agent hardening and transport auth |
| [010](010-handoff-patient-feedback-ux.md) | Handoff patient feedback + concierge reply bridge |
| [011](011-concierge-ai-assist-and-proactive-care.md) | Concierge AI-assist + proactive care |
| [012](012-imessage-plaintext-and-voice.md) | iMessage plaintext formatting + texting voice |
| [013](013-convex-backend.md) | Convex backend (supersedes local SQLite) |
| [014](014-clerk-auth-and-identity.md) | Clerk auth + concierge identity |
| [015](015-agent-telemetry-and-analytics.md) | Agent telemetry + analytics |
| [016](016-concierge-ownership-and-rbac.md) | Concierge patient ownership + RBAC |
| [017](017-guest-onboarding-and-deployment.md) | Guest iMessage onboarding + deployment topology |
| [018](018-deploy-pipeline-cicd.md) | Deploy pipeline (CI/CD) |
| [019](019-slack-concierge-bridge.md) | Slack concierge bridge |
| [020](020-patient-management-crud.md) | Patient management CRUD |
| [021](021-per-patient-policy-overrides.md) | Per-patient policy overrides (tighten-only) |
| [022](022-eval-and-continuous-learning-loop.md) | Eval + continuous-learning loop |
| [023](023-spectrum-inbound-pipeline.md) | Spectrum five-stage inbound pipeline |
