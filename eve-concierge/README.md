# eve-concierge

The Essos concierge agent — the "brain." Built on the [Eve](https://www.npmjs.com/package/eve) framework. This is an isolated Eve sub-project (its own `package.json`/`pnpm-lock.yaml`, not part of the root workspace) that links `@essos/shared` for the shared SQLite repo layer. See [ADR 005](../.docs/decisions/005-eve-agent-project-structure.md).

## Layout (Eve nested layout)

```
eve-concierge/
├── package.json        name: essos-eve-concierge
├── tsconfig.json       include: agent/**/*.ts
├── .env -> ../.env     symlink; Eve loads env from its app root
└── agent/              authored surface
    ├── agent.ts        model config (direct Anthropic)
    ├── instructions.md persona + escalation policy
    ├── channels/eve.ts HTTP session channel (/eve/v1/session)
    ├── tools/          executable tools (one per file; name = filename)
    └── skills/         load-on-demand procedures (Markdown)
```

## Model

`agent/agent.ts` routes **directly to Anthropic** via `@ai-sdk/anthropic`, using `ANTHROPIC_API_KEY` and the model id in `ESSOS_AGENT_MODEL` (default `claude-sonnet-4-5`). This avoids the Vercel AI Gateway and keeps PHI off a third-party hop. See [ADR 006](../.docs/decisions/006-model-routing-direct-anthropic.md).

## Tools (`agent/tools/`)

| Tool | Purpose |
| --- | --- |
| `get_patient_overview` | Patient profile (procedure, destination, clinic, hotel, companion, dietary notes). |
| `get_itinerary` | Flights, hotel, transport/driver, appointments, follow-ups, confirmation numbers — source of truth for logistics. |
| `get_care_instructions` | Documented pre/post/general care docs, each with an `answer_policy`. |
| `get_conversation_history` | Recent messages for personalization. |
| `search_local_places` | Restaurants/pharmacies/ATMs/etc. via Google Places, with a curated offline fallback. |
| `update_logistics` | Records routine coordination (e.g. notify driver of a new pickup time) to the activity log. |
| `escalate_to_human` | The trip wire: writes a High/Med escalation, pauses automation, logs the event. |
| `web_search` | **Disabled** (`disableTool()`) — the concierge answers only from its own sources. |

## Skills (`agent/skills/`)

`triage_and_escalate`, `handle_travel_disruption`, `answer_preop_reference`, `recommend_local` — load-on-demand procedures that encode the escalation taxonomy and the safe-answer policies.

## Instructions

`agent/instructions.md` defines the persona, the trusted `<<ESSOS_CONTEXT>>` block contract, the source-of-truth hierarchy, and the must-escalate policy (medication decisions, post-op symptoms, clinical judgment, staff safety, out-of-package, unsure). See [ADR 001](../.docs/decisions/001-escalation-taxonomy.md) and [ADR 002](../.docs/decisions/002-care-instructions-source-of-truth.md).

## Run

```bash
# from repo root
pnpm eve:dev      # eve dev --no-ui --port 3000
pnpm eve:build    # compile .eve/ + build .output/

# or from this directory
pnpm exec eve dev --no-ui --port 3000
pnpm exec eve info     # inspect discovered tools/skills/channels + app root
```

The transport bridge calls this server at `EVE_BASE_URL` (default `http://127.0.0.1:3000`). See [ADR 008](../.docs/decisions/008-transport-eve-streaming-contract.md) for the session API and event stream.

## Built-in tool hardening (follow-up)

Eve's default harness still exposes generic `bash`/`read_file`/`write_file`/`glob`/`grep`/`web_fetch` tools. For non-demo use, disable the ones a patient-facing concierge shouldn't have, using the same `disableTool()` pattern as `agent/tools/web_search.ts`.
