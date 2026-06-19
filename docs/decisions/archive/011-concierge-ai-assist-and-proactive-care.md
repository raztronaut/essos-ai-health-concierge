# Concierge AI-Assist, AI Disclosure, Clarifying Questions, and Proactive Pre-op Care

## Decision

Build on the two-sided handoff ([ADR 010](010-handoff-patient-feedback-ux.md)) to make both the patient and concierge experiences excellent, and align the app with three eve patterns it was not yet using (human-in-the-loop approval, durable state, scheduled outreach):

1. **Concierge AI-assist (the centerpiece).** When Eve escalates, it also drafts a patient-ready `suggested_reply` (plus the `suggested_reply_sources` it used). The draft prefills the dashboard reply box so the concierge can review, edit, and send in one tap. The patient never sees it until a human submits — eve's "model proposes, human approves" HITL pattern, with the dashboard as the approval surface. Eve stays clinically silent to the patient; the human supplies any medical answer.
2. **One-time AI disclosure.** The first time Eve replies in a conversation, it prepends a short disclosure that the patient is talking to an AI assistant, with the human care team on the thread and a person always stepping in for anything medical. Required for a health context and for eve's disclosure duty.
3. **Clarifying questions.** For genuinely ambiguous *logistics* requests, Eve may ask one clarifying question instead of guessing or escalating — a brief natural reply in the thread (the patient answers next turn), with the built-in `ask_question` tool also available. Never used for clinical questions — those still go straight to `escalate_to_human`.
4. **Proactive pre-op reminders.** Ahead of a procedure, Eve sends a warm, source-grounded reminder built only from the patient's verified pre-op packet (`answer_policy = answer_reference`).
5. **Durable reliability.** The holding-notice latch and Eve's multi-turn session are now persisted, so a transport restart neither duplicates the holding notice nor drops conversation continuity.

## Why

This is a product-led pass: the brief asks for a single pane of glass with trip wires that let the human team sleep at 3am. The AI-assist turns each trip wire into a one-tap action; the disclosure and clarifying questions make the patient side trustworthy and less robotic; and the proactive reminder is the kind of "they thought of everything" touch that defines a concierge. Each one also exercises an eve capability the MVP had left on the table.

## Design

### AI-assist draft

- Schema: two nullable columns on `escalations` — `suggested_reply` and `suggested_reply_sources` (a JSON array of short labels) — added to [shared/src/db.ts](../../../shared/src/db.ts), [shared/src/types.ts](../../../shared/src/types.ts), and `createEscalation` ([shared/src/repo.ts](../../../shared/src/repo.ts)), with a `parseSuggestedReplySources` helper. Typed columns (not `messages.meta_json`) because the draft belongs to the escalation and maps 1:1 onto a future Convex `escalations` document.
- Tool: `escalate_to_human` ([eve-concierge/agent/tools/escalate_to_human.ts](../../../eve-concierge/agent/tools/escalate_to_human.ts)) gains optional `suggested_reply` + `suggested_reply_sources` inputs and logs a `drafted` activity event. [instructions.md](../../../eve-concierge/agent/instructions.md) tells Eve to ground the draft only in profile/itinerary/`answer_reference` care docs and never to put medical advice in it.
- UI: [concierge-reply-box.tsx](../../../dashboard/features/conversations/concierge-reply-box.tsx) (now a small client component) prefills the textarea with the draft, shows the source chips and an "AI-suggested — review before sending" badge, and offers a Clear. Sending is unchanged: it composes the signature, enqueues outbound, and marks `taken_over`. The flags panel and overview queue show an "AI draft ready" hint.

### Disclosure, clarifying questions, reminders

- Disclosure is emitted in [transport/src/core.ts](../../../transport/src/core.ts) on Eve's first reply, gated durably by a `meta.kind = "disclosure"` message so it fires exactly once and survives restarts.
- Clarifying questions are an instruction-level allowance (a brief natural-text question fits this turn-based iMessage transport, with the built-in `ask_question` tool also available) — no code change in the tool surface.
- Reminders live in [transport/src/reminders.ts](../../../transport/src/reminders.ts): an hourly sweep (`startReminderLoop`, wired into [transport/src/imessage.ts](../../../transport/src/imessage.ts)) finds a procedure within ~18h and sends a reminder quoting the verified pre-op packet, deduped via a `meta.kind = "reminder"` message and delivered through the existing `resolveSpace`/`space.send` path. A one-shot `pnpm transport:remind` (`--patient <id>`) fires it on demand for demos.

eve `schedules` are root-only and hand off to an eve channel, but patient delivery lives in the transport/Spectrum layer, so the scheduler lives there too. The reminder text is deterministic and source-grounded (not free-LLM) so a proactive health message can never drift off-policy.

### Durable reliability

- The holding-notice latch reads `hasMessageWithMetaKind(conversationId, "handoff_holding", sinceEscalationCreatedAt)` instead of an in-memory `Set` ([transport/src/core.ts](../../../transport/src/core.ts)).
- Eve's session `{ sessionId, continuationToken, turns }` is persisted to a new `conversations.eve_session` column via `saveEveSession` / `getEveSession`, with the in-memory map kept as a fast read-through.

## Forward note (Clerk + Convex)

All new persistence goes through `@essos/shared` repo helpers (no raw SQL in the dashboard or transport), and new fields are plain/serializable, so the SQLite layer can later be swapped for Convex in one place and the dashboard wrapped with Clerk auth. The transport-side reminder sweep is isolated so it can become a Convex scheduled function.

## Consequences / trade-offs

- The AI draft is advisory and always human-approved; it is never auto-sent, and for clinical questions it deliberately contains no medical advice.
- Adding two escalation columns and one conversation column has no migration framework, so apply via `pnpm seed:reset` (data is notional).
- The reminder dedup is per-conversation (one pre-op reminder), which is sufficient for the single-procedure demo; `--force` on the one-shot bypasses it for repeat demos.
- Disclosure adds one short message at the start of each conversation — an intentional, one-time cost.
