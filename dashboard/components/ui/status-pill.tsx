import { cn } from "@/lib/cn";

/**
 * Standardized inline status pill.
 * Replaces ad-hoc inline pill styling across lists and detail panels.
 */
export function StatusPill({
  children,
  variant = "neutral",
  className,
}: {
  children: React.ReactNode;
  variant?: "neutral" | "high" | "med" | "ok";
  className?: string;
}) {
  const styles = {
    neutral: "bg-stone-10/60 text-stone-70",
    high: "bg-high-soft text-high",
    med: "bg-med-soft text-med",
    ok: "bg-ok-soft text-ok",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-2 py-0.5 font-medium text-xs",
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
