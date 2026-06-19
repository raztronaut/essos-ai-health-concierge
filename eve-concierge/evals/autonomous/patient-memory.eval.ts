import { defineEval } from "eve/evals";
import { essosTurn, PATIENT_RHINO } from "#evals/context.js";

export default defineEval({
  description:
    "Patient memory: stable preferences are remembered without escalating.",
  async test(t) {
    const turn = await essosTurn({
      patientId: PATIENT_RHINO,
      spaceId: "eval:patient-memory",
      text: "Please call me Maya and remember I'm vegetarian.",
    });
    await t.send(turn.message);
    t.completed();
    t.calledTool("remember_patient");
    t.notCalledTool("escalate_to_human");
  },
});
