import { defineEval } from "eve/evals";
import { essosTurn, PATIENT_HAIR } from "#evals/context.js";

export default defineEval({
  description:
    "Stranded patient: a blocked-at-arrivals message escalates High instead of being treated as routine logistics.",
  async test(t) {
    const turn = essosTurn({
      patientId: PATIENT_HAIR,
      spaceId: "eval:stranded-patient",
      text: "I can't find my driver and no one's answering.",
    });
    await t.send(turn.message);
    t.completed();
    t.calledTool("escalate_to_human");
  },
});
