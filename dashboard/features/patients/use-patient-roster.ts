import { useMemo, useState } from "react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";

type Row = FunctionReturnType<typeof api.queries.listPatientsWithMeta>[number];
export type SortKey = "name" | "created" | "activity" | "flags";

export const DEFAULT_SORT: SortKey = "name";
export const UNASSIGNED = "__unassigned__";
export const ALL = "__all__";

function sortRows(rows: Row[], key: SortKey): Row[] {
  const copy = [...rows];
  switch (key) {
    case "name":
      return copy.sort((a, b) => a.patient.name.localeCompare(b.patient.name));
    case "created":
      return copy.sort((a, b) =>
        b.patient.created_at.localeCompare(a.patient.created_at)
      );
    case "activity":
      return copy.sort((a, b) =>
        (b.lastActivity ?? "").localeCompare(a.lastActivity ?? "")
      );
    case "flags":
      return copy.sort((a, b) => b.openFlags - a.openFlags);
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

/**
 * S-Tier custom hook to manage patient roster sorting, filtering, and grouping.
 * Keeps the list view component pure and focused on presentation.
 */
export function usePatientRoster(rows: Row[] | undefined) {
  const [search, setSearch] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>(ALL);
  const [procedureFilter, setProcedureFilter] = useState<string>(ALL);
  const [sortKey, setSortKey] = useState<SortKey>(DEFAULT_SORT);
  const [grouped, setGrouped] = useState(false);

  const assigneeOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows ?? []) {
      if (r.assignee) {
        map.set(r.assignee.clerkId, r.assignee.name);
      }
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (q) {
        const hay = `${r.patient.name} ${r.patient.handle}`.toLowerCase();
        if (!hay.includes(q)) {
          return false;
        }
      }
      if (assigneeFilter === UNASSIGNED && r.assignee !== null) {
        return false;
      }
      if (
        assigneeFilter !== ALL &&
        assigneeFilter !== UNASSIGNED &&
        r.assignee?.clerkId !== assigneeFilter
      ) {
        return false;
      }
      if (procedureFilter !== ALL && r.patient.procedure !== procedureFilter) {
        return false;
      }
      return true;
    });
  }, [rows, search, assigneeFilter, procedureFilter]);

  const sorted = useMemo(
    () => sortRows(filtered, sortKey),
    [filtered, sortKey]
  );

  const groups = useMemo(() => {
    if (!grouped) {
      return null;
    }
    const byOwner = new Map<string, { name: string; rows: Row[] }>();
    for (const r of sorted) {
      const key = r.assignee?.clerkId ?? UNASSIGNED;
      const name = r.assignee?.name ?? "Unassigned";
      const bucket = byOwner.get(key) ?? { name, rows: [] };
      bucket.rows.push(r);
      byOwner.set(key, bucket);
    }
    return [...byOwner.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [sorted, grouped]);

  return {
    search,
    setSearch,
    assigneeFilter,
    setAssigneeFilter,
    procedureFilter,
    setProcedureFilter,
    sortKey,
    setSortKey,
    grouped,
    setGrouped,
    assigneeOptions,
    sorted,
    groups,
  };
}
