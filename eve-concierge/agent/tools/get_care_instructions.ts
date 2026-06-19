import { defineTool } from "eve/tools";
import { listCareInstructions } from "@essos/shared";
import { z } from "zod";

/**
 * Read the patient's documented care instructions. Each doc carries an
 * `answer_policy`:
 *   - answer_reference: Eve MAY quote/summarize it (do not extend beyond text).
 *   - escalate_only: Eve must NOT advise; acknowledge and escalate.
 */
export default defineTool({
  description:
    "Get the patient's documented care instructions (pre-op, post-op, general). Use this before answering any pre-op question. Each returned doc has an answer_policy: 'answer_reference' means you may quote/summarize it; 'escalate_only' means you must not give advice and must escalate. Post-op docs are typically escalate_only because they are personalized after surgery.",
  inputSchema: z.object({
    patient_id: z.string().min(1).describe("The patient_id from the ESSOS_CONTEXT block."),
    phase: z
      .enum(["preop", "postop", "general"])
      .optional()
      .describe("Optional filter; omit to get all phases."),
  }),
  async execute({ patient_id, phase }) {
    const docs = (await listCareInstructions(patient_id, phase)).map((doc) => ({
      phase: doc.phase,
      title: doc.title,
      body: doc.body,
      source_status: doc.source_status,
      answer_policy: doc.answer_policy,
    }));
    return { count: docs.length, docs };
  },
});
