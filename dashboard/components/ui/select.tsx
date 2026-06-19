import type { SelectHTMLAttributes } from "react";

const BASE =
  "focus-ring w-full rounded-control border border-border bg-surface px-3 py-2 text-ink text-sm disabled:pointer-events-none disabled:opacity-50";

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${BASE} ${className ?? ""}`} {...props}>
      {children}
    </select>
  );
}
