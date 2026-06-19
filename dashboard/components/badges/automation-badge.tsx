import type { AutomationState } from "@essos/shared";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";

const AUTOMATION_STYLES: Record<AutomationState, string> = {
  active: "bg-ok-soft text-ok",
  paused_for_review: "bg-med-soft text-med",
  taken_over: "bg-high-soft text-high",
  resolved: "bg-secondary/40 text-ink",
};

const AUTOMATION_LABELS: Record<AutomationState, string> = {
  active: "Eve active",
  paused_for_review: "Paused for review",
  taken_over: "Human handling",
  resolved: "Resolved",
};

export function AutomationBadge({
  state,
  className,
}: {
  state: AutomationState;
  className?: string;
}) {
  return (
    <Badge className={cn(AUTOMATION_STYLES[state], className)} dot>
      {AUTOMATION_LABELS[state]}
    </Badge>
  );
}
