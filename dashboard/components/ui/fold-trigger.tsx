import { cn } from "@/lib/cn";
import { Button } from "./button";

/**
 * A standard, high-fidelity folding toggle button.
 * Enforces absolute visual and behavioral consistency for collapsible lists.
 */
export function FoldTrigger({
  expanded,
  onToggle,
  count,
  labelSingular,
  labelPlural,
  className,
}: {
  expanded: boolean;
  onToggle: () => void;
  count: number;
  labelSingular: string;
  labelPlural: string;
  className?: string;
}) {
  const label = count === 1 ? labelSingular : labelPlural;
  return (
    <div className={cn("mt-4 flex justify-center border-t border-border/40 pt-3.5", className)}>
      <Button
        onClick={onToggle}
        variant="ghost"
        size="sm"
          className="text-muted hover:text-ink font-semibold flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-control"
      >
        <span>
          {expanded ? "Show less" : `Show ${count} more ${label}`}
        </span>
        <svg
          aria-hidden="true"
          className={cn(
            "size-3.5 shrink-0 transition-transform duration-base ease-out text-muted/80",
            expanded ? "rotate-180" : ""
          )}
          fill="none"
          role="presentation"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </Button>
    </div>
  );
}
