# Decision Records

Architecture decision records (ADRs) for the Essos AI Health Tourism Concierge. Each doc states a decision and the reasoning behind it. Numbers are stable; new decisions append.

Format: `# Title` followed by `## Decision` and supporting sections (Why, consequences, etc.).

| # | Decision | Summary |
| --- | --- | --- |
| [001](001-escalation-taxonomy.md) | Escalation taxonomy | The fixed set of message categories, which are autonomous vs must-escalate, and default escalation levels. |
| [002](002-care-instructions-source-of-truth.md) | Care-instructions source of truth | How documented care instructions are modeled (source type/status, answer policy) and when Eve may quote vs must escalate. |
| [003](003-human-handoff-and-takeover.md) | Human handoff and takeover | Conversation automation states (`active`/`paused_for_review`/`taken_over`/`resolved`) and the in-thread + dashboard handoff behavior. |
| [004](004-spectrum-imessage-transport.md) | Spectrum iMessage transport | Why Spectrum Cloud is the iMessage group-chat transport, terminal-first iteration, and the mini-app-card later-focus. |
| [005](005-eve-agent-project-structure.md) | Eve agent project structure | Nested Eve layout, the `agent/` -> `eve-concierge/` rename, app-root detection, and the isolated sub-project. |
| [006](006-model-routing-direct-anthropic.md) | Model routing: direct Anthropic | Routing directly to Anthropic (not the AI Gateway) for the ZDR key, the direct model id, and disabling `web_search`. |
| [007](007-admin-dashboard-architecture.md) | Admin dashboard architecture | Next.js App Router reading SQLite directly via `@essos/shared`, server actions, and the source-doc PDF route. |
| [008](008-transport-eve-streaming-contract.md) | Transport / Eve streaming contract | The Eve session HTTP API, ndjson event schema, reply assembly, and patient-binding/takeover in the transport. |
| [009](009-agent-hardening-and-transport-auth.md) | Agent hardening and transport auth | Disabling dangerous built-in tools, replacing `placeholderAuth()` with a transport shared-secret, PII-minimized tool output, the constrained escalation enum, and the eval suite. |
| [010](010-handoff-patient-feedback-ux.md) | Handoff patient feedback + concierge reply bridge | Keeping the patient informed during escalation (acknowledgment + one-time holding notice) and letting the concierge reply to the patient from the dashboard; the multi-turn stream-replay fix. |
| [011](011-concierge-ai-assist-and-proactive-care.md) | Concierge AI-assist + proactive care | Eve drafts a source-grounded suggested reply the concierge approves/sends, a one-time AI disclosure, clarifying questions, proactive pre-op reminders, and durable holding-notice + Eve-session state. |
| [012](012-imessage-plaintext-and-voice.md) | iMessage plaintext formatting + texting voice | A transport-side Markdown→plaintext normalizer on every outbound send (so `**bold**` never reaches a patient), a poke-inspired texting voice in the instructions, and an opt-in `[[react: ...]]` tapback path. |

## Grouping

- **Product / safety policy:** 001, 002, 003, 010, 011
- **Transport:** 004, 008, 010, 011, 012
- **Agent + model:** 005, 006, 009, 011, 012
- **Dashboard:** 007, 010, 011
