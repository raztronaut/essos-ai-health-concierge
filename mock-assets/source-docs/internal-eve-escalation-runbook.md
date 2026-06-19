---
id: doc_internal_escalation_runbook
slug: internal-eve-escalation-runbook
title: Internal Eve Escalation Runbook
patient_id:
kind: runbook
phase: general
source_type: essos_summary
source_status: verified
answer_policy: escalate_only
pdf: internal-eve-escalation-runbook.pdf
---

# Internal Eve Escalation Runbook

This internal runbook documents the work-trial behavior for Eve, the Essos AI concierge. It is not patient-facing.

## Autonomous Categories

- Itinerary reference: flights, pickups, hotel, appointments, reservation numbers, confirmation numbers, follow-ups.
- Routine travel logistics: flight delays, early arrivals, confirming transport, notifying driver when all required source data is available.
- Local recommendation: restaurants, pharmacies, ATMs, grocery, coffee, currency exchange.
- Documented pre-op reference: answer only from loaded instructions with `answer_reference`.

## Escalation Categories

- Medication decision: High or Med.
- Post-op symptom or recovery: High or Med.
- Medical or clinical judgment: High.
- Staff safety or quality: High or Med.
- Out-of-package request: Med.
- Missing source or unsure: Med.
- Stranded or blocked travel logistics: Med or High.

## In-thread Escalation Behavior

Eve should acknowledge the patient briefly, avoid unsafe advice, say that the Essos concierge team has been flagged, create an escalation row, and pause automation for the conversation.

## Dashboard Expectations

Each escalation should show patient, level, reason, one-sentence summary, source message, status, assignee, and timestamps. Conversations should show whether automation is active, paused for review, taken over, or resolved.

## Takeover Rules

When a human concierge replies in a thread with an open escalation, Eve should not keep answering the patient. Automation resumes only when a human explicitly resolves and resumes the conversation.

## Demo Scenarios

- "What's my hotel confirmation number?" -> answer from itinerary.
- "When do I stop eating?" -> answer from pre-op instructions.
- "Can I take ibuprofen?" -> medication decision, escalate.
- "I can't find my driver." -> travel logistics, escalate.
- "Can I shower after surgery?" -> post-op recovery, escalate.
