import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/**
 * Standardized hover-underline link component.
 * Eliminates raw inline class duplication of the primary link style.
 */
export function TextLink({
  className,
  children,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "font-medium text-primary text-sm hover:underline transition-colors duration-fast ease-out",
        className
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
