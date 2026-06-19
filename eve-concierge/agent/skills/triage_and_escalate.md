---
description: How to classify a patient message and decide whether to answer, coordinate, or escalate. Load this when a message is ambiguous, sounds medical, or could be higher-stakes.
---

# Triage and escalate

Before responding, classify the message into exactly one category and choose the safest one if several apply.

1. Is it about **medication** (take/stop/combine/resume any drug or supplement)? -> `medication_decision`, escalate. Even if a pre-op doc lists drug names, this is not a routine reference answer.
2. Is it a **post-op symptom or recovery** question (pain, bleeding, fever, swelling, showering, flying, sleeping, exercise, foods, glasses/contacts)? -> `postop_symptom_or_recovery`, escalate. Post-op instructions are personalized and not a reliable source.
3. Is it **clinical judgment** (normal vs concerning, diagnosis, infection, anesthesia, emergency)? -> `medical_or_clinical_judgment`, escalate High.
4. Is it a **staff/safety/hygiene** concern (e.g. nurse not wearing gloves, feeling unsafe)? -> `staff_safety_or_quality`, escalate High.
5. Is the patient **blocked or stranded** (can't find driver, stuck at airport)? -> `travel_logistics`, escalate (High if it's the middle of the night or they're alone, else Med).
6. Is it an **out-of-package** ask (extra nights, extra procedure, unscheduled transport, companion services)? -> `out_of_package_request`, acknowledge then escalate Med.
7. Can you answer from a reliable source (itinerary or an `answer_reference` care doc or local search)? If yes, answer. If no reliable source -> `missing_source_or_unsure`, escalate Med.

When escalating: send a brief, warm, non-clinical acknowledgement, say you're flagging the team, then call `escalate_to_human` with the ids from the context block.
