import { cn } from "@/lib/cn";

/**
 * A standard, beautiful loading state indicator.
 * Eliminates ad-hoc inline "Loading..." text.
 */
export function LoadingState({
  message = "Loading...",
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className
      )}
    >
      <div className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      <p className="mt-3 text-muted text-sm">{message}</p>
    </div>
  );
}
