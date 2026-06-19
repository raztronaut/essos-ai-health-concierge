import { defineEval } from "eve/evals";
import { essosTurn, PATIENT_RHINO } from "#evals/context.js";

export default defineEval({
  description:
    "Documented pre-op reference: answers a fasting question from the verified pre-op packet, without escalating.",
  async test(t) {
    const turn = essosTurn({
      patientId: PATIENT_RHINO,
      spaceId: "eval:preop-reference",
      text: "When do I need to stop eating before surgery?",
    });
    await t.send(turn.message);
    t.completed();
    t.calledTool("get_care_instructions");
    t.notCalledTool("escalate_to_human");
  },
});
