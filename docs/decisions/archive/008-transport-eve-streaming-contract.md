# Transport / Eve Streaming Contract

## Decision

The Spectrum transport bridge talks to the Eve agent over Eve's HTTP session API and consumes its ndjson event stream. The streaming client resolves a turn's reply by taking the **final non-`tool-calls` assistant message**, terminating on `turn.completed`/`session.completed` and surfacing `*.failed` events as errors. This keeps Eve (the brain) and Spectrum (the transport) cleanly decoupled and swappable.

## HTTP session API

- `POST /eve/v1/session` with `{ message }` -> `{ sessionId, continuationToken }` (starts a turn).
- `POST /eve/v1/session/:sessionId` with `{ message, continuationToken }` -> continues a durable multi-turn session.
- `GET /eve/v1/session/:sessionId/stream` (accept `application/x-ndjson`) -> the turn's event stream.
- `GET /eve/v1/health` -> readiness, used by the transport to fail fast with a clear message.

The base URL is `EVE_BASE_URL` (default `http://127.0.0.1:3000`). The transport keeps an in-memory `conversationId -> EveSession` map for multi-turn continuity.

## ndjson event schema

Each line is `{ type, data, meta }`. The relevant types for assembling a reply:

- `message.appended` — `data.messageDelta` (incremental) and `data.messageSoFar` (cumulative text for the current step).
- `message.completed` — `data.message` (full step text) and `data.finishReason`. A tool-calling step finishes with `finishReason: "tool-calls"`; the final answer is the `message.completed` whose `finishReason` is not `tool-calls` (e.g. `stop`).
- `turn.completed` / `session.completed` — the turn is done.
- `step.failed` / `turn.failed` / `session.failed` — carry `data.message` (e.g. a model auth or capability error).

### Why "final non-tool-calls message"

A single turn runs as multiple steps. For an itinerary question the model first emits a short pre-tool message (`finishReason: "tool-calls"`, e.g. "I'll look up your reservation..."), calls `get_itinerary`, then emits the real answer in a later step (`finishReason: "stop"`). Naively taking the first completed message returns the filler text; reading top-level fields (rather than `data.*`) returns nothing. `collectReply` in [transport/src/eveClient.ts](../../../transport/src/eveClient.ts) therefore tracks the last non-`tool-calls` `data.message`, falls back to the latest `data.messageSoFar`, and resolves at `turn.completed`.

## Inbound handling

[transport/src/core.ts](../../../transport/src/core.ts) (`handleInbound`) is provider-agnostic and shared by the terminal and iMessage providers:

1. Resolve the conversation by Spectrum `space` id; if new, resolve the patient by `handle` (or an explicit `patientId` for the terminal demo) and create the conversation.
2. Concierge-authored messages are logged and never auto-answered; during an open escalation they trigger takeover (see [003-human-handoff-and-takeover.md](003-human-handoff-and-takeover.md)).
3. Patient messages are logged, then — only if automation is `active` — a trusted `<<ESSOS_CONTEXT>>` block (ids + patient facts) is prepended and sent to Eve. The reply is recorded and returned.

## Patient binding by handle

Inbound iMessage senders are matched to a patient by exact `handle` (E.164 phone or Apple ID email). Seeded patient handles are fictional; to test live, set a seeded patient's `handle` to the test device's handle and re-seed. Concierge handles are configured via `ESSOS_CONCIERGE_HANDLES` (comma-separated) and must be the senders' real handles, not display names.

## Consequences

- Eve's reply parsing depends on the `message.appended`/`message.completed`/`turn.completed` envelope; a future Eve event-schema change requires updating `collectReply`.
- The provider is swappable: `transport:terminal` for local iteration, `transport:imessage` for the Spectrum Cloud demo, both through the same `handleInbound`.
- See [004-spectrum-imessage-transport.md](004-spectrum-imessage-transport.md) for the transport choice and [006-model-routing-direct-anthropic.md](006-model-routing-direct-anthropic.md) for the model behind the session API.
