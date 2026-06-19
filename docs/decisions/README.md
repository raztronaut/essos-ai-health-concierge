# Major decisions

A single, consolidated summary of every major product, UX, agent, and platform decision behind Essos — the *why* in one place. Each entry distills a decision to its essential points and links to the full architecture decision record (ADR) in [archive/](archive/) for the complete reasoning, schemas, and trade-offs. Read this top to bottom for the whole product rationale; open an archived ADR when you need the detail.

## The problem and the bet

A health-tourism patient is alone in a foreign country around a surgery, texting their concierge at every hour with a mix of "what's my hotel confirmation?" and "is this swelling normal?" The concierge team can't be awake for all of it, and the high-stakes questions are exactly the ones that can't wait.

The bet behind Essos: the plumbing — an AI agent in an iMessage group chat, wired to a CRM — is a solved integration. The hard, valuable part is the **experience**: the *tone* it texts in, the *exact context* it has at the moment a patient asks, and a *handoff that never drops the patient or burns out the team*. Nearly every decision below is in service of that, and of getting safer and sharper the more it's used. The safety spine is conservative by construction (answer only from a documented source of truth; escalate anything clinical), so being helpful never trades against being safe.

## Index

| # | Decision | Theme |
| --- | --- | --- |
| [001](archive/001-escalation-taxonomy.md) | Escalation taxonomy | Product & safety |
| [002](archive/002-care-instructions-source-of-truth.md) | Care-instructions source of truth | Product & safety |
| [003](archive/003-human-handoff-and-takeover.md) | Human handoff and takeover | Product & safety |
| [021](archive/021-per-patient-policy-overrides.md) | Per-patient policy overrides (tighten-only) | Product & safety |
| [005](archive/005-eve-agent-project-structure.md) | Eve agent project structure | Agent & model |
| [006](archive/006-model-routing-direct-anthropic.md) | Model routing: direct Anthropic | Agent & model |
| [009](archive/009-agent-hardening-and-transport-auth.md) | Agent hardening + transport auth | Agent & model |
| [004](archive/004-spectrum-imessage-transport.md) | Spectrum iMessage transport | Transport & messaging UX |
| [008](archive/008-transport-eve-streaming-contract.md) | Transport / Eve streaming contract | Transport & messaging UX |
| [012](archive/012-imessage-plaintext-and-voice.md) | iMessage plaintext + texting voice | Transport & messaging UX |
| [023](archive/023-spectrum-inbound-pipeline.md) | Spectrum five-stage inbound pipeline | Transport & messaging UX |
| [017](archive/017-guest-onboarding-and-deployment.md) | Guest onboarding + deployment topology | Transport & messaging UX / Platform |
| [007](archive/007-admin-dashboard-architecture.md) | Admin dashboard architecture | Concierge & dashboard UX |
| [010](archive/010-handoff-patient-feedback-ux.md) | Handoff patient feedback + reply bridge | Concierge & dashboard UX |
| [011](archive/011-concierge-ai-assist-and-proactive-care.md) | Concierge AI-assist + proactive care | Concierge & dashboard UX |
| [015](archive/015-agent-telemetry-and-analytics.md) | Agent telemetry + analytics | Concierge & dashboard UX |
| [016](archive/016-concierge-ownership-and-rbac.md) | Concierge ownership + RBAC | Concierge & dashboard UX |
| [020](archive/020-patient-management-crud.md) | Patient management CRUD | Concierge & dashboard UX |
| [019](archive/019-slack-concierge-bridge.md) | Slack concierge bridge | Concierge & dashboard UX |
| [013](archive/013-convex-backend.md) | Convex backend | Platform |
| [014](archive/014-clerk-auth-and-identity.md) | Clerk auth + identity | Platform |
| [018](archive/018-deploy-pipeline-cicd.md) | Deploy pipeline (CI/CD) | Platform |
| [022](archive/022-eval-and-continuous-learning-loop.md) | Eval + continuous-learning loop | Quality & evals |

---

## Product & safety policy

How Eve decides what it may answer and when it must hand off — the conservative core of a health-tourism agent.

### Escalation taxonomy — [ADR 001](archive/001-escalation-taxonomy.md)
Every patient message is classified before Eve answers, asks a clarifying question, or escalates. A fixed category set marks what is autonomous (`itinerary_reference`, routine `travel_logistics`, `local_recommendation`, `documented_preop_reference`) versus must-escalate (`medication_decision`, `postop_symptom_or_recovery`, `medical_or_clinical_judgment`, `staff_safety_or_quality`, `out_of_package_request`, `missing_source_or_unsure`), each with a default level (High/Med). Priority rules favor safety: pick the safest matching category, medical overrides logistics, a missing source means escalate not improvise, and post-op is escalate-by-default. Every escalation carries conversation/patient ids, level, one taxonomy reason, a one-sentence summary, source message, status, assignee, and timestamps.

### Care-instructions source of truth — [ADR 002](archive/002-care-instructions-source-of-truth.md)
Model care guidance as a general `care_instructions` record (phase pre/post/general, procedure, `source_type`, `source_status` of verified/demo_notional/missing/personalized_pending, and an `answer_policy`), not a narrow pre-op table — because post-op guidance is often personalized or not yet captured. `answer_reference` lets Eve quote/summarize a document (and say it's doing so) without extending beyond the text; `escalate_only` means acknowledge and flag, never give recovery or clinical advice. The dashboard groups docs by phase and shows whether an escalation fired because the source was missing, personalized, or clinically unsafe.

### Human handoff and takeover — [ADR 003](archive/003-human-handoff-and-takeover.md)
Conversations carry an explicit automation state — `active`, `paused_for_review`, `taken_over`, `resolved` — so a human can step in inside the same group chat without Eve talking over them. Eve escalating moves `active → paused_for_review` (acknowledge, flag, write the escalation, pause); a concierge taking over or resolving/resuming drives the rest. The transport ignores Eve-authored messages, treats a concierge message during an open flag as a takeover signal, and keeps logging every message even while paused — the patient never has to switch channels.

### Per-patient policy overrides, tighten-only — [ADR 021](archive/021-per-patient-policy-overrides.md)
A per-patient layer over the global taxonomy can make Eve *more* cautious for one patient (force a normally-autonomous category to escalate, or raise Med → High) and **never less**. The asymmetry is enforced as a clamp in one pure resolver (`resolvePatientPolicy`), with `sanitizePolicyOverrides` dropping any loosening/no-op entry — so no dashboard bug or hand-edited data can ever weaken a clinical guardrail. Overrides ride in the patient record and are injected into Eve's trusted context; per-document `answer_policy` and per-category overrides compose.

## Agent & model

The agent's project shape, how it reaches a model, and how it's hardened against untrusted input.

### Eve agent project structure — [ADR 005](archive/005-eve-agent-project-structure.md)
The agent lives in `eve-concierge/` using Eve's nested layout (app root separate from the authored `agent/` surface), as an isolated sub-project with its own `package.json`/lockfile, excluded from the root pnpm workspace, linking `@essos/shared` via `link:`. This fixes Eve's app-root detection (a top-level folder literally named `agent/` made Eve resolve the repo root and fail at runtime with `Cannot find package 'eve'`) and isolates the agent's pinned beta deps. Env loads from the app root via an `.env` symlink to the repo-root `.env`.

### Model routing: direct Anthropic — [ADR 006](archive/006-model-routing-direct-anthropic.md)
Eve routes directly to Anthropic via `@ai-sdk/anthropic` (a provider model instance, not a `"provider/model"` gateway string), because the work-trial credential is a raw zero-data-retention Anthropic key, not a Vercel AI Gateway key. Direct routing uses the ZDR key as-is and keeps PHI/PII off a third-party gateway hop. Model id is the hyphenated Anthropic form (`claude-sonnet-4-5`, via `ESSOS_AGENT_MODEL`); the provider-managed `web_search` built-in is disabled (the org lacks it, and the concierge must answer only from its own sources).

### Agent hardening + transport auth — [ADR 009](archive/009-agent-hardening-and-transport-auth.md)
Because Eve ingests untrusted patient free-text, the dangerous default built-ins (`bash`, `read_file`, `write_file`, `glob`, `grep`, `web_fetch`, `web_search`) are each removed with a `disableTool()` sentinel — notably `web_fetch` runs with full `process.env` and could exfiltrate API keys via prompt injection. Eve's HTTP channel uses real auth (`[localDev(), transportSecret()]`, a timing-safe bearer check that fails closed) instead of the scaffolded `placeholderAuth()`. Tool output is PII-minimized (`get_itinerary` drops null fields), and the `escalate_to_human` reason enum is constrained to escalation-eligible categories. A deterministic eval suite guards the autonomous-vs-escalate behavior.

## Transport & messaging UX

How patient messages get in and out, and what makes the thread feel human rather than like a bot.

### Spectrum iMessage transport — [ADR 004](archive/004-spectrum-imessage-transport.md)
Use Spectrum Cloud for the iMessage group-chat transport, chosen over Sendblue for first-class group spaces and a richer iMessage-native path. Iterate terminal-first for speed, then wire the live iMessage group; map a `space`/chat id to a conversation, answer low-severity in-thread, and flag the human team on anything unsafe or uncertain. Mini-app cards are a deliberate later focus (they need Apple/iMessage extension setup) behind a text-first build with structured text, tapbacks, and typing indicators.

### Transport / Eve streaming contract — [ADR 008](archive/008-transport-eve-streaming-contract.md)
The transport talks to Eve over an HTTP session API (`POST /eve/v1/session` to start, `POST …/:id` to continue a durable multi-turn session, `GET …/stream` for ndjson, `GET …/health`) and stays cleanly swappable. Parsing the ndjson stream, it assembles a turn's reply from the **final non-`tool-calls` assistant message** (a turn runs as multiple steps: a pre-tool filler message, the tool call, then the real answer) and terminates on `turn.completed`/`session.completed`, surfacing `*.failed` events as errors. Patients are bound by normalized handle; the same provider-agnostic `handleInbound` serves terminal and iMessage.

### iMessage plaintext + texting voice — [ADR 012](archive/012-imessage-plaintext-and-voice.md)
Two layers make Eve read like a person texting. A deterministic transport-side normalizer (`toImessageText`, pure + unit-tested) strips Markdown to clean plaintext on **every** outbound send — so `**bold**` and `# headers` never reach a patient as literal characters — applied to auto-replies, dashboard/AI-drafted concierge replies, and reminders (terminal left raw). A tightened, poke-inspired voice in the instructions (match length/energy, no preamble, no robotic filler, mirror emoji) is the soft layer; the normalizer is the hard guarantee. An opt-in `[[react: …]]` token becomes a native iMessage tapback, never on a medical/safety/escalation turn.

### Spectrum five-stage inbound pipeline — [ADR 023](archive/023-spectrum-inbound-pipeline.md)
Replace "one LLM turn per message" with Photon's five-stage pipeline so Eve behaves like a person under real conditions: **debounce a burst into one turn**, mark-read/typing, generate one reply, then **send paced bubbles with crash-safe dedup**. A follow-up sent mid-reply cancels the in-flight turn (via `AbortController`) and carries the batch forward. Orchestration is in-process (timers); durability lives in Convex (`batch_queue`, `carried_messages`, `inflight_chains`, `job_failures`, `agent_memory`) so a transport restart recovers. Adds per-patient memory (the *What Eve remembers* card) and a new-contact guard that keeps the first reply to one text-only bubble for deliverability. Tunable via `ESSOS_DEBOUNCE_MS` / `ESSOS_SEND_PACING_MS`.

### Guest onboarding + deployment topology — [ADR 017](archive/017-guest-onboarding-and-deployment.md)
So anyone can try the live agent by texting the line, an unknown sender is auto-provisioned a **guest patient** cloned from a template (default `pat_maya`) — idempotent per handle — so Eve has a real itinerary + care plan to ground answers (a blank guest would just escalate everything); gated by `ESSOS_GUEST_MODE`. The system deploys as Convex Cloud (data + functions + the `/machine` door), Vercel (dashboard), and Railway (Eve web service + the long-running Spectrum transport, plus the opt-in Slack worker). Eve and the transport sit on Railway because both are persistent Node processes that share the monorepo build; a stream watchdog + single-instance lock keep the one Spectrum consumer healthy.

## Concierge & dashboard UX

The single pane of glass, the human side of the handoff, and the team well-being thesis behind it.

### Admin dashboard architecture — [ADR 007](archive/007-admin-dashboard-architecture.md)
The dashboard is a Next.js (App Router) single pane of glass over conversations, escalations, patient records, and telemetry. Originally it read the shared store directly with no API tier and mutated via Server Actions; the data layer later moved to reactive Convex ([ADR 013](archive/013-convex-backend.md)), but the surface stays the same: Overview with the live open-escalation queue, conversation list + thread view, patient + itinerary detail, and an inline source-document route. Tailwind v4 with brand tokens; reusable primitives and badges; standard loading/error/not-found route states.

### Handoff patient feedback + reply bridge — [ADR 010](archive/010-handoff-patient-feedback-ux.md)
Escalation must be a two-sided handoff, not a silent dead end. Eve gives a brief, warm, non-clinical acknowledgement on escalation; the first message after pausing gets a single severity-aware "the care team is reviewing this" holding notice, then silence. A concierge can reply to the patient straight from the dashboard — queued and delivered to the patient's iMessage by the transport, marking the thread `taken_over`. The waiting time and unanswered-message count surface as an SLA signal. (This fixed the live "no response" bug: a multi-turn stream-replay bug returned a stale earlier turn, and `paused_for_review` silence was indistinguishable from a broken bot.)

### Concierge AI-assist + proactive care — [ADR 011](archive/011-concierge-ai-assist-and-proactive-care.md)
The centerpiece: on escalation Eve also drafts a patient-ready `suggested_reply` (plus the sources it used) that prefills the dashboard reply box, so a human reviews/edits/sends in one tap — model proposes, human approves, and Eve stays clinically silent. Adds a one-time AI disclosure on Eve's first message (human team on the thread, a person steps in for anything medical), one clarifying question for genuinely ambiguous *logistics* (never clinical), and proactive, source-grounded pre-op reminders built only from the verified packet. Holding-notice dedup and Eve's multi-turn session are made durable so a restart neither double-sends nor loses continuity.

### Agent telemetry + analytics — [ADR 015](archive/015-agent-telemetry-and-analytics.md)
Capture per-turn telemetry the system used to discard — tool calls, finish reason, token usage, wall-clock latency, and the escalation outcome — into a Convex `agent_turns` table (best-effort, never failing a patient turn). The dashboard turns it into an AI-performance view (autonomy/resolution rate, latency p50/p95, tool mix, tokens, daily volume, AI-draft quality, reminders sent) and a Team view (time-to-resolution, queue age, per-concierge workload scoped to the org). Per Convex rules, analytics queries take `now`/the window as an argument and stay index-backed.

### Concierge ownership + RBAC — [ADR 016](archive/016-concierge-ownership-and-rbac.md)
Patients (and their conversations/escalations) carry an owning concierge (`assignee_user_id`) inside a single Clerk Organization. A team lead (`org:admin`) sees everyone and can (re)assign; a concierge (`org:member`) sees their patients plus the unassigned queue and can self-claim; the open-escalation queue stays shared so anyone can triage. The machine path (agent + transport) is intentionally not ownership-aware. Single-org now, with true multi-tenancy (clinics as separate orgs) a clean follow-up — the ownership plumbing is the hard part and it's in place.

### Patient management CRUD — [ADR 020](archive/020-patient-management-crud.md)
Concierges maintain records directly from the dashboard: a sortable/filterable roster, per-patient editing of profile, itinerary, care instructions, and source documents, plus document uploads to Convex file storage — all via Clerk-gated mutations. Because Eve's tools read the same Convex tables through the machine path, human edits ground the agent on its next tool call with no separate sync layer. Roster reads respect lead/member scoping; editing is open to any signed-in concierge (the data is shared truth, not a per-rep silo); deletes cascade and are blocked while open conversations exist.

### Slack concierge bridge — [ADR 019](archive/019-slack-concierge-bridge.md)
A staff-facing Slack surface (not a patient transport) brings the escalation queue and handoff into where the team already lives: one thread per escalation with Eve's draft, buttons to send the draft / take over / resolve / resume, `/essos` lookups for status/schedule/files, and an App Home queue. The thesis is explicit — to care for patients you must care for the caregivers, so cutting cognitive switching and load is upstream of patient outcomes. It reuses Convex as the source of truth and the transport's outbound loop to reach the patient, so Slack and the dashboard never diverge; fully opt-in via `SLACK_ENABLED`.

## Platform

The reactive backend, identity, and how it all ships.

### Convex backend — [ADR 013](archive/013-convex-backend.md)
The shared source of truth moved from local SQLite to **Convex** for reactivity — the dashboard subscribes with `useQuery`, so escalations/messages/telemetry update live with no reload (right for a 3am console) — and for deployability. Two access paths: the dashboard (human) calls Clerk-authenticated public functions wrapped to resolve the signed-in concierge; the agent + transport (machine, no Clerk) call one service-secret-guarded `/machine` HTTP action dispatching to whitelisted `internal*` functions. Conventions enforced: index-backed reads only, never `Date.now()` in a query, thin wrappers over a `convex/model/` layer, durable message latches via an indexed `meta_kind`. Trade-off: hosted patient data lives in Convex cloud (notional for the trial), while model routing stays direct-Anthropic ZDR.

### Clerk auth + identity — [ADR 014](archive/014-clerk-auth-and-identity.md)
The dashboard authenticates concierges with **Clerk**, modeling the team as a Clerk Organization (`org:admin` = lead, `org:member` = concierge) — real identities to attribute work to (replacing a hardcoded `ASSIGNEE`) and real RBAC. Convex trusts the Clerk issuer; `conciergeQuery`/`conciergeMutation` stamp the actor automatically; the Next 16 `proxy.ts` middleware is a passthrough (so the public demo isn't walled), with `ESSOS_REQUIRE_AUTH` on Convex as the fail-closed switch. Users/orgs sync on first sign-in and via a verified webhook. Clerk is optional locally — with no key, a dev "demo concierge" (treated as lead) keeps the demo zero-setup.

### Deploy pipeline (CI/CD) — [ADR 018](archive/018-deploy-pipeline-cicd.md)
One GitHub Actions workflow deploys on every push to `main` (plus manual dispatch): **Convex first, then Vercel + Railway depend on it**, so the backend is live before callers. No concurrent production deploys (let an in-flight one finish rather than race), Vercel builds remotely (`vercel deploy --prod`, the proven monorepo path), and the Railway job is opt-in to avoid double-deploying when Railway's own auto-deploy is on. Secrets live in Actions; `--frozen-lockfile` fails an out-of-sync lockfile by design; the manual runbook still works as a fallback.

## Quality & evals

### Eval + continuous-learning loop — [ADR 022](archive/022-eval-and-continuous-learning-loop.md)
Close the loop between production behavior and the suite with three cheap, durable signals — no fine-tuning or external platform. Write `agent_turns.category` on every turn (so telemetry slices by taxonomy), add a human escalation-validity label (the gold "was this escalation necessary?" that turns over-escalation into a number), and a draft-edit-distance signal for draft quality. LLM-as-judge soft assertions (groundedness, no-medical-advice) sit on top of the deterministic tool-routing gates, gated under `--strict` in CI (judge routes direct to Anthropic per the ZDR posture). A production→eval flywheel turns a mishandled escalation into a committed regression case, so each real mistake becomes a permanent test.

## How it gets better over time

A concierge product should be sharper after its first hundred conversations than its first ten. Essos is built to improve on two levels, and the machinery for both is already in place (not a roadmap promise):

- **Per patient.** Eve keeps durable per-patient memory (`remember_patient` → the *What Eve remembers* card), injected into the trusted context on every turn, so it carries names, companions, and preferences forward across a patient's whole trip ([ADR 023](archive/023-spectrum-inbound-pipeline.md)). Per-patient policy overrides ([ADR 021](archive/021-per-patient-policy-overrides.md)) let the team tune caution for an individual without touching the global floor.
- **System-wide.** Every turn is captured as telemetry — latency, tools, tokens, finish reason, escalation outcome ([ADR 015](archive/015-agent-telemetry-and-analytics.md)) — so "where is the AI tripping up, how fast is it, how often does it escalate" becomes a number instead of a vibe. The **escalation-validity label** ([ADR 022](archive/022-eval-and-continuous-learning-loop.md)) is the highest-leverage signal: a human "was this necessary?" verdict that makes over-escalation measurable per category and is the explicit trigger to loosen a category or widen what Eve may answer. Draft-edit-distance tracks whether the AI's suggested replies are good enough to send as-is, and the production→eval flywheel turns each real mistake into a committed regression test.

Together these mean improvement is driven by observed outcomes, with a human in the loop deciding what "better" means — rather than a black-box training pipeline. At higher volume the same telemetry supports A/B-style experiments (e.g. correlating response time or autonomy rate with patient-satisfaction signals); that correlation work is future, but the instrumentation it needs already ships.

## What's next (surfaced in product review)

Ideas raised with the concierge team that fit the architecture but are intentionally not built yet:

- **Clinic three-way handoff.** Today the concierge often plays "telephone" between patient and clinic. The same machine-path + outbox pattern that powers the Slack bridge ([ADR 019](archive/019-slack-concierge-bridge.md)) could add a clinic-facing surface, with a Harvey-style "dump it in, edit anything low-confidence" intake to make the agent↔clinic↔human handoff seamless.
- **Voice / phone.** A voice agent (or just call transcription into the same conversation + telemetry tables) for the cases the team currently handles by phone.
- **Multi-clinic tenancy + referrals.** The ownership/RBAC plumbing ([ADR 016](archive/016-concierge-ownership-and-rbac.md)) is built single-org; promoting clinics to separate orgs with org-scoped reads is a clean follow-up, not a rewrite.
- **Per-patient channels at low volume.** A "do things that don't scale" mode that gives each patient their own Slack channel for white-glove focus while caseloads are small.
