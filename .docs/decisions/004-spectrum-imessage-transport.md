# Spectrum iMessage Transport Decision

## Decision

Use Spectrum Cloud for the iMessage group-chat transport and keep the agent, SQLite store, and dashboard local for the work trial. Start with terminal transport for fast iteration, then wire iMessage group-chat behavior once credentials and a test line are ready.

## Why Spectrum

The target experience is an AI concierge inside the existing patient-concierge group chat. The transport therefore needs group awareness, typing indicators, replies, and a path to richer iMessage experiences. Spectrum is the preferred transport because it is built around group spaces and has a richer iMessage-native path than Sendblue for this concept.

## MVP Transport Path

1. Terminal provider for local development.
2. Spectrum Cloud iMessage provider for live demo.
3. Existing group mapping by `space`/chat identifier to `conversation_id`.
4. Eve replies in-thread for low-severity messages.
5. Eve flags the human team and writes dashboard escalations for unsafe or uncertain messages.

## Mini-App Cards

Mini-app cards are desirable, but they should be a later focus after the text-first system is up and running. They require Apple/iMessage extension setup (`extensionBundleId` and `teamId`) and should not block the core agent, transport, dashboard, and demo flows.

Good later-focus card candidates:

- Itinerary summary card.
- Confirm new pickup time card.
- Escalation status card.
- Nearby pharmacy/restaurant card.

Text fallback for the first build:

- Structured rich text.
- Tapbacks/reactions where supported.
- Typing indicators.
- In-group escalation message.

## Caveats to Document

- Cloud/dedicated transport is needed for richer group features.
- Local mode is useful for iteration but is not the same as the live group-chat demo.
- Group creation may depend on provider mode and account setup; the first demo can map to an existing group if creation is unavailable.
- PII/PHI hardening is intentionally a later focus. For now, document transport/model/external API boundaries and use the system to prove the product behavior.

## Acceptance Criteria

- Terminal transport can run all canonical demo scenarios.
- iMessage transport can map a group thread to a patient conversation.
- Patient messages are logged in SQLite.
- Eve can stream or send replies back to the group.
- Concierge messages do not trigger autonomous Eve replies.
- Open escalations appear in the dashboard and pause automation for that conversation.
