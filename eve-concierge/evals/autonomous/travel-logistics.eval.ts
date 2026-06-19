import { defineEval } from "eve/evals";
import { essosTurn, PATIENT_RHINO } from "#evals/context.js";

export default defineEval({
  description:
    "Routine travel logistics: records a pickup change with update_logistics instead of escalating.",
  async test(t) {
    const turn = await essosTurn({
      patientId: PATIENT_RHINO,
      spaceId: "eval:travel-logistics",
      text: "My flight is delayed by two hours — can you push my airport pickup back to match?",
    });
    await t.send(turn.message);
    t.completed();
    t.calledTool("update_logistics");
    t.notCalledTool("escalate_to_human");
  },
});
