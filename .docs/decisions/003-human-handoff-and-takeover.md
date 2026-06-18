# Human Handoff and Takeover

## Decision

Eve should support explicit conversation-level automation state so human concierges can take over safely inside the same patient group chat. This avoids the agent continuing to answer while a human is already handling a sensitive issue.

## Automation States

| State | Meaning | Eve behavior |
| --- | --- | --- |
| `active` | Eve can answer eligible low-severity messages. | Classify and respond normally. |
| `paused_for_review` | Eve escalated and is waiting for a human. | Do not answer new patient messages except brief acknowledgements if configured. |
| `taken_over` | A human concierge has taken control. | Do not auto-respond. Continue logging messages and telemetry. |
| `resolved` | Human resolved the issue and automation may resume. | Dashboard can return conversation to `active`. |

## State Transitions

- `active` -> `paused_for_review`: Eve creates a High/Med escalation.
- `paused_for_review` -> `taken_over`: a human clicks "take over" in the dashboard or replies in-thread after an open escalation.
- `taken_over` -> `resolved`: human resolves the flag in the dashboard.
- `resolved` -> `active`: human explicitly resumes Eve for the conversation.

## In-Thread Behavior

When Eve escalates, it should:

1. Acknowledge the patient without giving unsafe advice.
2. Mention that the concierge team has been flagged.
3. Write an escalation row.
4. Set automation to `paused_for_review`.

Example:

> I am flagging this for the Essos concierge team now so a human can confirm the right next step. I will keep this thread visible to them.

When a human takes over, Eve should not answer patient messages until automation is resumed from the dashboard.

## Dashboard Requirements

The dashboard should include:

- Conversation state badge: `active`, `paused_for_review`, `taken_over`, `resolved`.
- Open escalation queue with level/reason.
- "Take over" action.
- "Resolve" action.
- "Resume Eve" action.
- Activity log showing when Eve paused, who took over, and who resumed automation.

## Transport Rules

- Ignore messages authored by Eve.
- Treat concierge-authored messages during an open escalation as a takeover signal.
- Continue storing all group messages even when Eve is paused.
- Do not require the patient to leave the group chat or move channels for escalation.
