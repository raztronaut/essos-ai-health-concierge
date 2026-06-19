import type { EscalationLevel } from "@essos/shared";
import { Badge } from "@/components/ui";

export function LevelBadge({ level }: { level: EscalationLevel }) {
  const cls = level === "High" ? "bg-high-soft text-high" : "bg-med-soft text-med";
  return <Badge className={cls}>{level}</Badge>;
}
