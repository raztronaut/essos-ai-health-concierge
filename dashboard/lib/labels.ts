import type { MessageRole } from "@essos/shared";

/** One label map for message roles, shared by the thread view and the list. */
export const ROLE_LABEL: Record<MessageRole, string> = {
  patient: "Patient",
  agent: "Eve",
  concierge: "Concierge",
  system: "System",
};
