# iMessage Plaintext Formatting and Texting Voice

## Decision

Make Eve's messages read like a real person texting in iMessage, on two fronts:

1. **Deterministic plaintext normalization at the transport.** Every outbound iMessage send is passed through `toImessageText()` ([transport/src/imessageText.ts](../../../transport/src/imessageText.ts)), which strips Markdown to clean plaintext before delivery. iMessage has no rich-text rendering, so model-emitted Markdown (`**bold**`, `# headers`, `- bullets`, `[label](url)`, backticks, fenced code) was reaching patients as literal characters.
2. **A tightened, poke-inspired texting voice in the agent instructions.** [eve-concierge/agent/instructions.md](../../../eve-concierge/agent/instructions.md) gains a `Formatting` section (plaintext only) and a stricter `Tone` section (match the patient's length/energy, no preamble/postamble, banned robotic phrases, mirror emoji, acknowledge naturally) — all within the existing safety guardrails.

We also added an opt-in **tapback** path: Eve can end a reply with a `[[react: ...]]` control token that the transport converts into a native iMessage reaction instead of a text bubble.

## Why

The brief is an AI concierge living inside the patient/concierge iMessage group; the experience has to feel human and trustworthy. Two gaps undercut that:

- Patients literally saw `**Grand Hotel Tijuana**` and `**GHT-770133**` in their texts — an obvious "this is a bot" tell, and harder to read.
- The default assistant register (preamble, "Let me know if you need anything else", paragraph replies to one-line questions) reads robotic in a text thread.

The fix is split across the two layers it belongs to. iMessage rendering is a **transport** concern, so the reliable, testable fix is a normalizer at the send sites — it works regardless of what the model emits, and also covers human/AI-drafted concierge replies and proactive reminders. Voice is an **agent** concern, so the instructions ask for plaintext and a better texting register (belt-and-suspenders with the normalizer). The texting-voice guidance is adapted from leaked "Poke" agent prompts (the Interaction Company), tuned down for a health context — warmth and brevity, not wit on medical turns.

## Design

### Normalizer (`toImessageText`)

`toImessageText(raw) -> { text, react }`:

- Strips emphasis (`**`/`__`/`*`/word-bounded `_`), ATX headers, blockquotes, horizontal rules, inline + fenced code, and strikethrough.
- Converts `-`/`*`/`+` bullets to `•`; keeps numbered lists.
- Rewrites `[label](url)` to `label (url)` and `<url>` to a bare URL.
- Leaves `snake_case` and intra-word underscores intact (single-underscore italics are only unwrapped when word-bounded).
- Collapses 3+ newlines to 2 and trims.
- Extracts the first valid `[[react: like|love|laugh|emphasize|question|dislike]]` token and strips all such tokens from the text.

Pure and unit-tested ([transport/src/imessageText.test.ts](../../../transport/src/imessageText.test.ts)), covering each transform, the "no Markdown passes through unchanged" case, and the react-token cases.

### Applied at every outbound iMessage send

- Auto-reply: `onResult` in [transport/src/imessage.ts](../../../transport/src/imessage.ts).
- Dashboard concierge replies (including AI-drafted `suggested_reply` Markdown): `drainPendingOutbound` and the shared `sendToPatientSpace` in [transport/src/outbound.ts](../../../transport/src/outbound.ts).
- Proactive pre-op reminders ride `sendToPatientSpace`, so the quoted pre-op packet body is normalized too.

The terminal transport is intentionally left raw — it is a dev TUI, not a patient surface.

### Tapbacks

`message.react()` in spectrum-ts v4.2.0 takes a plain emoji string (the `imessage.tapbacks.*` constant described in newer Spectrum docs does not exist in this version). `imessage.ts` maps each `TapbackName` to its emoji (`like → 👍`, `love → ❤️`, `laugh → 😂`, `emphasize → ‼️`, `question → ❓`, `dislike → 👎`); iMessage renders these as native tapbacks. A react-only turn (token with no remaining text) sends a reaction and no bubble. Instructions restrict tapbacks to light acknowledgements and forbid them on any medical, safety, or escalation turn.

## Consequences / trade-offs

- The normalizer is deliberately lossy (Markdown structure becomes plaintext), which is correct for a surface with no rich text. If a future surface (e.g. a Slack mirror) needs Markdown, normalize per-channel rather than globally.
- Voice guidance is prompt-level and therefore probabilistic; the normalizer is the hard guarantee for formatting. They are intentionally redundant.
- The `[[react: ...]]` convention is a lightweight control channel in the reply text rather than a tool call, because Eve runs in a separate process and only returns text to the transport; the transport owns reaction delivery.

## Forward note (Convex)

Normalization lives in one transport module applied at the send sites, so a future move of delivery into a Convex scheduled function or a different provider keeps a single chokepoint to port.
