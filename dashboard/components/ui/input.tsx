import type { InputHTMLAttributes } from "react";

const BASE =
  "focus-ring w-full rounded-control border border-border bg-surface px-3 py-2 text-ink text-sm placeholder:text-muted disabled:pointer-events-none disabled:opacity-50";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${BASE} ${className ?? ""}`} {...props} />;
}
