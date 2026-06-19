"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { clerkEnabled } from "@/app/ConvexClientProvider";

/** Whether the demo "view as" affordance is enabled (NEXT_PUBLIC_ESSOS_DEMO_MODE). */
export const demoEnabled = Boolean(process.env.NEXT_PUBLIC_ESSOS_DEMO_MODE);

const STORAGE_KEY = "essos.viewAs";

interface ConciergeOption {
  clerkId: string;
  name: string;
  role: string;
}

interface DemoIdentity {
  /** Synced concierge accounts (for the switcher + name lookups). */
  concierges: ConciergeOption[];
  /** The clerk id reads/writes run as (override in demo, else the real user). */
  effectiveId: string | null;
  /** Effective lead status for UI gating. */
  isLead: boolean;
  /** Signed-in concierge's first name (empty when Clerk is not configured). */
  realFirstName: string;
  /** The currently-selected option when viewing as someone else. */
  selected: ConciergeOption | null;
  setViewAs: (id: string | null) => void;
  /** Demo-only override target (a Clerk user id), or null for "you". */
  viewAs: string | null;
}

const DemoContext = createContext<DemoIdentity>({
  viewAs: null,
  setViewAs: () => undefined,
  effectiveId: null,
  isLead: true,
  realFirstName: "",
  concierges: [],
  selected: null,
});

export function useDemoIdentity(): DemoIdentity {
  return useContext(DemoContext);
}

/** Args helper: merges the active `viewAs` into a Convex query/mutation arg object. */
export function useScopedArgs(): <T extends Record<string, unknown>>(
  extra?: T
) => T & { viewAs: string | null } {
  const { viewAs } = useDemoIdentity();
  return useCallback(
    <T extends Record<string, unknown>>(extra?: T) =>
      ({ ...(extra ?? ({} as T)), viewAs }) as T & { viewAs: string | null },
    [viewAs]
  );
}

export function DemoIdentityProvider({ children }: { children: ReactNode }) {
  if (clerkEnabled) {
    return <ClerkAware>{children}</ClerkAware>;
  }
  // Local demo (no Clerk): the operator is a lead.
  return (
    <Inner realFirstName="" realId={null} realRole="org:admin">
      {children}
    </Inner>
  );
}

function ClerkAware({ children }: { children: ReactNode }) {
  const { userId, orgRole } = useAuth();
  const { user } = useUser();
  return (
    <Inner
      realFirstName={user?.firstName ?? ""}
      realId={userId ?? null}
      realRole={orgRole ?? "org:member"}
    >
      {children}
    </Inner>
  );
}

function Inner({
  realId,
  realRole,
  realFirstName,
  children,
}: {
  realId: string | null;
  realRole: string;
  realFirstName: string;
  children: ReactNode;
}) {
  const concierges = (useQuery(api.users.listConcierges, {}) ?? []).map(
    (c) => ({
      clerkId: c.clerkId,
      name: c.name,
      role: c.role,
    })
  );
  const [viewAs, setViewAsState] = useState<string | null>(null);

  useEffect(() => {
    if (!demoEnabled) {
      return;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setViewAsState(stored);
    }
  }, []);

  const setViewAs = useCallback((id: string | null) => {
    setViewAsState(id);
    if (id) {
      window.localStorage.setItem(STORAGE_KEY, id);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const value = useMemo<DemoIdentity>(() => {
    const activeViewAs = demoEnabled ? viewAs : null;
    const selected = activeViewAs
      ? (concierges.find((c) => c.clerkId === activeViewAs) ?? null)
      : null;
    const isLead = activeViewAs
      ? selected?.role === "org:admin"
      : realRole === "org:admin";
    return {
      viewAs: activeViewAs,
      setViewAs,
      effectiveId: activeViewAs ?? realId,
      isLead,
      realFirstName,
      concierges,
      selected,
    };
  }, [viewAs, concierges, realId, realRole, realFirstName, setViewAs]);

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}
