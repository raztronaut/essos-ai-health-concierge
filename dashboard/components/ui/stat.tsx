import { cn } from "@/lib/cn";
import { Card } from "./card";

/** A single headline metric for the overview telemetry grid. */
export function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: number | string;
  hint?: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="font-semibold text-3xl tabular-nums">{value}</div>
      <div className="mt-1 font-medium text-ink/80 text-sm">{label}</div>
      {hint ? <div className="mt-0.5 text-muted text-xs">{hint}</div> : null}
    </Card>
  );
}
