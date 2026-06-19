# Agent-Turn Telemetry and Analytics

## Decision

Capture per-turn AI telemetry that the system previously discarded, persist it to a Convex `agent_turns` table, and surface AI-performance and concierge-team analytics in the dashboard.

## Why

The brief asks for visibility into what the AI is doing and how the team is performing. Previously the Overview showed four counts and the transport reduced Eve's whole event stream down to the final reply text — latency, tool calls, finish reason, and token usage were thrown away. There was no way to see autonomy rate, response time, tool mix, cost, draft quality, or per-rep workload.

## Design

### Capture (transport)

[transport/src/eveClient.ts](../../../transport/src/eveClient.ts) `reduceEveEvents` now also scrapes, best-effort and tolerant of schema variations: tool-call names, `finishReason`, and token usage. [transport/src/core.ts](../../../transport/src/core.ts) measures wall-clock latency around the agent call and writes an `agent_turns` row via `recordAgentTurn`. Whether a turn escalated is read from the conversation's resulting `paused_for_review` state — a reliable signal independent of the stream's tool-event schema. Failed and empty turns are recorded too.

### Storage (Convex)

`agent_turns` ([convex/schema.ts](../../../convex/schema.ts)) holds conversation/patient ids, `latency_ms`, `tool_calls[]`, `finish_reason`, prompt/completion/total tokens, `escalated`, `ok`/`error`, and `created_at`, indexed `by_conversation` and `by_created`.

### Analytics (dashboard)

- **AI performance** ([dashboard/app/performance](../../../dashboard/app/performance)): autonomy/resolution rate, latency p50/p95/avg, tool-usage distribution, token totals, a daily-volume trend, and **AI-assist draft quality** (share of escalations Eve drafted a `suggested_reply` for) plus proactive reminders sent.
- **Team** ([dashboard/app/team](../../../dashboard/app/team)): time-to-resolution, open-queue age, and per-concierge resolved/taken-over counts, scoped to the active Clerk org's members.

Per the Convex ruleset, every analytics query takes the time window / `now` as an argument (queries never call `Date.now()`), and all reads are index-backed.

## Reminders scheduler note

ADR 011's forward note anticipated moving the pre-op reminder sweep to Convex. **Step 1 landed here:** the reminder dedup is now durable and index-backed in Convex (`meta_kind = "reminder"` via `hasMessageWithMetaKind`). The hourly sweep + Spectrum delivery intentionally stay in the transport ([transport/src/reminders.ts](../../../transport/src/reminders.ts)) because the Spectrum SDK lives there; a `convex/crons.ts` scheduled function is deferred to avoid a second delivery path (double-send risk) until the transport exposes a send endpoint.

## Consequences

- Token/cost metrics depend on Eve surfacing usage in its stream; when absent, telemetry still ships latency, tool calls, finish reason, and escalation outcome, and the dashboard shows "no usage reported."
- Telemetry writes are best-effort (`.catch`) so they never fail a patient-facing turn.
