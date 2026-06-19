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
  const base = "rounded-card border border-border bg-card p-5 shadow-card";
  // `hover-lift` (globals.css) handles the GPU-only transform + shadow on
  // hover and the press-down on :active, gated behind a fine-pointer device.
  const hover = interactive ? "hover-lift cursor-pointer" : "";
  return <div className={`${base} ${hover} ${className ?? ""}`}>{children}</div>;
}
