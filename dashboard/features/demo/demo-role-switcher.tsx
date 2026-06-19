"use client";

import { Select } from "@/components/ui";
import { stripOrgPrefix } from "@/lib/format";
import { demoEnabled, useDemoIdentity } from "./demo-identity";

/**
 * Demo-only control to preview the dashboard as any concierge without signing
 * out. Re-scopes every reactive query live, so you can show a lead's full view
 * vs. a member's assigned-only view in one click. Hidden unless
 * NEXT_PUBLIC_ESSOS_DEMO_MODE is set.
 */
export function DemoRoleSwitcher() {
  const { viewAs, setViewAs, concierges, selected } = useDemoIdentity();

  if (!demoEnabled) {
    return null;
  }

  return (
    <div className="rounded-control border border-secondary/60 border-dashed bg-surface px-3 py-2">
      <label
        className="mb-1 block font-medium text-[10px] text-muted uppercase tracking-wide"
        htmlFor="demo-view-as"
      >
        Demo · view as
      </label>
      <Select
        id="demo-view-as"
        onChange={(e) => setViewAs(e.target.value || null)}
        value={viewAs ?? ""}
      >
        <option value="">You (real account)</option>
        {concierges.map((c) => (
          <option key={c.clerkId} value={c.clerkId}>
            {c.name} · {stripOrgPrefix(c.role)}
          </option>
        ))}
      </Select>
      {selected ? (
        <p className="mt-1 text-[10px] text-secondary leading-normal">
          Viewing as <span className="font-medium">{selected.name}</span>. Reads
          + actions are scoped to this concierge.
        </p>
      ) : null}
    </div>
  );
}
