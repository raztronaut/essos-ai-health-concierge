import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * A generic, shimmering skeleton loader primitive.
 * Composed into layout skeletons to eliminate Cumulative Layout Shift (CLS).
 */
export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded bg-stone-10/40",
        className
      )}
      {...props}
    />
  );
}
