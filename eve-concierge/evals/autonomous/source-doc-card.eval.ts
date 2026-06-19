import { defineEval } from "eve/evals";
import { essosTurn, PATIENT_RHINO } from "#evals/context.js";

export default defineEval({
  description:
    "Source document card: source-doc requests stay autonomous and use the mini-app card path.",
  async test(t) {
    const turn = await essosTurn({
      patientId: PATIENT_RHINO,
      spaceId: "eval:source-doc-card",
      text: "Can I see my source documents?",
    });
    await t.send(turn.message);
    t.completed();
    t.notCalledTool("escalate_to_human");
  },
});
