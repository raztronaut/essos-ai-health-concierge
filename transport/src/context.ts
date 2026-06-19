import {
  type Conversation,
  type Patient,
  summarizePolicyOverrides,
} from "@essos/shared";

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
  /** Per-resource working memory ("what we know about this person"), if any. */
  memory?: string | null;
}): string {
  const { patient, conversation, sourceMessageId, text, memory } = args;
  const lines = [
    "<<ESSOS_CONTEXT>>",
    `conversation_id: ${conversation.id}`,
    `patient_id: ${patient.id}`,
    `source_message_id: ${sourceMessageId}`,
    `patient_name: ${patient.name}`,
    `procedure: ${patient.procedure}`,
    `city: ${patient.destination_city}`,
    `country: ${patient.destination_country}`,
    `automation_state: ${conversation.automation_state}`,
  ];
  if (memory?.trim()) {
    lines.push(`known_about_patient: ${memory.trim()}`);
  }
  // Tighten-only per-patient policy (ADR 021): categories Eve must escalate for
  // this patient even though they are normally autonomous, plus any raised
  // levels. Sanitized in `summarizePolicyOverrides` so junk never reaches Eve.
  const policy = summarizePolicyOverrides(patient.policy_overrides);
  if (policy) {
    lines.push(`policy_overrides: ${policy}`);
  }
  lines.push("<<END_CONTEXT>>", text);
  return lines.join("\n");
}
