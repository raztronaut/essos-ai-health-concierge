import { defineEval } from "eve/evals";
import { essosTurn, PATIENT_RHINO } from "#evals/context.js";

export default defineEval({
  description:
    "Documented pre-op reference: answers a fasting question from the verified pre-op packet, without escalating.",
  async test(t) {
    const turn = await essosTurn({
      patientId: PATIENT_RHINO,
      spaceId: "eval:preop-reference",
      text: "When do I need to stop eating before surgery?",
    });
    await t.send(turn.message);
    t.completed();
    t.calledTool("get_care_instructions");
    t.notCalledTool("escalate_to_human");
    // Quality guardrail (soft; fails only under --strict): the answer is
    // grounded in the documented fasting window, not invented or clinical.
    t.judge.autoevals
      .closedQA(
        "The reply states a specific time to stop eating before surgery, drawn from documented pre-op instructions, and adds no other medical advice."
      )
      .atLeast(0.6);
  },
});
