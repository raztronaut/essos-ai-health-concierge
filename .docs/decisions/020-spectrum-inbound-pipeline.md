# Spectrum Five-Stage Inbound Pipeline

## Decision

Replace the "one LLM turn per inbound message" path with Photon's five-stage
inbound pipeline ([.agents/skills/spectrum/best-practices.md](../../.agents/skills/spectrum/best-practices.md)):
**debounce a burst into one turn, mark-read/typing, generate one reply, send it
with pacing and crash-safe dedup**, plus a job-failure audit and per-person
memory. Orchestration is **in-process** (timers + `AbortController`); durability
lives in **Convex** so a transport restart can recover.

## Why

People text in bursts ("hey" / "wait" / "actually, the question"). Generating a
reply per message produces overlapping answers and races the model against
itself. Debouncing into one turn, cancelling an in-flight turn when a follow-up
lands, and pacing multi-bubble replies make the agent feel like a person. The
transport restarts (supervised; Railway), so the queue and chain state must be
durable.

## Design

- **Tables** ([convex/schema.ts](../../convex/schema.ts)): `batch_queue`
  (messages awaiting the debounce), `carried_messages` (drained-but-unfinished
  rows a cancelled chain carries forward), `inflight_chains` (the single chain
  per conversation: `stage`, `cancelled_at`, `start_index`, `sent_guids`),
  `job_failures` (audit, 30-day retention), `agent_memory` (per-patient working
  memory). Model files: [convex/model/pipeline.ts](../../convex/model/pipeline.ts),
  [convex/model/jobFailures.ts](../../convex/model/jobFailures.ts),
  [convex/model/memory.ts](../../convex/model/memory.ts); exposed through the
  `/machine` door ([convex/machine.ts](../../convex/machine.ts),
  [convex/http.ts](../../convex/http.ts)) and
  [shared/src/convex.ts](../../shared/src/convex.ts).
- **Orchestrator** ([transport/src/pipeline.ts](../../transport/src/pipeline.ts)):
  `enqueue` resolves the conversation, logs the patient message once (prompt
  Slack mirror; carry-forward never re-logs), queues it, cancels any in-flight
  chain, and re-arms a per-conversation debounce timer. `runChain` claims the
  chain and runs the stages behind one `AbortController`; a follow-up aborts the
  in-flight model call and carries the batch forward.
- **Stages**: flush (drain carried + queued, combine text), mark-read/typing,
  generate (the existing `generateTurn` in [transport/src/core.ts](../../transport/src/core.ts)
  — handoff state, disclosure latch, `askEve`, graceful degradation, telemetry),
  send (split into bubbles, pace by `SEND_PACING_MS`, persist `start_index` +
  `sent_guids` after each so a crash resumes without re-sending).
- **Generation stays in the transport**: `askEve` talks to the local eve HTTP
  server; Convex actions can't reach it. The `AbortSignal` is threaded into the
  eve fetch so a cancelled turn actually stops.
- **Memory**: keyed by `patient_id` (per-person, stable across a patient's
  conversations). Injected as `known_about_patient` in
  [transport/src/context.ts](../../transport/src/context.ts); written by the eve
  tool [eve-concierge/agent/tools/remember_patient.ts](../../eve-concierge/agent/tools/remember_patient.ts).
- **Concierge messages** bypass the queue and cancel any in-flight chain, so Eve
  never speaks after a human takes over.

## Deviations from the source pattern

- **Log at enqueue, not flush.** Logging each patient message once when it
  arrives gives prompt persistence + Slack mirroring and makes carry-forward
  trivially safe (queue rows only drive batching, never re-logging).
- **In-process cancellation via `AbortController`** rather than DB polling: the
  single-process transport aborts synchronously; `inflight_chains.cancelled_at`
  is the durable record for recovery/observability.
- **Send dedup state lives in `inflight_chains`** (`start_index` + `sent_guids`),
  not on `messages` rows.
- **No mid-send abort.** Generation (the slow part) is cancellable; sends are
  fast and a partial re-send would duplicate, so sending runs to completion.
- **Recovery is best-effort.** Stranded queued messages are picked up when the
  next message for that conversation arrives (no live Spectrum space exists at
  startup); orphaned chain markers are cleared. Spectrum exposes no `clientGuid`
  on send or mark-as-read API, so dedup is worker-side and the read stage is
  typing-only.

## Config

`ESSOS_DEBOUNCE_MS` (5000), `ESSOS_SEND_PACING_MS` (800),
`ESSOS_JOB_FAILURE_RETENTION_DAYS` (30) in [transport/src/env.ts](../../transport/src/env.ts).

## Consequences

- First-reply latency rises by the debounce window (tunable); acceptable for a
  conversational agent.
- `handleInbound` remains as a thin single-message wrapper over `generateTurn`
  for the terminal smoke suite and direct callers.
- New tables and `/machine` functions ship through the existing `convex deploy`
  CI step; the long-running Railway transport suits the in-memory-timer +
  Convex-durability model.
