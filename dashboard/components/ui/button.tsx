import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "ghost" | "ok" | "danger";
type ButtonSize = "sm" | "md";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-pearl hover:opacity-90",
  ghost:
    "border border-border text-ink hover:bg-surface hover:border-secondary/70",
  ok: "bg-ok text-pearl hover:opacity-90",
  danger: "bg-high text-pearl hover:opacity-90",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "px-2 py-1 text-meta",
  md: "px-3 py-1.5 text-xs",
};

export function Button({
  variant = "ghost",
  size = "md",
  type = "button",
  static: isStatic = false,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Disable the tactile scale-on-press when the motion would be distracting. */
  static?: boolean;
}) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-control font-semibold transition-[transform,background-color,opacity,box-shadow] duration-fast ease-out disabled:pointer-events-none disabled:opacity-50",
        !isStatic && "active:not-disabled:scale-[0.96]",
        BUTTON_SIZES[size],
        BUTTON_VARIANTS[variant],
        className
      )}
      type={type}
      {...props}
    />
  );
}
