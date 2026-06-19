# @essos/slack

The Slack concierge bridge — a staff-facing surface that brings the escalation queue and the handoff workflow into the place the team already works. It mirrors escalations and progress into a shared Slack channel (one thread per escalation/patient) and lets a concierge reply to the patient, take over, resolve, and resume Eve from the thread, plus pull patient status/schedule/files via `/essos` and an App Home queue.

It is **not** a patient transport. Slack is staff-only: the bridge reuses Convex as the source of truth and the existing [transport outbound loop](../transport/src/outbound.ts) to deliver replies to the patient over iMessage. See [ADR 019](../.docs/decisions/019-slack-concierge-bridge.md).

## Why this is a separate surface

The [dashboard](../dashboard/README.md) is the deep console; Slack is the low-friction, in-flow surface for the moments that matter (a flag, a reply, a quick lookup). Bringing the trip wire and its one-tap response into Slack cuts cognitive switching for a team that already lives there — part of treating concierge workload/burnout as upstream of patient care. The dashboard and Slack act on the same Convex state, so neither diverges.

## Files

| File | Role |
| --- | --- |
| `src/index.ts` | Boots the Bolt `App` in Socket Mode, registers listeners, starts the outbox loop, handles shutdown. |
| `src/outboxLoop.ts` | Polls `listPendingSlackOutbox`, posts Block Kit (escalation cards + threaded updates), records `thread_ts` via `upsertSlackLink`, marks rows posted. Mirrors the transport's `startOutboundLoop`. |
| `src/listeners.ts` | Socket Mode handlers: thread replies, action buttons (send AI draft / take over / resolve / resume), the `/essos` slash command, and `app_home_opened`. |
| `src/blocks.ts` | Block Kit builders: escalation card, activity/patient-message updates, `/essos` patient/schedule/files/queue views, App Home view. |
| `src/identity.ts` | Resolves a Slack user to a concierge by email (persisting `slack_user_id`) so actions attribute to a real person and respect lead/member RBAC. |
| `src/env.ts` | Loads the repo-root `.env`; exposes the Slack tokens, channel id, dashboard URL, and slash-command name. |
| `src/debug.ts` | `ESSOS_DEBUG`-gated logging. |

## Flows

**Convex → Slack (alerts/progress).** `escalateToHuman`, key `Activity.log` events (`taken_over`/`resolved`/`resumed`/`reminder`), and patient replies enqueue rows in `slack_outbox` (no-op unless `SLACK_ENABLED`). The poll loop drains them: an `escalation` row posts a card and creates the thread; `activity`/`patient_message` rows post into the existing escalation thread. When `SLACK_ACTIVITY_CHANNEL_ID` is set, `activity` rows are also mirrored to that channel as a compact operational feed (with a dashboard deep link); patient messages stay in the escalation thread only.

**Slack → Convex (reply/actions/commands).** Thread replies and buttons map back to a conversation via `slack_links`, resolve the Slack user to a concierge, and call machine mutations. A reply is signed, enqueued as a `pending` outbound `concierge` message, and the thread is marked taken over — so the transport's existing loop delivers it to the patient (same path as a dashboard reply). Slash commands and App Home call read functions and render Block Kit.

## Features

- **Escalation cards** with level, reason, summary, Eve's source-grounded draft, and buttons: Send AI draft, Take over, Resolve, Resume Eve, Open in dashboard.
- **Two-way reply**: type in the thread (or tap Send AI draft) and it reaches the patient.
- **Threaded progress**: takeovers, resolutions, resumes, reminders, and inbound patient messages post under the card.
- **`/essos` commands**: `patient <name>` (status), `schedule <name>` (itinerary), `files <name>` (documents, with links to Convex storage), `queue` (open escalations, ephemeral).
- **App Home**: a per-user queue respecting the lead/member scoping from [ADR 016](../.docs/decisions/016-concierge-ownership-and-rbac.md).

## Run

```bash
# from repo root (Convex running; eve + transport for an end-to-end test)
pnpm slack:dev
```

It's a standalone script (not in the default `pnpm dev` fan-out) so local dev doesn't require Slack credentials. The service exits cleanly if the required env is missing.

## Slack app setup

Create an app at api.slack.com:

- Enable **Socket Mode** (uses the `xapp-` app token).
- **Install to Workspace** for a bot token (`xoxb-`). Bot scopes: `chat:write`, `chat:write.public`, `channels:read`, `groups:read`, `channels:history`, `groups:history`, `commands`, `users:read`, `users:read.email`, `files:read`.
- **Event Subscriptions** (bot events): `message.channels`, `message.groups`, `app_mention`, `app_home_opened`.
- Add the **`/essos`** slash command and enable **Interactivity** (both work over Socket Mode — no Request URL).
- Invite the bot to your escalations channel.

## Env

Repo-root `.env` (never commit secrets): `SLACK_APP_TOKEN`, `SLACK_BOT_TOKEN`, `SLACK_ESCALATION_CHANNEL_ID`, and `SLACK_ENABLED=1` (also set it on the Convex deployment — `npx convex env set SLACK_ENABLED 1` — so the backend enqueues). Optional: `SLACK_ACTIVITY_CHANNEL_ID` (e.g. `#activity`) for a compact lifecycle feed separate from the escalation channel; `ESSOS_DASHBOARD_URL` (default `http://localhost:4000`) for "Open in dashboard" links, `SLACK_SLASH_COMMAND` (default `/essos`).

## Deploy

Runs as a long-running **Railway worker** alongside the transport (Socket Mode holds a persistent websocket, so it can't be serverless). Same monorepo build as the transport; see the root [README](../README.md#deploy-live) and [ADR 017](../.docs/decisions/017-guest-onboarding-and-deployment.md).
