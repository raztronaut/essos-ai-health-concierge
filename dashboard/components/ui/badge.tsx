import type { ReactNode } from "react";

/**
 * The base pill shape every domain badge is built on. Holds no domain
 * knowledge -- callers pass the color utilities via `className`.
 */
export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-xs font-medium ${className ?? ""}`}
    >
      {children}
    </span>
  );
}
