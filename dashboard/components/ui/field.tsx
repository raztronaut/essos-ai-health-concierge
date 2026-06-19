"use client";

import type { ReactNode } from "react";
import { useId } from "react";

/**
 * Labeled form field wrapper. Clones the single child control so it is
 * associated with the label via `id`/`htmlFor` for accessibility, and renders
 * an optional hint or error message below it.
 */
export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  const generatedId = useId();
  const id = htmlFor ?? generatedId;
  return (
    <div className="space-y-1.5">
      <label className="block font-medium text-ink text-xs" htmlFor={id}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-high text-xs">{error}</p>
      ) : hint ? (
        <p className="text-muted text-xs">{hint}</p>
      ) : null}
    </div>
  );
}
