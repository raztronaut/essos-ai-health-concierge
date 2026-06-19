import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Surface container. Set `interactive` to add hover elevation -- used for
 * cards that are themselves links (conversation list, escalation queue).
 */
export function Card({
  children,
  className,
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-border bg-card p-5 shadow-card",
        interactive && "hover-lift cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}
