import type { EscalationStatus } from "@essos/shared";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { humanize } from "@/lib/format";

const STATUS_STYLES: Record<EscalationStatus, string> = {
  open: "bg-high-soft text-high",
  taken_over: "bg-med-soft text-med",
  resolved: "bg-ok-soft text-ok",
};

export function StatusBadge({
  status,
  className,
}: {
  status: EscalationStatus;
  className?: string;
}) {
  return (
    <Badge className={cn(STATUS_STYLES[status], className)} dot>
      {humanize(status)}
    </Badge>
  );
}
