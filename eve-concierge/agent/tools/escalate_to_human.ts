import { defineTool } from "eve/tools";
import {
  CATEGORY_POLICIES,
  ESCALATABLE_CATEGORIES,
  escalateToHuman,
  type EscalationCategory,
} from "@essos/shared";
import { z } from "zod";

// Only categories that can legitimately be escalated — the purely-autonomous
// reference categories are excluded so an escalation can never cite them.
const categoryEnum = z.enum(
  ESCALATABLE_CATEGORIES as [EscalationCategory, ...EscalationCategory[]],
);

/**
 * The trip wire. Records a High/Med escalation, pauses automation for the
 * conversation, and logs the event for the dashboard. Call this whenever the
 * taxonomy says a human must handle the message, or when you are unsure.
 */
export default defineTool({
  description:
    "Flag a message for the human Essos concierge team. Call this for anything that must escalate per the escalation policy (medication decisions, post-op symptoms/recovery, clinical judgment, staff safety, out-of-package requests, a stranded/blocked patient, or when you lack a reliable source / are unsure). This pauses automation for the conversation and raises a flag in the dashboard. Always reply to the patient with a brief, warm, non-clinical acknowledgement as well, AND draft a suggested_reply the concierge can review and send to the patient.",
  inputSchema: z.object({
    conversation_id: z.string().min(1).describe("conversation_id from the ESSOS_CONTEXT block."),
    patient_id: z.string().min(1).describe("patient_id from the ESSOS_CONTEXT block."),
    level: z
      .enum(["High", "Med"])
      .describe(
        "High = urgent, a human should intervene now (active symptoms, safety, stranded patient). Med = a human should review/follow up soon.",
      ),
    reason: categoryEnum.describe("The single taxonomy category that best fits the message."),
    summary: z
      .string()
      .min(1)
      .describe("One sentence explaining why this is being escalated, for the concierge."),
    source_message_id: z
      .string()
      .optional()
      .describe("source_message_id from the ESSOS_CONTEXT block, if available."),
    suggested_reply: z
      .string()
      .optional()
      .describe(
        "A warm, patient-ready reply the concierge can review, edit, and send. Ground it ONLY in the patient profile, itinerary, and care instructions with answer_policy=answer_reference. Surface the relevant facts the human needs (e.g. the documented pre-op window, the driver's name/number) but do NOT give medical advice or invent anything not in a source. This is a draft for human review and is never sent automatically.",
      ),
    suggested_reply_sources: z
      .array(z.string())
      .optional()
      .describe(
        "Short labels for the sources backing the draft, e.g. [\"Pre-op packet\", \"Itinerary\"]. Empty if you had no reliable source.",
      ),
  }),
  async execute({
    conversation_id,
    patient_id,
    level,
    reason,
    summary,
    source_message_id,
    suggested_reply,
    suggested_reply_sources,
  }) {
    const { escalationId } = await escalateToHuman({
      conversationId: conversation_id,
      patientId: patient_id,
      level,
      reason,
      summary,
      sourceMessageId: source_message_id ?? null,
      suggestedReply: suggested_reply ?? null,
      suggestedReplySources: suggested_reply_sources ?? null,
    });
    return {
      escalated: true as const,
      escalation_id: escalationId,
      level,
      category: CATEGORY_POLICIES[reason].label,
      note: "Automation is now paused for this conversation; the concierge team has been flagged.",
    };
  },
});
