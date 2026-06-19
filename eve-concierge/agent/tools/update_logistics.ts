import { defineTool } from "eve/tools";
import { logActivity } from "@essos/shared";
import { z } from "zod";

/**
 * Notional logistics coordination. In the work-trial MVP this records the
 * coordination action (e.g. "notify driver of new pickup time") to the activity
 * log so it is visible in the dashboard; a production build would call the
 * transport/clinic systems. It does not replace escalation — if the patient is
 * blocked or stranded, escalate instead.
 */
export default defineTool({
  description:
    "Record a routine logistics coordination action that the concierge would normally perform, such as notifying the driver of a new pickup time after a flight delay, or confirming transport for an appointment. Use for routine, completable coordination only. If the patient is stranded, blocked, or the coordination cannot be completed, use escalate_to_human instead.",
  inputSchema: z.object({
    conversation_id: z.string().min(1).describe("conversation_id from the ESSOS_CONTEXT block."),
    action: z
      .enum([
        "update_driver_pickup_time",
        "confirm_transport",
        "notify_clinic_of_change",
        "request_early_pickup",
      ])
      .describe("The kind of coordination performed."),
    detail: z
      .string()
      .min(1)
      .describe("What was coordinated, in one sentence (e.g. new pickup time and driver)."),
  }),
  async execute({ conversation_id, action, detail }) {
    logActivity({
      conversationId: conversation_id,
      event: "logistics",
      actor: "eve",
      detail: `${action} — ${detail}`,
    });
    return {
      recorded: true as const,
      action,
      detail,
      note: "Notional coordination recorded for the demo. A human can confirm in the dashboard.",
    };
  },
});
