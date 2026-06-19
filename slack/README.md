# @essos/slack

The Slack concierge bridge — a staff-facing surface that brings the escalation queue and handoff workflow into where the team already works. It mirrors escalations and progress into a shared channel (one thread per escalation/patient) and lets a concierge reply to the patient, take over, resolve, and resume Eve from the thread, plus pull patient status/schedule/files via `/essos` and an App Home queue.

It is **not** a patient transport: Slack is staff-only. The bridge reuses Convex as the source of truth and the existing [transport outbound loop](../transport/src/outbound.ts) to deliver replies to the patient over iMessage. The thesis — caring for the caregivers is upstream of patient care, so cut cognitive switching — is in [ADR 019](../docs/decisions/archive/019-slack-concierge-bridge.md).

## Files

| File | Role |
| --- | --- |
| `src/index.ts` | Boots the Bolt `App` in Socket Mode, registers listeners, starts the outbox loop, handles shutdown. |
| `src/outboxLoop.ts` | Polls `listPendingSlackOutbox`, posts Block Kit (escalation cards + threaded updates), records `thread_ts`, marks rows posted. |
| `src/listeners.ts` | Socket Mode handlers: thread replies, action buttons (send AI draft / take over / resolve / resume), `/essos`, `app_home_opened`. |
| `src/blocks.ts` | Block Kit builders: escalation card, activity/patient-message updates, `/essos` views, App Home. |
| `src/identity.ts` | Resolves a Slack user to a concierge by email (persisting `slack_user_id`) so actions attribute to a real person and respect lead/member RBAC ([ADR 016](../docs/decisions/archive/016-concierge-ownership-and-rbac.md)). |
| `src/env.ts` / `src/debug.ts` | Repo-root `.env` loader; `ESSOS_DEBUG`-gated logging. |

## Flows

- **Convex → Slack.** `escalateToHuman`, key `Activity.log` events (`taken_over`/`resolved`/`resumed`/`reminder`), and patient replies enqueue rows in `slack_outbox` (no-op unless `SLACK_ENABLED`). The poll loop drains them: an `escalation` row posts a card and creates the thread; `activity`/`patient_message` rows post into that thread. `SLACK_ACTIVITY_CHANNEL_ID` optionally mirrors a compact operational feed.
- **Slack → Convex.** Thread replies and buttons map back to a conversation via `slack_links`, resolve the Slack user to a concierge, and call machine mutations. A reply is signed, enqueued as a `pending` outbound `concierge` message, and the thread is marked taken over — so the transport delivers it to the patient (same path as a dashboard reply, [ADR 010](../docs/decisions/archive/010-handoff-patient-feedback-ux.md)).

## Slack app setup

Create an app at api.slack.com:

- Enable **Socket Mode** (`xapp-` app token) and **Install to Workspace** for a bot token (`xoxb-`). Bot scopes: `chat:write`, `chat:write.public`, `channels:read`, `groups:read`, `channels:history`, `groups:history`, `commands`, `users:read`, `users:read.email`, `files:read`.
- **Event Subscriptions** (bot events): `message.channels`, `message.groups`, `app_mention`, `app_home_opened`.
- Add the **`/essos`** slash command and enable **Interactivity** (both over Socket Mode — no Request URL). Invite the bot to your escalations channel.

## Run & env

```bash
pnpm slack:dev   # from repo root (Convex running; eve + transport for an end-to-end test)
```

Standalone script (not in the default `pnpm dev` fan-out); exits cleanly if required env is missing. Repo-root `.env`: `SLACK_APP_TOKEN`, `SLACK_BOT_TOKEN`, `SLACK_ESCALATION_CHANNEL_ID`, and `SLACK_ENABLED=1` (also `npx convex env set SLACK_ENABLED 1` so the backend enqueues). Optional: `SLACK_ACTIVITY_CHANNEL_ID`, `ESSOS_DASHBOARD_URL`, `SLACK_SLASH_COMMAND`.

## Deploy

A long-running **Railway worker** alongside the transport (Socket Mode holds a persistent websocket). Same monorepo build; see the [deploy runbook](../docs/runbooks/deploy.md).
