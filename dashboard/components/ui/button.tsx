import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "ghost" | "ok";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:opacity-90",
  ghost: "border border-border text-ink hover:bg-surface hover:border-secondary/70",
  ok: "bg-ok text-white hover:opacity-90",
};

export function Button({
  variant = "ghost",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`focus-ring rounded-control px-3 py-1.5 text-xs font-semibold transition-[transform,background-color,opacity,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 ${BUTTON_VARIANTS[variant]} ${className ?? ""}`}
      {...props}
    />
  );
}
