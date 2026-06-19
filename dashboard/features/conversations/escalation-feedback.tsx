"use client";

import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { useDemoIdentity } from "@/features/demo/demo-identity";
import { cn } from "@/lib/cn";

/**
 * "Was this escalation necessary?" verdict (ADR 022). Decoupled from resolve so
 * a concierge can label a flag at any time; feeds the escalation-validity rate
 * in AI performance and the production -> eval flywheel.
 */
export function EscalationFeedback({
  escalationId,
  value,
}: {
  escalationId: string;
  value?: boolean | null;
}) {
  const { viewAs } = useDemoIdentity();
  const setFeedback = useMutation(api.mutations.setEscalationFeedback);

  const submit = (valid: boolean) =>
    toast.promise(setFeedback({ escalationId, valid, viewAs }), {
      loading: "Saving…",
      success: valid ? "Marked necessary" : "Marked unnecessary",
      error: "Couldn’t save feedback",
    });

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-muted">Necessary?</span>
      <button
        className={cn(
          "rounded-full border px-2 py-0.5 font-medium text-[11px] transition-colors",
          value === true
            ? "border-ok/30 bg-ok-soft text-ok"
            : "border-border text-muted hover:text-ink"
        )}
        onClick={() => submit(true)}
        type="button"
      >
        Yes
      </button>
      <button
        className={cn(
          "rounded-full border px-2 py-0.5 font-medium text-[11px] transition-colors",
          value === false
            ? "border-high/30 bg-high-soft text-high"
            : "border-border text-muted hover:text-ink"
        )}
        onClick={() => submit(false)}
        type="button"
      >
        No
      </button>
    </div>
  );
}
