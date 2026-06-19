import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Standardized definition list wrapper.
 * Enforces valid HTML semantics for DefinitionRow (<dt>/<dd>) children.
 */
export function DefinitionList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-1 gap-x-10 gap-y-2.5 text-sm sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {children}
    </dl>
  );
}
