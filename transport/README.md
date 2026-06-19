# @essos/transport

The Spectrum transport bridge. It connects an iMessage (or terminal) group chat to the Eve agent: it consumes inbound messages, resolves the patient/conversation, calls Eve's HTTP session API, and posts Eve's reply back into the thread. Eve and Spectrum stay decoupled over HTTP so the transport is swappable. See [ADR 004](../docs/decisions/archive/004-spectrum-imessage-transport.md) and [ADR 008](../docs/decisions/archive/008-transport-eve-streaming-contract.md).

## Files

| File | Role |
| --- | --- |
| `src/pipeline.ts` | The five-stage inbound orchestrator: debounce → flush → mark-read/typing → generate → paced, crash-safe send (in-process timers + `AbortController`, durable in Convex). See [ADR 023](../docs/decisions/archive/023-spectrum-inbound-pipeline.md). |
| `src/core.ts` | `generateTurn`/`handleInbound` — provider-agnostic turn logic (resolve patient, handoff rules, disclosure latch, call Eve, telemetry). |
| `src/eveClient.ts` | Eve HTTP client: create/continue session + parse the ndjson stream. Pure `reduceEveEvents`/`splitNdjson` are unit-tested. |
| `src/context.ts` | Builds the trusted `<<ESSOS_CONTEXT>>` block (incl. policy overrides + per-patient memory) prepended to each turn. |
| `src/outbound.ts` | Drains pending dashboard/Slack concierge replies + reminders to the patient space. |
| `src/imessageText.ts` | `toImessageText` — strips Markdown to iMessage-safe plaintext on every outbound send; extracts `[[react: …]]` tapbacks. Unit-tested. |
| `src/handles.ts` | `normalizeHandle` — canonicalize phone/email handles for patient + concierge matching. |
| `src/terminal.ts` / `src/imessage.ts` | Provider entrypoints (local TUI / Spectrum Cloud iMessage). |
| `src/health.ts` | Stream watchdog + optional `GET /healthz` so a dead connection is loud, not silent. |
| `src/reminders.ts` | Hourly proactive pre-op reminder sweep (deduped, source-grounded). |
| `src/env.ts` / `src/debug.ts` | Repo-root `.env` loader; `ESSOS_DEBUG`-gated logging. |

## Inbound flow

1. Resolve the conversation by Spectrum `space` id; if new, resolve the patient by `handle` (or explicit `patientId` in the terminal demo) and create it. Unknown handles are auto-provisioned a guest patient when `ESSOS_GUEST_MODE=1` ([ADR 017](../docs/decisions/archive/017-guest-onboarding-and-deployment.md)).
2. **Concierge messages** are logged and never auto-answered; during an open escalation they trigger takeover and cancel any in-flight chain.
3. **Patient messages** are debounced into one turn; if automation is `active`, the context block + combined text go to Eve and the reply is sent as paced bubbles. If `paused_for_review`/`taken_over`, Eve stays silent (one holding notice, then quiet). See [ADR 003](../docs/decisions/archive/003-human-handoff-and-takeover.md) and [ADR 010](../docs/decisions/archive/010-handoff-patient-feedback-ux.md).

## Outbound formatting

iMessage has no rich text, so every outbound send (auto-reply, dashboard/Slack concierge replies, reminders) passes through `toImessageText`, which strips Markdown to clean plaintext and converts a `[[react: …]]` token into a native iMessage tapback (a react-only reply sends a reaction, no bubble). The terminal provider is left raw. See [ADR 012](../docs/decisions/archive/012-imessage-plaintext-and-voice.md).

## Eve streaming

Eve sends an ndjson event stream. `reduceEveEvents` (pure, unit-tested) accumulates `message.appended` and takes the final `message.completed` whose `finishReason` is not `tool-calls` (the answer after any tool steps), surfacing `*.failed`/`error` as errors and scraping tool calls + token usage for telemetry. The client sends `Authorization: Bearer $ESSOS_TRANSPORT_SECRET` when set. See [ADR 008](../docs/decisions/archive/008-transport-eve-streaming-contract.md) and [ADR 015](../docs/decisions/archive/015-agent-telemetry-and-analytics.md).

## Run

```bash
# from repo root (Eve dev server must be running: pnpm eve:dev)
pnpm transport:terminal     # local demo, plays ESSOS_DEMO_PATIENT (default pat_maya)
pnpm transport:imessage     # live Spectrum Cloud iMessage
pnpm --filter @essos/transport run smoke   # deterministic core/handoff smoke test (no model)
pnpm --filter @essos/transport test        # unit tests (ndjson reducer / line-splitter / imessageText)
```

In the terminal provider, prefix a line with `/concierge ` to act as the human concierge.

## Env

`EVE_BASE_URL` (default `http://127.0.0.1:3000`), `ESSOS_DEMO_PATIENT`, `ESSOS_CONCIERGE_HANDLES`, `ESSOS_TRANSPORT_SECRET` (bearer for a non-loopback Eve), and for iMessage `SPECTRUM_PROJECT_ID`/`SPECTRUM_PROJECT_SECRET`. The machine path needs `CONVEX_SITE_URL` + `CONVEX_SERVICE_SECRET`; `ESSOS_GUEST_MODE=1` enables guest onboarding. Mini-app cards use `ESSOS_PATIENT_MINIAPP_BASE_URL`, `ESSOS_PATIENT_CARD_TTL_MINUTES`, and `ESSOS_MINIAPP_DELIVERY=link|spectrum_app|customized_miniapp`. Pipeline tuning: `ESSOS_DEBOUNCE_MS`, `ESSOS_SEND_PACING_MS`.

## Deploy

A long-running **Railway worker** (it holds the Spectrum connection + outbound/reminder loops), built from [deploy/transport.Dockerfile](../deploy/transport.Dockerfile). See the [deploy runbook](../docs/runbooks/deploy.md) and [live iMessage runbook](../docs/runbooks/live-imessage.md).
