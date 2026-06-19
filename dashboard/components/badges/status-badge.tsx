import type { EscalationStatus } from "@essos/shared";
import { Badge } from "@/components/ui";
import { humanize } from "@/lib/format";

const STATUS_STYLES: Record<EscalationStatus, string> = {
  open: "bg-high-soft text-high",
  taken_over: "bg-med-soft text-med",
  resolved: "bg-ok-soft text-ok",
};

export function StatusBadge({ status }: { status: EscalationStatus }) {
  return (
    <Badge className={STATUS_STYLES[status]} dot>
      {humanize(status)}
    </Badge>
  );
}
