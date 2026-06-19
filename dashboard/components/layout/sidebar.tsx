import Link from "next/link";
import { EssosLogo } from "@/components/brand/essos-logo";
import { CommandPaletteTrigger } from "@/features/command/command-palette";
import { NAV_ITEMS } from "@/features/command/nav-items";
import { DemoRoleSwitcher } from "@/features/demo/demo-role-switcher";
import { ConciergeIdentity } from "./concierge-identity";
import { NavLink } from "./nav-link";

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-border border-r bg-card px-5 py-6 md:flex">
      <div className="flex flex-col gap-1 px-3">
        <Link
          aria-label="Essos — home"
          className="focus-ring inline-flex rounded-control text-ink"
          href="/"
        >
          <EssosLogo className="h-5 w-auto" />
        </Link>
        <p className="font-semibold text-[10px] text-muted uppercase tracking-wider opacity-80">
          Concierge operations
        </p>
      </div>
      <div className="mt-6 px-3">
        <CommandPaletteTrigger />
      </div>
      <nav className="mt-4 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            href={item.href}
            icon={item.icon}
            key={item.href}
            label={item.label}
          />
        ))}
      </nav>
      <div className="mt-auto space-y-4 border-border/50 border-t pt-6">
        <div className="space-y-3">
          <DemoRoleSwitcher />
          <ConciergeIdentity />
        </div>
        <p className="px-3 font-medium text-[10px] text-muted/80 leading-relaxed">
          Live data via Convex. Notional demo patient records.
        </p>
      </div>
    </aside>
  );
}
