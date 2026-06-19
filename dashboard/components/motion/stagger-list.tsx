"use client";

import { lazy, Suspense } from "react";
import type { StaggerListProps } from "./stagger-list-impl";

/**
 * Wraps a list of elements and fades/translates each one in with a short
 * stagger when it first mounts. Motion is purely decorative entrance polish,
 * so it is fully disabled under `prefers-reduced-motion`.
 *
 * The animated implementation pulls in the `motion` runtime, so it is split
 * into its own chunk and loaded lazily. Until it resolves (and during SSR) the
 * Suspense fallback renders the children in a plain wrapper, so list content is
 * always present immediately — the stagger animation just plays once the chunk
 * arrives.
 *
 * Usage:
 *   <StaggerList className="space-y-3">
 *     {items.map((item) => <Card key={item.id} ... />)}
 *   </StaggerList>
 */
const StaggerListImpl = lazy(() =>
  import("./stagger-list-impl").then((m) => ({ default: m.StaggerList }))
);

export function StaggerList({ children, className }: StaggerListProps) {
  return (
    <Suspense fallback={<div className={className}>{children}</div>}>
      <StaggerListImpl className={className}>{children}</StaggerListImpl>
    </Suspense>
  );
}
