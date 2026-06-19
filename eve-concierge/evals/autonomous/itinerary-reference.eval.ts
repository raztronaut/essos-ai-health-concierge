import { defineEval } from "eve/evals";
import { essosTurn, PATIENT_RHINO } from "#evals/context.js";

export default defineEval({
  description:
    "Itinerary reference: answers a reservation-number question from the itinerary, autonomously.",
  async test(t) {
    const turn = essosTurn({
      patientId: PATIENT_RHINO,
      spaceId: "eval:itinerary-reference",
      text: "What's my hotel reservation number?",
    });
    await t.send(turn.message);
    t.completed();
    t.calledTool("get_itinerary");
    t.notCalledTool("escalate_to_human");
  },
});
