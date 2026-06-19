import Link from "next/link";
import { EssosLogo } from "@/components/brand/essos-logo";
import { DemoRoleSwitcher } from "@/features/demo/demo-role-switcher";
import { ConciergeIdentity } from "./concierge-identity";
import { NavLink } from "./nav-link";

const OverviewIcon = (
  <svg
    aria-hidden="true"
    className="size-4"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
  >
    <rect height="9" rx="1" width="7" x="3" y="3" />
    <rect height="5" rx="1" width="7" x="14" y="3" />
    <rect height="9" rx="1" width="7" x="14" y="12" />
    <rect height="5" rx="1" width="7" x="3" y="16" />
  </svg>
);

const ConversationsIcon = (
  <svg
    aria-hidden="true"
    className="size-4"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const PatientsIcon = (
  <svg
    aria-hidden="true"
    className="size-4"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const PerformanceIcon = (
  <svg
    aria-hidden="true"
    className="size-4"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
  </svg>
);

const TeamIcon = (
  <svg
    aria-hidden="true"
    className="size-4"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const NAV = [
  { href: "/", label: "Overview", icon: OverviewIcon },
  { href: "/conversations", label: "Conversations", icon: ConversationsIcon },
  { href: "/patients", label: "Patients", icon: PatientsIcon },
  { href: "/performance", label: "AI performance", icon: PerformanceIcon },
  { href: "/team", label: "Team", icon: TeamIcon },
];

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
      <nav className="mt-8 flex flex-col gap-1">
        {NAV.map((item) => (
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
