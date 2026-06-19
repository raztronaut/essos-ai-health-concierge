import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Standardized section header with an optional action.
 * Enforces a single, cohesive heading scale across all features.
 */
export function SectionHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b border-border/40 pb-2",
        className
      )}
    >
      <h2 className="text-balance font-semibold text-lg text-ink">{title}</h2>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
