# eve-concierge

The Essos concierge agent — the "brain." Built on the [Eve](https://www.npmjs.com/package/eve) framework as an isolated sub-project (its own `package.json`/`pnpm-lock.yaml`, not in the root workspace) that links `@essos/shared` for the shared types + Convex machine-path client. See [ADR 005](../docs/decisions/archive/005-eve-agent-project-structure.md).

## Layout (Eve nested layout)

```
eve-concierge/
├── package.json        name: essos-eve-concierge
├── .env -> ../.env     symlink; Eve loads env from its app root
├── agent/              authored surface
│   ├── agent.ts        model config (direct Anthropic)
│   ├── instructions.md persona + escalation policy + texting voice
│   ├── channels/eve.ts HTTP session channel (/eve/v1/session) + route auth
│   ├── tools/          executable tools (one per file; name = filename)
│   └── skills/         load-on-demand procedures (Markdown)
└── evals/              deterministic eval suite (eve eval)
```

## Model

`agent/agent.ts` routes **directly to Anthropic** via `@ai-sdk/anthropic` (`ANTHROPIC_API_KEY` + `ESSOS_AGENT_MODEL`, default `claude-sonnet-4-5`) — no Vercel AI Gateway, keeping PHI off a third-party hop. See [ADR 006](../docs/decisions/archive/006-model-routing-direct-anthropic.md).

## Tools (`agent/tools/`)

One per file (filename = tool name):

| Tool | Purpose |
| --- | --- |
| `get_patient_overview` | Patient profile (procedure, destination, clinic, hotel, companion, dietary notes). |
| `get_itinerary` | Flights, hotel, transport, appointments, confirmation numbers — source of truth for logistics (drops null fields). |
| `get_care_instructions` | Documented pre/post/general care docs, each with an `answer_policy`. |
| `get_conversation_history` | Recent messages for personalization. |
| `search_local_places` | Restaurants/pharmacies/ATMs via Google Places, with a curated offline fallback. |
| `update_logistics` | Records routine coordination (e.g. notify driver of a new pickup time). |
| `remember_patient` | Writes durable per-patient memory (the dashboard "What Eve remembers" card). |
| `escalate_to_human` | The trip wire: writes a High/Med escalation, pauses automation, logs the event, and drafts a suggested concierge reply. `reason` is restricted to escalation-eligible categories. |

**Disabled built-ins.** Eve's generic `bash`/`read_file`/`write_file`/`glob`/`grep`/`web_fetch`/`web_search` tools are each removed with a `disableTool()` sentinel file — a patient-facing agent ingests untrusted text and answers only from its own sources. See [ADR 009](../docs/decisions/archive/009-agent-hardening-and-transport-auth.md).

## Skills, instructions, route auth

- **Skills** (`agent/skills/`): `triage_and_escalate`, `handle_travel_disruption`, `answer_preop_reference`, `recommend_local` — load-on-demand procedures encoding the escalation taxonomy and safe-answer policies.
- **Instructions** (`agent/instructions.md`): persona, the trusted `<<ESSOS_CONTEXT>>` contract, the source-of-truth hierarchy, the must-escalate policy ([ADR 001](../docs/decisions/archive/001-escalation-taxonomy.md), [ADR 002](../docs/decisions/archive/002-care-instructions-source-of-truth.md)), and the plaintext + texting voice ([ADR 012](../docs/decisions/archive/012-imessage-plaintext-and-voice.md)).
- **Route auth** (`agent/channels/eve.ts`): `[localDev(), transportSecret()]` — loopback callers are admitted; a non-loopback transport must present `Authorization: Bearer $ESSOS_TRANSPORT_SECRET`. Fails closed. See [ADR 009](../docs/decisions/archive/009-agent-hardening-and-transport-auth.md).

## Run

```bash
# from repo root
pnpm eve:dev      # eve dev --no-ui --port 3000
pnpm eve:build    # compile .eve/ + build .output/

# from this directory
pnpm exec eve dev --no-ui --port 3000
pnpm exec eve eval            # all evals against a local dev server (needs ANTHROPIC_API_KEY)
pnpm exec eve eval escalation # just the escalation group
```

The transport calls this server at `EVE_BASE_URL` (default `http://127.0.0.1:3000`); see [ADR 008](../docs/decisions/archive/008-transport-eve-streaming-contract.md). Deploy: a Railway web service built from [deploy/eve.Dockerfile](../deploy/eve.Dockerfile) — see the [deploy runbook](../docs/runbooks/deploy.md).
