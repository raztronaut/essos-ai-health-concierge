import { cn } from "@/lib/cn";

/** A label/value pair for the definition-list panels. */
export function DefinitionRow({
  label,
  value,
  layout = "horizontal",
  className,
}: {
  label: string;
  value: string;
  layout?: "horizontal" | "vertical";
  className?: string;
}) {
  return (
    <div
      className={cn(
        layout === "vertical"
          ? "flex flex-col gap-0.5"
          : "flex justify-between gap-3",
        className
      )}
    >
      <dt
        className={cn(
          "text-muted",
          layout === "vertical" &&
            "font-medium text-meta uppercase tracking-wide"
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "font-medium",
          layout === "vertical" ? "mt-0.5 text-ink text-sm" : "text-right"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
