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
  size = "md",
}: {
  escalationId: string;
  conversationId: string;
  status: EscalationStatus;
  size?: "sm" | "md";
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
          size={size}
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
          size={size}
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

/** Close every flag on the thread and hand control back to Eve in one tap. */
export function ResolveAndResumeButton({
  conversationId,
  size = "md",
}: {
  conversationId: string;
  size?: "sm" | "md";
}) {
  const { viewAs } = useDemoIdentity();
  const resolveAndResume = useMutation(api.mutations.resolveAndResume);
  return (
    <Button
      onClick={() =>
        toast.promise(resolveAndResume({ conversationId, viewAs }), {
          loading: "Resolving…",
          success: "Resolved — Eve resumed on this thread",
          error: errorMessage("Couldn’t resolve and resume"),
        })
      }
      size={size}
      variant="primary"
    >
      Resolve + Resume Eve
    </Button>
  );
}

/**
 * Handoff actions co-located with the reply box, so a concierge resolves,
 * takes over, or hands the thread back to Eve from the one place they're
 * already typing. Shown only when the thread needs a decision — an open flag or
 * a paused/taken-over conversation. "Resolve + Resume Eve" is the primary path
 * (answered, automation back on); "Resolve" closes the flag (Eve resumes
 * automatically unless a human took over); "Take over" pauses Eve for a manual
 * handoff.
 */
export function HandoffActionBar({
  conversationId,
  automationState,
  openEscalationId,
  openEscalationStatus,
}: {
  conversationId: string;
  automationState: "active" | "paused_for_review" | "taken_over" | "resolved";
  openEscalationId: string | null;
  openEscalationStatus: EscalationStatus | null;
}) {
  const { viewAs } = useDemoIdentity();
  const takeOver = useMutation(api.mutations.takeOverConversation);
  const resolve = useMutation(api.mutations.resolveEscalation);

  const hasOpenFlag =
    openEscalationId !== null && openEscalationStatus !== "resolved";
  const isActive = automationState === "active";
  // Nothing to decide: Eve is running and there's no open flag.
  if (isActive && !hasOpenFlag) {
    return null;
  }

  const label =
    automationState === "taken_over"
      ? "You've taken over this thread — Eve is paused."
      : automationState === "paused_for_review"
        ? "Eve paused for review."
        : "Open flag on this thread.";

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-border border-b bg-amber-50/40 px-4 py-2">
      <span className="inline-flex items-center gap-1.5 font-medium text-[11px] text-stone-70">
        <span className="size-1.5 rounded-full bg-amber-400" />
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {openEscalationStatus === "open" ? (
          <Button
            onClick={() =>
              toast.promise(takeOver({ conversationId, viewAs }), {
                loading: "Taking over…",
                success: "Thread taken over — Eve paused",
                error: errorMessage("Couldn’t take over the thread"),
              })
            }
            size="sm"
            variant="ghost"
          >
            Take over
          </Button>
        ) : null}
        {hasOpenFlag && openEscalationId ? (
          <Button
            onClick={() =>
              toast.promise(resolve({ escalationId: openEscalationId, viewAs }), {
                loading: "Resolving…",
                success: "Escalation resolved",
                error: errorMessage("Couldn’t resolve the escalation"),
              })
            }
            size="sm"
            variant="ok"
          >
            Resolve
          </Button>
        ) : null}
        <ResolveAndResumeButton conversationId={conversationId} size="sm" />
      </div>
    </div>
  );
}
