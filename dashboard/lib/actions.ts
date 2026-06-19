"use server";

import {
  enqueueConciergeOutbound,
  markConciergeTakeover,
  resolveEscalation,
  resumeAutomation,
} from "@essos/shared";
import { revalidatePath } from "next/cache";

const ASSIGNEE = "dashboard";

function revalidateConversation(conversationId: string | null): void {
  revalidatePath("/");
  revalidatePath("/conversations");
  if (conversationId) revalidatePath(`/conversations/${conversationId}`);
}

/** Mark an escalation resolved (human finished handling it). */
export async function resolveEscalationAction(formData: FormData): Promise<void> {
  const escalationId = String(formData.get("escalationId"));
  const conversationId = formData.get("conversationId");
  resolveEscalation(escalationId, ASSIGNEE);
  revalidateConversation(conversationId ? String(conversationId) : null);
}

/** Human takes over the thread: open escalations -> taken_over, automation paused. */
export async function takeOverConversationAction(formData: FormData): Promise<void> {
  const conversationId = String(formData.get("conversationId"));
  markConciergeTakeover(conversationId, ASSIGNEE);
  revalidateConversation(conversationId);
}

/** Hand the thread back to Eve (automation_state -> active). */
export async function resumeAutomationAction(formData: FormData): Promise<void> {
  const conversationId = String(formData.get("conversationId"));
  resumeAutomation(conversationId, ASSIGNEE);
  revalidateConversation(conversationId);
}

/**
 * Concierge replies to the patient from the dashboard. Queues the message for
 * the transport to deliver to the patient's iMessage and marks the thread as
 * taken over so Eve stays paused. See decision 010.
 */
export async function sendConciergeReplyAction(formData: FormData): Promise<void> {
  const conversationId = String(formData.get("conversationId"));
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;
  const agentName = String(formData.get("agentName") ?? "").trim();
  const signature = agentName ? `— ${agentName}, Essos Care Team` : "— Essos Care Team";
  const composed = `${text}\n\n${signature}`;
  const author = agentName || ASSIGNEE;
  enqueueConciergeOutbound({ conversationId, text: composed, authorHandle: author });
  markConciergeTakeover(conversationId, author);
  revalidateConversation(conversationId);
}
