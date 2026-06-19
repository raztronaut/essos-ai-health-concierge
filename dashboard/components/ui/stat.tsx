import { Card } from "./card";

/** A single headline metric for the overview telemetry grid. */
export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <Card>
      <div className="text-3xl font-semibold">{value}</div>
      <div className="mt-1 text-sm font-medium text-ink/80">{label}</div>
      {hint ? <div className="mt-0.5 text-xs text-muted">{hint}</div> : null}
    </Card>
  );
}
