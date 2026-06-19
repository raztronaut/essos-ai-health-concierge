import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { CONTROL_BASE } from "./control-base";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(CONTROL_BASE, "placeholder:text-muted", className)}
      {...props}
    />
  );
}
