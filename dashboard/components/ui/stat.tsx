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
      <div className="font-semibold text-3xl">{value}</div>
      <div className="mt-1 font-medium text-ink/80 text-sm">{label}</div>
      {hint ? <div className="mt-0.5 text-muted text-xs">{hint}</div> : null}
    </Card>
  );
}
