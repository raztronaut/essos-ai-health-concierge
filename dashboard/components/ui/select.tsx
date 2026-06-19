import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { CONTROL_BASE } from "./control-base";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  wrapperClassName?: string;
}

export function Select({
  className,
  children,
  wrapperClassName,
  ...props
}: SelectProps) {
  return (
    <div className={cn("relative w-full", wrapperClassName)}>
      <select
        className={cn(
          CONTROL_BASE,
          "appearance-none pr-10", // Space for the custom chevron
          className
        )}
        {...props}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted">
        <svg
          aria-hidden="true"
          className="size-4 shrink-0"
          fill="none"
          role="presentation"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </div>
    </div>
  );
}
