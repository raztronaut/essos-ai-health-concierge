import { cn } from "@/lib/cn";

/**
 * A highly polished, accessible horizontal bar meter.
 * Enforces semantic HTML, ARIA attributes, and token-driven styling.
 */
export function BarMeter({
  value,
  max = 100,
  label,
  className,
}: {
  value: number;
  max?: number;
  label: string;
  className?: string;
}) {
  const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div
      aria-label={`${label}: ${value} of ${max}`}
      className={cn("w-full", className)}
      role="img"
    >
      <div className="h-1.5 w-full rounded-full bg-surface">
        <div
          className="h-1.5 rounded-full bg-primary transition-[width] duration-slow ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/**
 * A highly polished, accessible vertical bar column for charts.
 */
export function BarColumn({
  value,
  max = 100,
  label,
  title,
  className,
}: {
  value: number;
  max?: number;
  label: string;
  title?: string;
  className?: string;
}) {
  const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div
      aria-label={`${label}: ${value} of ${max}`}
      className={cn("h-full w-full max-w-8 rounded-t bg-primary/80 transition-[height] duration-slow ease-out", className)}
      role="img"
      style={{ height: `${percentage}%` }}
      title={title}
    />
  );
}
