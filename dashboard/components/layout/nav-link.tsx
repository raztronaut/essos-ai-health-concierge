"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/**
 * Sidebar navigation link with an active-route highlight. A link is active when
 * the pathname equals its href, or (for non-root hrefs) is nested beneath it.
 *
 * The active state is drawn by a shared-layout pill (`layoutId="nav-pill"`) so
 * that moving between routes slides the highlight to the new item instead of
 * cross-fading two backgrounds. Disabled under reduced motion (the pill simply
 * snaps via `layout={false}`-equivalent: we render a plain background instead).
 */
export function NavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
}) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "focus-ring group relative flex items-center gap-3 rounded-control px-3 py-2 font-medium text-sm transition-colors duration-[var(--duration-base)] ease-[var(--ease-out)]",
        isActive ? "text-ink" : "text-ink/70 hover:text-ink"
      )}
      href={href}
    >
      {isActive ? (
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 -z-10 rounded-control bg-surface shadow-sm"
          layoutId={reduceMotion ? undefined : "nav-pill"}
          transition={{ type: "spring", duration: 0.4, bounce: 0.18 }}
        />
      ) : null}
      {icon ? (
        <span
          className={cn(
            "shrink-0 transition-colors duration-[var(--duration-base)] ease-[var(--ease-out)]",
            isActive ? "text-ink" : "text-ink/40 group-hover:text-ink/80"
          )}
        >
          {icon}
        </span>
      ) : null}
      <span className="truncate">{label}</span>
    </Link>
  );
}
