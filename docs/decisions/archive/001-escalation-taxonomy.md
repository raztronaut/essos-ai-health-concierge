# Escalation Taxonomy

## Decision

Eve should classify every patient message before deciding whether to answer, ask a short clarification question, or escalate. The taxonomy is intentionally conservative around clinical judgment while still allowing the concierge to be useful for routine logistics, documented instructions, and local support.

## Categories

| Category | Autonomous? | Escalation level | Notes |
| --- | --- | --- | --- |
| `itinerary_reference` | Yes | None | Answer from itinerary source of truth: pickups, flights, hotel, appointments, reservation info, follow-ups. |
| `travel_logistics` | Yes, if routine | Med if blocked | Flight delays, early arrival, driver updates, transport confirmations. Escalate if the agent cannot complete the coordination or the patient is stranded. |
| `local_recommendation` | Yes | None | Restaurants, pharmacies, ATMs, grocery, coffee, currency exchange, general area suggestions. Use known context and Google Places. |
| `documented_preop_reference` | Yes | None | Only quote or summarize documented pre-op instructions. No clinical judgment. |
| `medication_decision` | No | High or Med | Anything asking whether to take, stop, combine, replace, or resume medication or supplements must escalate. |
| `postop_symptom_or_recovery` | No | High or Med | Pain, bleeding, fever, swelling, nausea, dizziness, congestion, showering, flying, sleeping, exercise, foods, glasses, makeup, contacts. |
| `medical_or_clinical_judgment` | No | High | Any diagnosis, normal-vs-concerning judgment, treatment advice, anesthesia, infection, complications, or emergency guidance. |
| `staff_safety_or_quality` | No | High or Med | Hospital/clinic staff concerns, hygiene, unsafe behavior, or a patient feeling uncomfortable with care. |
| `out_of_package_request` | No, except acknowledge | Med | Extra procedure, extra nights, unscheduled transport, added companion services, or anything likely requiring approval. |
| `missing_source_or_unsure` | No | Med | Agent cannot find a reliable source, confidence is low, or the patient asks something outside loaded data. |

## Priority Rules

- If a message matches multiple categories, choose the safest category.
- Medical categories override logistics categories.
- Missing source of truth means escalate, not improvise.
- Pre-op answers are allowed only when the answer is directly supported by loaded instructions.
- Medication questions are not normal pre-op reference answers, even if the pre-op document mentions medication names.
- Post-op questions are treated as escalation unless a later product phase adds reliable patient-specific post-op instructions and a carefully reviewed response policy.

## Dashboard Requirements

Each escalation should include:

- `conversation_id`
- `patient_id`
- `level`: `High` or `Med`
- `reason`: one taxonomy category
- `summary`: one sentence explaining why Eve escalated
- `source_message_id`
- `status`: `open`, `taken_over`, or `resolved`
- `assignee`
- `created_at`, `resolved_at`

## Demo Scenarios

- "When do I stop eating?" -> `documented_preop_reference`, answer from pre-op docs.
- "Can I take ibuprofen?" -> `medication_decision`, escalate.
- "Is this swelling normal?" -> `postop_symptom_or_recovery`, escalate.
- "My flight is delayed. Can you update my driver?" -> `travel_logistics`, answer and write notional logistics update.
- "I cannot find my driver at arrivals." -> `travel_logistics`, escalate Med or High depending wait time and patient state.
- "The nurse was not wearing gloves." -> `staff_safety_or_quality`, escalate.
