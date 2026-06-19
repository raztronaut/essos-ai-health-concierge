import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "ghost" | "ok" | "danger";
type ButtonSize = "sm" | "md";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:opacity-90",
  ghost:
    "border border-border text-ink hover:bg-surface hover:border-secondary/70",
  ok: "bg-ok text-white hover:opacity-90",
  danger: "bg-high text-white hover:opacity-90",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "px-2 py-1 text-[11px]",
  md: "px-3 py-1.5 text-xs",
};

export function Button({
  variant = "ghost",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={`focus-ring inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-control font-semibold transition-[transform,background-color,opacity,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 ${BUTTON_SIZES[size]} ${BUTTON_VARIANTS[variant]} ${className ?? ""}`}
      {...props}
    />
  );
}
