import type { Conversation, Patient } from "@essos/shared";

/**
 * Build the trusted ESSOS_CONTEXT header the agent reads on every turn. The
 * instructions tell the model to use these ids in tool calls and never reveal
 * the block to the patient.
 */
export function buildContextMessage(args: {
  patient: Patient;
  conversation: Conversation;
  sourceMessageId: string;
  text: string;
}): string {
  const { patient, conversation, sourceMessageId, text } = args;
  return [
    "<<ESSOS_CONTEXT>>",
    `conversation_id: ${conversation.id}`,
    `patient_id: ${patient.id}`,
    `source_message_id: ${sourceMessageId}`,
    `patient_name: ${patient.name}`,
    `procedure: ${patient.procedure}`,
    `city: ${patient.destination_city}`,
    `country: ${patient.destination_country}`,
    `automation_state: ${conversation.automation_state}`,
    "<<END_CONTEXT>>",
    text,
  ].join("\n");
}
