import type { ReactNode } from "react";

/**
 * The base pill shape every domain badge is built on. Holds no domain
 * knowledge -- callers pass the color utilities via `className`. When `dot` is
 * set, a small leading dot in the badge's `currentColor` is rendered for faster
 * at-a-glance status scanning.
 */
export function Badge({
  children,
  className,
  dot = false,
}: {
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-xs font-medium ${className ?? ""}`}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className="size-1.5 shrink-0 rounded-full bg-current"
        />
      ) : null}
      {children}
    </span>
  );
}
