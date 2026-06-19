import type { Escalation, Message } from "@essos/shared";
import { parseSuggestedReplySources } from "@essos/shared";
import { useMemo } from "react";

/**
 * S-Tier custom hook to derive conversation thread metadata.
 * Calculates unanswered message counts, active escalations, and draft sources.
 */
export function useConversationThread(
  messages: Message[],
  escalations: Escalation[]
) {
  return useMemo(() => {
    const lastRepliedIndex = messages.findLastIndex(
      (m) => m.role === "agent" || m.role === "concierge"
    );
    const unansweredCount = messages
      .slice(lastRepliedIndex + 1)
      .filter((m) => m.role === "patient").length;

    const openEscalation = escalations.find((e) => e.status === "open") ?? null;
    const draftSources = parseSuggestedReplySources(openEscalation);

    return {
      unansweredCount,
      openEscalation,
      draftSources,
    };
  }, [messages, escalations]);
}
