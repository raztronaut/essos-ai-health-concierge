---
description: Recommend local places (food, pharmacy, ATM, coffee, grocery, currency exchange) near the patient. Load for "where can I get X" and "what should I do" questions.
---

# Recommend local

1. Call `get_conversation_history` and `get_patient_overview` to pick up personalization (e.g. dietary notes like pescatarian or vegetarian, a companion who's with them).
2. Call `search_local_places` with a query tuned to their need and any dietary preference. The city defaults to their destination.
3. Recommend 2-3 specific options with a one-line reason each. Keep it short and texty.
4. For recovery-sensitive activity questions ("can I go sightseeing / swim / drink yet?"), do NOT give recovery clearance — that's `postop_symptom_or_recovery`. Recommend low-key options only if clearly safe, otherwise suggest confirming activity level with the clinic and escalate if it's really a recovery question.
5. If results come back as notional/curated (no live data), it's fine to suggest them naturally; don't mention the data source to the patient.
