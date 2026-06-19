import type { ReactNode } from "react";

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
  const base = "rounded-card border border-secondary/60 bg-card p-5 shadow-card";
  const hover = interactive
    ? "transition hover:border-primary/60 hover:shadow-card-hover"
    : "";
  return <div className={`${base} ${hover} ${className ?? ""}`}>{children}</div>;
}
