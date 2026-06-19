# @essos/transport

The Spectrum transport bridge. It connects an iMessage (or terminal) group chat to the Eve agent: it consumes inbound messages, resolves the patient/conversation, calls Eve's HTTP session API, and posts Eve's reply back into the thread. Eve and Spectrum stay decoupled over HTTP so the transport is swappable. See [ADR 004](../.docs/decisions/004-spectrum-imessage-transport.md) and [ADR 008](../.docs/decisions/008-transport-eve-streaming-contract.md).

## Files

| File | Role |
| --- | --- |
| `src/core.ts` | `handleInbound` — provider-agnostic inbound state machine (resolve patient, handoff rules, call Eve, record reply). |
| `src/runLoop.ts` | `runMessageLoop` — the shared inbound loop both entrypoints use (skip outbound/non-text, dispatch, typing). |
| `src/eveClient.ts` | Eve HTTP client: create/continue session + parse the ndjson stream. Pure `reduceEveEvents`/`splitNdjson` are unit-tested. |
| `src/context.ts` | Builds the trusted `<<ESSOS_CONTEXT>>` block prepended to each turn. |
| `src/handles.ts` | `normalizeHandle` — canonicalize phone/email handles for patient + concierge matching. |
| `src/terminal.ts` | Terminal provider entrypoint (play the patient locally). |
| `src/imessage.ts` | Spectrum Cloud iMessage provider entrypoint. |
| `src/contentText.ts` | Normalizes inbound Spectrum message content to text. |
| `src/imessageText.ts` | `toImessageText` — strips Markdown to iMessage-safe plaintext on every outbound send and extracts `[[react: ...]]` tapback tokens. Unit-tested. |
| `src/debug.ts` | `ESSOS_DEBUG`-gated logging. |
| `src/env.ts` | Loads the repo-root `.env`; exposes `EVE_BASE_URL`, `TRANSPORT_SECRET`, `DEMO_PATIENT`, `CONCIERGE_HANDLES`. |
| `src/smoke.ts` | Deterministic end-to-end test of the core + DB + handoff rules (no live model); cleans up its rows. |
| `src/eveClient.test.ts` | Fixture tests for the ndjson reducer + line-splitter (`pnpm --filter @essos/transport test`). |

## Inbound flow (`handleInbound`)

1. Resolve the conversation by Spectrum `space` id; if new, resolve the patient by `handle` (or explicit `patientId` in the terminal demo) and create it.
2. **Concierge messages** are logged and never auto-answered; during an open escalation they trigger takeover (`markConciergeTakeover`).
3. **Patient messages** are logged; if automation is `active`, the context block + message go to Eve, and the reply is recorded and returned. If `paused_for_review`/`taken_over`, Eve stays silent.

See [ADR 003](../.docs/decisions/003-human-handoff-and-takeover.md) for the handoff states.

## Outbound formatting

iMessage has no rich text, so every outbound send (auto-reply in `imessage.ts`, dashboard concierge replies and reminders in `outbound.ts`) is passed through `toImessageText` ([src/imessageText.ts](src/imessageText.ts)), which strips Markdown (`**bold**`, headers, bullets, links, code) to clean plaintext. It also extracts a `[[react: ...]]` token Eve may emit and turns it into a native iMessage tapback (`like`/`love`/`laugh`/`emphasize`/`question`/`dislike`), sending a reaction instead of a bubble when the reply is react-only. The terminal provider is left raw. See [ADR 012](../.docs/decisions/012-imessage-plaintext-and-voice.md).

## Patient binding

Inbound senders are matched to a patient by `handle` (E.164 phone or Apple ID email), normalized first (`normalizeHandle`: lowercase emails, strip phone formatting) so formatting differences don't cause a miss. Seeded handles are fictional — to test live, set a patient's `handle` in `mock-assets/patients/*.json` and re-seed. Concierge handles come from `ESSOS_CONCIERGE_HANDLES` (comma-separated, real handles not display names), normalized the same way.

## Eve streaming client

Eve sends an ndjson event stream. `reduceEveEvents` (pure, unit-tested) accumulates `message.appended` (`data.messageSoFar`) and takes the final `message.completed` whose `finishReason` is not `tool-calls` (the answer after any tool steps), surfacing `*.failed`/`error` as errors; `collectReply` drives it off the live stream and resolves on `turn.completed`/`session.completed`. The client sends `Authorization: Bearer $ESSOS_TRANSPORT_SECRET` when set ([ADR 009](../.docs/decisions/009-agent-hardening-and-transport-auth.md)). The typing indicator is shown only while Eve is actually composing a reply (not for concierge or paused/taken-over turns). See [ADR 008](../.docs/decisions/008-transport-eve-streaming-contract.md).

## Run

```bash
# from repo root (Eve dev server must be running: pnpm eve:dev)
pnpm transport:terminal     # local demo, plays ESSOS_DEMO_PATIENT (default pat_maya)
pnpm transport:imessage     # live Spectrum Cloud iMessage

# deterministic core/handoff smoke test (no model needed)
pnpm --filter @essos/transport run smoke

# unit tests for the ndjson reducer / line-splitter
pnpm --filter @essos/transport test
```

In the terminal provider, prefix a line with `/concierge ` to act as the human concierge.

## Env

`EVE_BASE_URL` (default `http://127.0.0.1:3000`), `ESSOS_DEMO_PATIENT`, `ESSOS_CONCIERGE_HANDLES`, `ESSOS_TRANSPORT_SECRET` (bearer for a non-loopback Eve; optional on localhost), and for iMessage `SPECTRUM_PROJECT_ID` / `SPECTRUM_PROJECT_SECRET`.
