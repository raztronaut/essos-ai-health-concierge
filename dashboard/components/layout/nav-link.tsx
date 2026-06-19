"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Sidebar navigation link with an active-route highlight. A link is active when
 * the pathname equals its href, or (for non-root hrefs) is nested beneath it.
 */
export function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  const state = isActive
    ? "bg-surface text-ink"
    : "text-ink/80 hover:bg-surface hover:text-ink";

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`focus-ring rounded-control px-3 py-2 text-sm font-medium transition ${state}`}
    >
      {label}
    </Link>
  );
}
