# Slack Concierge Bridge

## Decision

Add a **staff-facing Slack bridge** (`slack/`, `@essos/slack`) that brings the escalation queue and the handoff workflow into the place the concierge team already works. It mirrors escalations and progress into a shared Slack channel — one thread per escalation/patient — and lets a concierge **reply to the patient, take over, resolve, and resume Eve** directly from the thread, plus pull patient status, schedule, and files via `/essos` slash commands and an App Home queue. It is a separate surface from the dashboard, not a patient transport: it reuses Convex as the source of truth and the existing [transport outbound loop](../../../transport/src/outbound.ts) to actually reach the patient over iMessage.

It is deliberately **not** an eve Slack channel or a Spectrum custom platform. Both of those model `space = conversation = the AI answering a sender`; we do not want Eve answering staff. Slack here is "the dashboard, where the team already lives."

## Why

The reason this exists is a belief about care quality: **to take care of patients well, you also have to take care of the people doing the caring.** Concierge/caregiver burnout and workload are not a side concern — they are upstream of patient outcomes. A trip-wire system that pages a human at 3am only helps if acting on it is frictionless for that human.

Two principles follow:

1. **Solutions should live where the team operates.** The [dashboard](007-admin-dashboard-architecture.md) is an excellent single pane of glass, but it is *another* place to watch. A concierge team already lives in Slack all day. Pushing escalations into Slack — and making the response actionable there — means the work comes to them instead of requiring them to keep a tab open and poll it.
2. **Minimize cognitive switching and cognitive load.** Every context switch (Slack → dashboard → patient thread) has a cost, and that cost compounds across a shift and across a team. Letting a concierge read the escalation, see Eve's source-grounded draft, and reply to the patient — all inside one Slack thread — collapses three contexts into one. The AI-assist draft ([ADR 011](011-concierge-ai-assist-and-proactive-care.md)) becomes a one-tap "Send AI draft" button; takeover/resolve/resume become buttons; "what's this patient's status / schedule / files" becomes a slash command instead of a navigation.

This complements rather than replaces the dashboard: the dashboard stays the deep, auditable console; Slack is the low-friction, in-flow surface for the moments that matter most (a flag, a reply, a quick lookup).

## Design

A standalone long-running service (like the transport — Slack Socket Mode holds a persistent websocket, so it can't be serverless), wired over the same service-secret [`/machine`](../../../convex/http.ts) HTTP path the agent and transport use (no Clerk identity). Two flows:

### Convex → Slack (alerts / progress)

- **Schema** ([convex/schema.ts](../../../convex/schema.ts)): `slack_outbox` (a delivery queue mirroring the `messages.outbound` pattern — `kind: escalation | activity | patient_message`, `status: pending | posted`, `slack_ts`) and `slack_links` (maps a conversation to its Slack `thread_ts` so updates thread correctly). Plus `users.slack_user_id` for identity mapping.
- **Enqueue hooks** ([convex/model/slack.ts](../../../convex/model/slack.ts)), all no-ops unless `SLACK_ENABLED`: `escalateToHuman` enqueues the escalation card (this row *creates* the thread); `Activity.log` enqueues threaded progress for `taken_over`/`resolved`/`resumed`/`reminder`; `Messages.add` mirrors patient replies. Activity and patient messages only enqueue once a thread exists, so Slack stays focused on escalated threads (one thread per escalation).
- **Poll loop** ([slack/src/outboxLoop.ts](../../../slack/src/outboxLoop.ts)) drains `listPendingSlackOutbox`, posts Block Kit, and records `thread_ts` via `upsertSlackLink` — mirroring the transport's `startOutboundLoop`. We poll rather than subscribe because trusted backends can't open Convex reactive subscriptions (the same reason the transport polls).

### Slack → Convex (reply / take over / resolve / commands)

- **Listeners** ([slack/src/listeners.ts](../../../slack/src/listeners.ts)) over Socket Mode: thread replies → `conciergeReplyFromSlack`; buttons (Send AI draft / Take over / Resolve / Resume) → the matching machine mutation; `/essos patient|schedule|files|queue <name>` → read functions rendered as ephemeral Block Kit; `app_home_opened` → a per-user queue view.
- **Replies reuse the handoff path**: `conciergeReplyFromSlack` signs the reply, enqueues it as a `pending` outbound `concierge` message, and marks the thread taken over — so the transport's existing loop delivers it to the patient over iMessage, exactly like a dashboard reply ([ADR 010](010-handoff-patient-feedback-ux.md)).
- **Identity & RBAC** ([slack/src/identity.ts](../../../slack/src/identity.ts)): a Slack user is resolved to a concierge by email (persisting `slack_user_id`), so actions attribute to a real person and the App Home queue respects the lead/member scoping from [ADR 016](016-concierge-ownership-and-rbac.md). An unmatched Slack user still acts, attributed by display name.
- **Machine functions** ([convex/machine.ts](../../../convex/machine.ts)) are `internal*` and whitelisted in [convex/http.ts](../../../convex/http.ts), wrapped in [shared/src/convex.ts](../../../shared/src/convex.ts). Writes reuse existing model logic (`markConciergeTakeover`, `resolve`, `resumeAutomation`, the `enqueueConciergeOutbound` path) but take a concierge ref instead of a Clerk JWT.

## Consequences / trade-offs

- The team gets the trip wire and the one-tap response *in Slack*, cutting the dashboard out of the critical path for the common cases (acknowledge, send the draft, resolve) while the dashboard remains the deep console and audit trail. Every Slack action still flows through Convex, so the dashboard, telemetry ([ADR 015](015-agent-telemetry-and-analytics.md)), and activity log stay consistent.
- Slack and the dashboard can both act on the same escalation; because both go through the same machine mutations and `automation_state` transitions ([ADR 003](003-human-handoff-and-takeover.md)), there's a single source of truth and no divergent state.
- The bridge is **opt-in**: `SLACK_ENABLED` gates the Convex-side enqueue and the service refuses to start without `SLACK_APP_TOKEN`/`SLACK_BOT_TOKEN`/`SLACK_ESCALATION_CHANNEL_ID`, so a deploy without Slack configured is a clean no-op.
- It runs as another long-running worker alongside the transport. `slack:dev` is a standalone root script (not in the default `pnpm dev` fan-out) so local dev doesn't require Slack credentials.
- v1 mirrors *patient* messages and concierge replies sent from Slack into the thread; dashboard-originated concierge replies are not mirrored back into Slack yet (a small follow-up). PII/PHI in Slack is the same notional-data posture as the rest of the trial — a real deployment would scope the channel and revisit what patient content is surfaced.
