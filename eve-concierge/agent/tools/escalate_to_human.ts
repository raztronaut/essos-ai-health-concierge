import { defineTool } from "eve/tools";
import {
  ALL_CATEGORIES,
  CATEGORY_POLICIES,
  createEscalation,
  logActivity,
  setAutomationState,
  type EscalationCategory,
} from "@essos/shared";
import { z } from "zod";

const categoryEnum = z.enum(
  ALL_CATEGORIES as [EscalationCategory, ...EscalationCategory[]],
);

/**
 * The trip wire. Records a High/Med escalation, pauses automation for the
 * conversation, and logs the event for the dashboard. Call this whenever the
 * taxonomy says a human must handle the message, or when you are unsure.
 */
export default defineTool({
  description:
    "Flag a message for the human Essos concierge team. Call this for anything that must escalate per the escalation policy (medication decisions, post-op symptoms/recovery, clinical judgment, staff safety, out-of-package requests, a stranded/blocked patient, or when you lack a reliable source / are unsure). This pauses automation for the conversation and raises a flag in the dashboard. Always reply to the patient with a brief, warm, non-clinical acknowledgement as well.",
  inputSchema: z.object({
    conversation_id: z.string().min(1).describe("conversation_id from the context block."),
    patient_id: z.string().min(1).describe("patient_id from the context block."),
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
      .describe("source_message_id from the context block, if available."),
  }),
  async execute({ conversation_id, patient_id, level, reason, summary, source_message_id }) {
    const escalation = createEscalation({
      conversationId: conversation_id,
      patientId: patient_id,
      level,
      reason,
      summary,
      sourceMessageId: source_message_id ?? null,
    });
    setAutomationState(conversation_id, "paused_for_review");
    logActivity({
      conversationId: conversation_id,
      event: "escalated",
      actor: "eve",
      detail: `${level} • ${reason} • ${escalation.id}`,
    });
    logActivity({
      conversationId: conversation_id,
      event: "paused",
      actor: "eve",
      detail: "Automation paused pending human review.",
    });
    return {
      escalated: true as const,
      escalation_id: escalation.id,
      level,
      category: CATEGORY_POLICIES[reason].label,
      note: "Automation is now paused for this conversation; the concierge team has been flagged.",
    };
  },
});
