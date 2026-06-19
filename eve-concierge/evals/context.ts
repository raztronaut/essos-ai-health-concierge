import {
  addMessage,
  getOrCreateConversation,
  getPatientById,
  setAutomationState,
} from "@essos/shared";

/**
 * Eval helpers (not an eval — no `.eval.ts` suffix, so the runner skips it).
 *
 * Each eval drives the real Eve HTTP surface, which expects the trusted
 * `<<ESSOS_CONTEXT>>` header the transport normally prepends. `essosTurn` seeds
 * a fresh `active` conversation in the shared store (the eval process and the
 * agent server share `.data/essos.db`) and returns the context-wrapped message
 * to send, mirroring `transport/src/context.ts` exactly.
 */

/** Seeded patient ids from `mock-assets/patients/*` (`pnpm seed:reset`). */
export const PATIENT_RHINO = "pat_maya"; // rhinoplasty, Istanbul
export const PATIENT_HAIR = "pat_diego"; // hair transplant, Tijuana

export interface EssosTurn {
  message: string;
  conversationId: string;
  patientId: string;
}

export function essosTurn(args: {
  patientId: string;
  /** Stable per-eval space id so re-runs reuse one conversation. */
  spaceId: string;
  text: string;
}): EssosTurn {
  const patient = getPatientById(args.patientId);
  if (!patient) {
    throw new Error(
      `No patient "${args.patientId}" in the store. Run \`pnpm seed:reset\` before evals.`,
    );
  }

  const conversation = getOrCreateConversation({
    spaceId: args.spaceId,
    patientId: patient.id,
    channel: "terminal",
  });
  // Reset to active so a prior escalation run doesn't leave the thread paused.
  setAutomationState(conversation.id, "active");

  const inbound = addMessage({
    conversationId: conversation.id,
    role: "patient",
    authorHandle: patient.handle,
    text: args.text,
  });

  const message = [
    "<<ESSOS_CONTEXT>>",
    `conversation_id: ${conversation.id}`,
    `patient_id: ${patient.id}`,
    `source_message_id: ${inbound.id}`,
    `patient_name: ${patient.name}`,
    `procedure: ${patient.procedure}`,
    `city: ${patient.destination_city}`,
    `country: ${patient.destination_country}`,
    "automation_state: active",
    "<<END_CONTEXT>>",
    args.text,
  ].join("\n");

  return { message, conversationId: conversation.id, patientId: patient.id };
}

/**
 * `t.calledTool` input matcher: the escalation carried a non-empty
 * `suggested_reply` for the concierge (the AI-assist draft). See ADR 011.
 */
export function hasSuggestedReply(input: unknown): boolean {
  const reply = (input as { suggested_reply?: unknown } | null)?.suggested_reply;
  return typeof reply === "string" && reply.trim().length > 0;
}
