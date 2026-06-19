"use client";

import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { EscalationStatus } from "@essos/shared";
import { Button } from "@/components/ui";

/** Take-over / resolve actions for a single escalation (queue + thread). */
export function EscalationActions({
  escalationId,
  conversationId,
  status,
}: {
  escalationId: string;
  conversationId: string;
  status: EscalationStatus;
}) {
  const takeOver = useMutation(api.mutations.takeOverConversation);
  const resolve = useMutation(api.mutations.resolveEscalation);
  return (
    <div className="flex shrink-0 items-center gap-2">
      {status === "open" ? (
        <Button variant="ghost" onClick={() => void takeOver({ conversationId })}>
          Take over
        </Button>
      ) : null}
      {status !== "resolved" ? (
        <Button variant="ok" onClick={() => void resolve({ escalationId })}>
          Resolve
        </Button>
      ) : null}
    </div>
  );
}

/** Resume Eve automation on a paused / taken-over thread. */
export function ResumeAutomationButton({ conversationId }: { conversationId: string }) {
  const resume = useMutation(api.mutations.resumeAutomation);
  return (
    <Button variant="primary" onClick={() => void resume({ conversationId })}>
      Resume Eve
    </Button>
  );
}
