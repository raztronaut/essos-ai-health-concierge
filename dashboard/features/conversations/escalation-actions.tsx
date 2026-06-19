"use client";

import { api } from "@convex/_generated/api";
import type { EscalationStatus } from "@essos/shared";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { useDemoIdentity } from "@/features/demo/demo-identity";

function errorMessage(fallback: string) {
  return (error: unknown) =>
    error instanceof Error ? error.message : fallback;
}

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
  const { viewAs } = useDemoIdentity();
  const takeOver = useMutation(api.mutations.takeOverConversation);
  const resolve = useMutation(api.mutations.resolveEscalation);
  return (
    <div className="flex shrink-0 items-center gap-2">
      {status === "open" ? (
        <Button
          onClick={() =>
            toast.promise(takeOver({ conversationId, viewAs }), {
              loading: "Taking over…",
              success: "Thread taken over — Eve paused",
              error: errorMessage("Couldn’t take over the thread"),
            })
          }
          variant="ghost"
        >
          Take over
        </Button>
      ) : null}
      {status === "resolved" ? null : (
        <Button
          onClick={() =>
            toast.promise(resolve({ escalationId, viewAs }), {
              loading: "Resolving…",
              success: "Escalation resolved",
              error: errorMessage("Couldn’t resolve the escalation"),
            })
          }
          variant="ok"
        >
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
  const { viewAs } = useDemoIdentity();
  const resume = useMutation(api.mutations.resumeAutomation);
  return (
    <Button
      onClick={() =>
        toast.promise(resume({ conversationId, viewAs }), {
          loading: "Resuming…",
          success: "Eve resumed on this thread",
          error: errorMessage("Couldn’t resume Eve"),
        })
      }
      variant="primary"
    >
      Resume Eve
    </Button>
  );
}
