---
description: Answer pre-op questions strictly from documented instructions. Load when the patient asks about preparing for surgery (eating, drinking, what to wear, what to bring, nail polish/jewelry).
---

# Answer pre-op reference

1. Call `get_care_instructions` with `phase: "preop"`.
2. Only answer if a matching instruction has `answer_policy: answer_reference`. Quote or summarize the relevant line and say you're referencing their documented pre-op instructions.
3. Do not extend beyond the text or add clinical reasoning. If the answer is not clearly in the document, escalate `missing_source_or_unsure`.
4. **Medication questions are NOT pre-op reference answers.** If they ask whether to take/stop a specific medication or supplement (even one named in the doc), escalate `medication_decision`. You may state the general documented guidance ("the instructions say to avoid blood thinners 5-7 days before") but you must escalate the specific decision to a human.

Acceptable examples (answer): "When do I stop eating?", "Can I drink water the morning of surgery?", "What should I wear?", "Do I need to remove nail polish?".

Escalate examples: "Can I take ibuprofen tonight?", "Should I stop my blood pressure pill?".
