# @essos/transport

The Spectrum transport bridge. It connects an iMessage (or terminal) group chat to the Eve agent: it consumes inbound messages, resolves the patient/conversation, calls Eve's HTTP session API, and posts Eve's reply back into the thread. Eve and Spectrum stay decoupled over HTTP so the transport is swappable. See [ADR 004](../.docs/decisions/004-spectrum-imessage-transport.md) and [ADR 008](../.docs/decisions/008-transport-eve-streaming-contract.md).

## Files

| File | Role |
| --- | --- |
| `src/core.ts` | `handleInbound` — provider-agnostic inbound state machine (resolve patient, handoff rules, call Eve, record reply). |
| `src/eveClient.ts` | Eve HTTP client: create/continue session + parse the ndjson event stream (`collectReply`). |
| `src/context.ts` | Builds the trusted `<<ESSOS_CONTEXT>>` block prepended to each turn. |
| `src/terminal.ts` | Terminal provider entrypoint (play the patient locally). |
| `src/imessage.ts` | Spectrum Cloud iMessage provider entrypoint. |
| `src/contentText.ts` | Normalizes Spectrum message content to text. |
| `src/env.ts` | Loads the repo-root `.env`; exposes `EVE_BASE_URL`, `DEMO_PATIENT`, `CONCIERGE_HANDLES`. |
| `src/smoke.ts` | Deterministic end-to-end test of the core + DB + handoff rules (no live model). |

## Inbound flow (`handleInbound`)

1. Resolve the conversation by Spectrum `space` id; if new, resolve the patient by `handle` (or explicit `patientId` in the terminal demo) and create it.
2. **Concierge messages** are logged and never auto-answered; during an open escalation they trigger takeover (`markConciergeTakeover`).
3. **Patient messages** are logged; if automation is `active`, the context block + message go to Eve, and the reply is recorded and returned. If `paused_for_review`/`taken_over`, Eve stays silent.

See [ADR 003](../.docs/decisions/003-human-handoff-and-takeover.md) for the handoff states.

## Patient binding

Inbound senders are matched to a patient by exact `handle` (E.164 phone or Apple ID email). Seeded handles are fictional — to test live, set a patient's `handle` in `mock-assets/patients/*.json` and re-seed. Concierge handles come from `ESSOS_CONCIERGE_HANDLES` (comma-separated, real handles not display names).

## Eve streaming client

Eve sends an ndjson event stream. `collectReply` accumulates `message.appended` (`data.messageSoFar`) and takes the final `message.completed` whose `finishReason` is not `tool-calls` (the answer after any tool steps), resolving on `turn.completed`/`session.completed` and surfacing `*.failed` as errors. See [ADR 008](../.docs/decisions/008-transport-eve-streaming-contract.md).

## Run

```bash
# from repo root (Eve dev server must be running: pnpm eve:dev)
pnpm transport:terminal     # local demo, plays ESSOS_DEMO_PATIENT (default pat_maya)
pnpm transport:imessage     # live Spectrum Cloud iMessage

# deterministic core/handoff smoke test (no model needed)
pnpm --filter @essos/transport run smoke
```

In the terminal provider, prefix a line with `/concierge ` to act as the human concierge.

## Env

`EVE_BASE_URL` (default `http://127.0.0.1:3000`), `ESSOS_DEMO_PATIENT`, `ESSOS_CONCIERGE_HANDLES`, and for iMessage `SPECTRUM_PROJECT_ID` / `SPECTRUM_PROJECT_SECRET`.
