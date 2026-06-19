import type { CareAnswerPolicy } from "@essos/shared";
import { Badge } from "@/components/ui";

export function PolicyBadge({ policy }: { policy: CareAnswerPolicy }) {
  const cls = policy === "answer_reference" ? "bg-ok-soft text-ok" : "bg-high-soft text-high";
  const label = policy === "answer_reference" ? "Answerable" : "Escalate only";
  return <Badge className={cls}>{label}</Badge>;
}
