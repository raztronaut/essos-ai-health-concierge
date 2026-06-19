import { defineTool } from "eve/tools";
import { getAgentMemory, upsertAgentMemory } from "@essos/shared";
import { z } from "zod";

/**
 * Durable per-patient working memory. Call this to remember a small, stable
 * fact about the patient that will help on future turns and in their other
 * conversations (preferences, constraints, who they travel with, how they like
 * to be addressed). The stored note is injected into `known_about_patient` on
 * every later turn. Keep it short and factual; do not store clinical advice or
 * anything the patient hasn't shared.
 */
export default defineTool({
  description:
    "Save or update a short, durable note about this patient (preferences, constraints, companions, how they like to be addressed) so you remember it on later turns and across their conversations. Keep it brief and factual. Do not store medical advice. Pass the full memory you want to keep (it replaces the prior note).",
  inputSchema: z.object({
    patient_id: z
      .string()
      .min(1)
      .describe("patient_id from the ESSOS_CONTEXT block."),
    note: z
      .string()
      .min(1)
      .describe(
        "The full working memory to store for this patient (replaces the previous note). A few short sentences at most."
      ),
  }),
  async execute({ patient_id, note }) {
    const existing = (await getAgentMemory(patient_id))?.working_memory ?? "";
    await upsertAgentMemory(patient_id, note.trim());
    return {
      remembered: true as const,
      patient_id,
      replaced_previous: existing.length > 0,
    };
  },
});
