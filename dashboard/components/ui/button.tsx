import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "ghost" | "ok";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:opacity-90",
  ghost: "border border-secondary/70 text-ink hover:bg-surface",
  ok: "bg-ok text-white hover:opacity-90",
};

export function Button({
  variant = "ghost",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`focus-ring rounded-control px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${BUTTON_VARIANTS[variant]} ${className ?? ""}`}
      {...props}
    />
  );
}
