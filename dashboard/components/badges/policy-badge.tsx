import type { CareAnswerPolicy } from "@essos/shared";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";

export function PolicyBadge({
  policy,
  className,
}: {
  policy: CareAnswerPolicy;
  className?: string;
}) {
  const cls =
    policy === "answer_reference"
      ? "bg-ok-soft text-ok"
      : "bg-high-soft text-high";
  const label = policy === "answer_reference" ? "Answerable" : "Escalate only";
  return (
    <Badge className={cn(cls, className)} dot>
      {label}
    </Badge>
  );
}
