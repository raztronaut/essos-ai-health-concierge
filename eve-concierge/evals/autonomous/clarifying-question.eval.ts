import { defineEval } from "eve/evals";
import { essosTurn, PATIENT_RHINO } from "#evals/context.js";

export default defineEval({
  description:
    "Ambiguous logistics: an underspecified pickup-change request asks a clarifying question instead of guessing or escalating.",
  async test(t) {
    // Maya has several transport pickups, so this is genuinely ambiguous and
    // should prompt one clarifying question rather than a guess or an escalation.
    const turn = await essosTurn({
      patientId: PATIENT_RHINO,
      spaceId: "eval:clarifying-question",
      text: "Can you change my driver pickup time?",
    });
    await t.send(turn.message);
    t.completed();
    // The behavior that matters: ask for the missing detail, don't escalate and
    // don't fabricate a change. In this turn-based iMessage thread a natural
    // text question is the right pattern (the patient just replies next turn),
    // so assert the reply asks something rather than mandating the HITL tool.
    t.notCalledTool("escalate_to_human");
    t.messageIncludes("?");
  },
});
