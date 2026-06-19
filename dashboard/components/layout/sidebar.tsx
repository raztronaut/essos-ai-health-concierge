import Link from "next/link";
import { NavLink } from "./nav-link";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/conversations", label: "Conversations" },
];

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card px-5 py-6 md:flex">
      <Link href="/" className="focus-ring serif text-2xl tracking-tight">
        Essos
      </Link>
      <p className="mt-1 text-xs text-muted">Concierge operations</p>
      <nav className="mt-8 flex flex-col gap-1">
        {NAV.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} />
        ))}
      </nav>
      <div className="mt-auto text-[11px] leading-relaxed text-muted">
        Notional demo data. Read/writes hit the shared local SQLite store.
      </div>
    </aside>
  );
}
