"use client";

import { cloneElement, isValidElement, useId, type ReactNode, type ReactElement } from "react";

/**
 * Labeled form field wrapper.
 * Automatically clones the child control to inject the generated `id`,
 * `aria-invalid`, and `aria-describedby` attributes for S-Tier accessibility.
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
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  let child = children;
  if (isValidElement(child)) {
    const element = child as ReactElement<any>;
    child = cloneElement(element, {
      id: element.props.id ?? id,
      "aria-invalid": element.props["aria-invalid"] ?? (error ? "true" : undefined),
      "aria-describedby": element.props["aria-describedby"] ?? (error ? errorId : hint ? hintId : undefined),
    });
  }

  return (
    <div className="space-y-1.5">
      <label className="block font-medium text-ink text-xs" htmlFor={id}>
        {label}
      </label>
      {child}
      {error ? (
        <p className="text-high text-xs" id={errorId}>
          {error}
        </p>
      ) : hint ? (
        <p className="text-muted text-xs" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
