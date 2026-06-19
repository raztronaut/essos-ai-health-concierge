import { cn } from "@/lib/cn";
import { Card } from "./card";

/**
 * A standard, high-fidelity empty state card.
 * Eliminates ad-hoc inline empty state paragraphs.
 */
export function EmptyState({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "flex flex-col items-center justify-center border-dashed bg-surface/30 py-10 text-center",
        className
      )}
    >
      <p className="text-pretty text-muted text-sm leading-relaxed">
        {message}
      </p>
    </Card>
  );
}
