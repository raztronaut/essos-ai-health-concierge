"use client";

import { api } from "@convex/_generated/api";
import type { EscalationStatus } from "@essos/shared";
import { useMutation } from "convex/react";
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
        <Button
          onClick={() => void takeOver({ conversationId })}
          variant="ghost"
        >
          Take over
        </Button>
      ) : null}
      {status === "resolved" ? null : (
        <Button onClick={() => void resolve({ escalationId })} variant="ok">
          Resolve
        </Button>
      )}
    </div>
  );
}

/** Resume Eve automation on a paused / taken-over thread. */
export function ResumeAutomationButton({
  conversationId,
}: {
  conversationId: string;
}) {
  const resume = useMutation(api.mutations.resumeAutomation);
  return (
    <Button onClick={() => void resume({ conversationId })} variant="primary">
      Resume Eve
    </Button>
  );
}
