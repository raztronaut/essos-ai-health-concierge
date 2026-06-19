import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { CONTROL_BASE } from "./control-base";

export function Textarea({
  className,
  rows = 3,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(CONTROL_BASE, "placeholder:text-muted", className)}
      rows={rows}
      {...props}
    />
  );
}
