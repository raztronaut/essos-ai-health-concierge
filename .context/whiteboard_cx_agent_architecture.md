# CX Agent for Patients Getting Procedures Done

> Whiteboard capture — June 18, 2026. Product architecture brainstorm for the AI health tourism concierge.

## Journey Scope

**From booking → patient back home**

The agent covers the full patient lifecycle abroad: pre-trip logistics, in-country coordination, procedure day, recovery, and return travel.

---

## Context (Data the Agent Needs)

The agent must have access to patient-specific context to answer questions accurately and escalate when appropriate.

| Data source | Details |
|---|---|
| **Past conversations with patient** | History of prior messages with the concierge team and clinic |
| **Full itinerary** | See breakdown below |
| **Post-op instructions** | Recovery guidance (may be personalized; not always a clean source of truth) |

### Full Itinerary Components

- **Flight** — departure/arrival times, airports, delays
- **Clinic** — appointments, pickups, procedure timing
- **Hotel** — reservation details, check-in/out, extensions
- **Follow-ups** — post-op consultations, cast removal, etc.
- **Pre-op** — testing, fasting windows, medication rules, what to bring

---

## Example Situations (Use Cases)

### 1. Travel Hiccups

- Passport expired — renewal needed
- Flight delays / cancellations
- Basic Q&A on itinerary (e.g. pickup times, reservation numbers, driver contact)

### 2. Medical Questions — **Escalate, Don't Respond**

> Marked with a large **X** on the whiteboard.

The agent should **not** provide medical advice. Route these to a human.

**Exception:** Basic pre-op questions are OK when the agent is referencing the patient's documented pre-op instructions (source of truth), not giving clinical judgment.

Examples of acceptable pre-op (reference-only):
- When do I need to stop eating?
- Can I drink water the morning of surgery?
- What should I wear to the hospital?

Examples that must escalate:
- Is this swelling normal?
- Can I take this medication?
- I have pain / bleeding / fever — what should I do?

### 3. "Where Can I Get X?" Questions

- Location-based recommendations (restaurants, pharmacies, ATMs, etc.)
- **Google Places API** as a likely data source

---

## Monitor (Escalation Logic)

A monitoring layer watches conversations and flags cases for human intervention.

### Priority Levels

| Level | Meaning |
|---|---|
| **High** | Urgent — human should intervene immediately |
| **Med** | Moderate — human should review / follow up |

### Escalation Triggers

- **Medical** — any question that crosses into clinical advice, symptoms, or recovery judgment
- **Unsure** — agent lacks confidence or cannot find a reliable answer in its context

---

## Architecture Sketch

```
Patient (SMS / iMessage group chat)
        │
        ▼
   CX Agent ──────────────────────────────┐
        │                                 │
        ├── Context: itinerary, pre-op,   │
        │   post-op, past conversations   │
        │                                 │
        ├── Tools: Google Places API      │
        │   (local recommendations)       │
        │                                 │
        └── Monitor ──► High / Med alert  │
              │                           │
              ▼                           ▼
         Human concierge team      (escalation path)
```

---

## Alignment with Project Context

This whiteboard maps directly to the work trial scope described in the intro meeting and supporting docs:

- **Low-severity, autonomous handling** — travel logistics, itinerary Q&A, local recommendations, pre-op reference answers
- **Human-in-the-loop for high stakes** — medical questions, safety concerns, staff issues, anything the agent is unsure about
- **Group chat integration** — agent joins existing patient ↔ concierge conversation; escalations wake the human team (e.g. 2am driver disappearance scenario)
- **Data sources** — itineraries and pre-op instructions are source of truth; post-op instructions may be incomplete and require clinic escalation
- **Privacy** — patient data handled with zero-retention API agreements

---

## Open Notes (from whiteboard margins)

- `version` — likely a model or API version reference (unclear from image)
- `$30 (Feb $25)` — possible pricing note for a service or API tier
