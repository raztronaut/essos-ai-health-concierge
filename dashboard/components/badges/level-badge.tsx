import type { EscalationLevel } from "@essos/shared";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";

export function LevelBadge({
  level,
  className,
}: {
  level: EscalationLevel;
  className?: string;
}) {
  const cls =
    level === "High" ? "bg-high-soft text-high" : "bg-med-soft text-med";
  return (
    <Badge className={cn(cls, className)} dot>
      {level}
    </Badge>
  );
}
