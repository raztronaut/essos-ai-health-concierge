"use client";

import { api } from "@convex/_generated/api";
import { Command } from "cmdk";
import { useQuery } from "convex/react";
import { useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { demoEnabled, useDemoIdentity } from "@/features/demo/demo-identity";
import { cn } from "@/lib/cn";
import { humanize, stripOrgPrefix } from "@/lib/format";
import { NAV_ITEMS } from "./nav-items";

interface CommandPaletteContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(
  null
);

function useCommandPaletteContext(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error(
      "useCommandPaletteContext must be used within CommandPaletteProvider"
    );
  }
  return ctx;
}

export function useCommandPalette(): CommandPaletteContextValue {
  return useCommandPaletteContext();
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(
    () => ({
      open,
      setOpen,
    }),
    [open]
  );

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPaletteDialog open={open} setOpen={setOpen} />
    </CommandPaletteContext.Provider>
  );
}

/** Sidebar affordance to open the global command palette. */
export function CommandPaletteTrigger({ className }: { className?: string }) {
  const { setOpen } = useCommandPaletteContext();

  return (
    <button
      className={cn(
        "focus-ring flex w-full items-center justify-between gap-2 rounded-control border border-border bg-surface px-3 py-2 text-left text-muted text-sm transition-colors hover:border-secondary/60 hover:text-ink",
        className
      )}
      onClick={() => setOpen(true)}
      type="button"
    >
      <span>Search…</span>
      <kbd className="hidden rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted sm:inline">
        ⌘K
      </kbd>
    </button>
  );
}

function CommandPaletteDialog({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { viewAs, setViewAs, concierges } = useDemoIdentity();

  const patients = useQuery(api.queries.listPatientsWithMeta, {});
  const conversations = useQuery(api.queries.listConversationSummaries, {
    viewAs,
  });

  const run = useCallback(
    (action: () => void) => {
      setOpen(false);
      action();
    },
    [setOpen]
  );

  return (
    <Command.Dialog
      className={cn(
        "pointer-events-auto w-full max-w-lg overflow-hidden rounded-modal bg-card shadow-border outline-none focus:outline-none",
        !reduceMotion && "transition-[opacity,transform] duration-150"
      )}
      contentClassName={cn(
        "command-palette pointer-events-none! fixed inset-0 z-[60] flex items-start justify-center border-0 bg-transparent p-0 px-4 pt-[min(20vh,8rem)] shadow-none outline-none focus:outline-none",
        !reduceMotion && "transition-opacity duration-150"
      )}
      label="Global command menu"
      onOpenChange={setOpen}
      open={open}
      overlayClassName="fixed inset-0 z-[60] bg-ink/30 backdrop-blur-[2px]"
    >
      <div className="flex items-center gap-2 border-border border-b px-4">
        <svg
          aria-hidden="true"
          className="size-4 shrink-0 text-muted"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <Command.Input
          className="h-12 w-full bg-transparent text-ink text-sm outline-none placeholder:text-muted focus:outline-none focus-visible:outline-none focus-visible:ring-0"
          placeholder="Search pages, patients, conversations…"
        />
      </div>
      <Command.List className="max-h-80 overflow-y-auto overscroll-contain p-2 outline-none focus:outline-none">
        <Command.Empty className="px-3 py-8 text-center text-muted text-sm">
          No results found.
        </Command.Empty>

        <Command.Group
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:text-muted [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide"
          heading="Navigate"
        >
          {NAV_ITEMS.map((item) => (
            <CommandItem
              hint={item.href === "/" ? "Home" : item.href.slice(1)}
              icon={item.icon}
              key={item.href}
              onSelect={() => run(() => router.push(item.href))}
              value={`${item.label} ${item.keywords ?? ""}`}
            >
              {item.label}
            </CommandItem>
          ))}
        </Command.Group>

        {patients && patients.length > 0 ? (
          <Command.Group
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:text-muted [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide"
            heading="Patients"
          >
            {patients.map((row) => (
              <CommandItem
                hint={humanize(row.patient.procedure)}
                key={row.patient.id}
                onSelect={() =>
                  run(() => router.push(`/patients/${row.patient.id}`))
                }
                value={`${row.patient.name} ${row.patient.handle} ${row.patient.procedure}`}
              >
                {row.patient.name}
              </CommandItem>
            ))}
          </Command.Group>
        ) : null}

        {conversations && conversations.length > 0 ? (
          <Command.Group
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:text-muted [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide"
            heading="Conversations"
          >
            {conversations.map((conversation) => (
              <CommandItem
                hint={
                  conversation.patient_procedure
                    ? humanize(conversation.patient_procedure)
                    : undefined
                }
                key={conversation.id}
                onSelect={() =>
                  run(() => router.push(`/conversations/${conversation.id}`))
                }
                value={`${conversation.patient_name ?? "Unknown patient"} ${conversation.patient_procedure ?? ""} ${conversation.last_text ?? ""}`}
              >
                {conversation.patient_name ?? "Unknown patient"}
              </CommandItem>
            ))}
          </Command.Group>
        ) : null}

        {demoEnabled && concierges.length > 0 ? (
          <Command.Group
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:text-muted [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide"
            heading="Demo · view as"
          >
            <CommandItem
              hint="Real account"
              onSelect={() => run(() => setViewAs(null))}
              value="view as you real account demo"
            >
              You (real account)
            </CommandItem>
            {concierges.map((concierge) => (
              <CommandItem
                hint={stripOrgPrefix(concierge.role)}
                key={concierge.clerkId}
                onSelect={() => run(() => setViewAs(concierge.clerkId))}
                value={`view as ${concierge.name} ${concierge.role} demo`}
              >
                {concierge.name}
              </CommandItem>
            ))}
          </Command.Group>
        ) : null}
      </Command.List>
    </Command.Dialog>
  );
}

function CommandItem({
  children,
  value,
  hint,
  icon,
  onSelect,
}: {
  children: ReactNode;
  value: string;
  hint?: string;
  icon?: ReactNode;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      className="flex cursor-pointer items-center justify-between gap-3 rounded-control px-3 py-2 text-sm outline-none data-[selected=true]:bg-surface data-[selected=true]:text-ink"
      onSelect={onSelect}
      value={value}
    >
      <span className="flex min-w-0 items-center gap-2">
        {icon ? <span className="shrink-0 text-muted">{icon}</span> : null}
        <span className="truncate">{children}</span>
      </span>
      {hint ? (
        <span className="shrink-0 truncate text-muted text-xs">{hint}</span>
      ) : null}
    </Command.Item>
  );
}
