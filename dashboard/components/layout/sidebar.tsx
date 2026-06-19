import Link from "next/link";
import { EssosLogo } from "@/components/brand/essos-logo";
import { DemoRoleSwitcher } from "@/features/demo/demo-role-switcher";
import { ConciergeIdentity } from "./concierge-identity";
import { NavLink } from "./nav-link";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/conversations", label: "Conversations" },
  { href: "/patients", label: "Patients" },
  { href: "/performance", label: "AI performance" },
  { href: "/team", label: "Team" },
];

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-border border-r bg-card px-5 py-6 md:flex">
      <Link
        aria-label="Essos — home"
        className="focus-ring inline-flex rounded-control text-ink"
        href="/"
      >
        <EssosLogo className="h-5 w-auto" />
      </Link>
      <p className="mt-2 text-muted text-xs">Concierge operations</p>
      <nav className="mt-8 flex flex-col gap-1">
        {NAV.map((item) => (
          <NavLink href={item.href} key={item.href} label={item.label} />
        ))}
      </nav>
      <div className="mt-auto space-y-3">
        <DemoRoleSwitcher />
        <ConciergeIdentity />
        <p className="text-[11px] text-muted leading-relaxed">
          Live data via Convex. Notional demo patient records.
        </p>
      </div>
    </aside>
  );
}
