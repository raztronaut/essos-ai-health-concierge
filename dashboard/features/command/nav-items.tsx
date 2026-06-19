import type { ReactNode } from "react";

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

export interface NavItem {
  href: string;
  icon: ReactNode;
  keywords?: string;
  label: string;
}

/** Primary sidebar / command-palette navigation targets. */
export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Overview",
    icon: OverviewIcon,
    keywords: "home dashboard",
  },
  {
    href: "/conversations",
    label: "Conversations",
    icon: ConversationsIcon,
    keywords: "threads messages chat",
  },
  {
    href: "/patients",
    label: "Patients",
    icon: PatientsIcon,
    keywords: "roster records",
  },
  {
    href: "/performance",
    label: "AI performance",
    icon: PerformanceIcon,
    keywords: "telemetry metrics agent",
  },
  {
    href: "/team",
    label: "Team",
    icon: TeamIcon,
    keywords: "concierges members",
  },
];
