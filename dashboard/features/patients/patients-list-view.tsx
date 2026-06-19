"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Input,
  PageHeader,
  Select,
} from "@/components/ui";
import { formatRelativeTime, humanize } from "@/lib/format";
import { PatientFormDialog } from "./patient-form-dialog";

type Row = FunctionReturnType<typeof api.queries.listPatientsWithMeta>[number];

type SortKey = "name" | "created" | "activity" | "flags";

const DEFAULT_SORT: SortKey = "name";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name", label: "Name (A–Z)" },
  { value: "created", label: "Newest" },
  { value: "activity", label: "Last activity" },
  { value: "flags", label: "Open flags" },
];

const UNASSIGNED = "__unassigned__";
const ALL = "__all__";

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

function PatientRow({ row }: { row: Row }) {
  const { patient, assignee, openFlags, conversationCount, lastActivity } = row;
  return (
    <Link className="block" href={`/patients/${patient.id}`}>
      <Card interactive>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold text-ink">
                {patient.name}
              </span>
              {openFlags > 0 ? (
                <Badge className="bg-high-soft text-high" dot>
                  {openFlags} open
                </Badge>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-muted text-sm">
              {humanize(patient.procedure)} · {patient.clinic_name} ·{" "}
              {patient.destination_city}, {patient.destination_country}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-medium text-ink text-sm">
              {assignee?.name ?? "Unassigned"}
            </div>
            <div className="text-muted text-xs">
              {conversationCount} conv ·{" "}
              {lastActivity ? formatRelativeTime(lastActivity) : "no activity"}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

/** Sortable, filterable roster of every patient, with create-patient flow. */
export function PatientsListView() {
  const rows = useQuery(api.queries.listPatientsWithMeta, {});
  const [search, setSearch] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>(ALL);
  const [procedureFilter, setProcedureFilter] = useState<string>(ALL);
  const [sortKey, setSortKey] = useState<SortKey>(DEFAULT_SORT);
  const [grouped, setGrouped] = useState(false);
  const [creating, setCreating] = useState(false);

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

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button onClick={() => setCreating(true)} variant="primary">
            New patient
          </Button>
        }
        subtitle="Every patient across the team. Edits flow to Eve instantly."
        title="Patients"
      />

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <Input
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or handle…"
              value={search}
            />
          </div>
          <Select
            className="w-auto"
            onChange={(e) => setAssigneeFilter(e.target.value)}
            value={assigneeFilter}
          >
            <option value={ALL}>All members</option>
            <option value={UNASSIGNED}>Unassigned</option>
            {assigneeOptions.map(([clerkId, name]) => (
              <option key={clerkId} value={clerkId}>
                {name}
              </option>
            ))}
          </Select>
          <Select
            className="w-auto"
            onChange={(e) => setProcedureFilter(e.target.value)}
            value={procedureFilter}
          >
            <option value={ALL}>All procedures</option>
            <option value="rhinoplasty">Rhinoplasty</option>
            <option value="hair_transplant">Hair transplant</option>
            <option value="other">Other</option>
          </Select>
          <Select
            className="w-auto"
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            value={sortKey}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                Sort: {o.label}
              </option>
            ))}
          </Select>
          <Button
            onClick={() => setGrouped((g) => !g)}
            variant={grouped ? "primary" : "ghost"}
          >
            {grouped ? "Grouped" : "Group by member"}
          </Button>
        </div>
      </Card>

      {rows === undefined ? (
        <p className="text-muted text-sm">Loading patients…</p>
      ) : sorted.length === 0 ? (
        <Card>
          <p className="text-muted text-sm">No patients match your filters.</p>
        </Card>
      ) : groups ? (
        <div className="space-y-6">
          {groups.map((g) => (
            <section className="space-y-3" key={g.name}>
              <h2 className="font-semibold text-muted text-sm">
                {g.name}
                <span className="ml-2 text-muted/70">({g.rows.length})</span>
              </h2>
              <div className="space-y-3">
                {g.rows.map((r) => (
                  <PatientRow key={r.patient.id} row={r} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((r) => (
            <PatientRow key={r.patient.id} row={r} />
          ))}
        </div>
      )}

      {creating ? (
        <PatientFormDialog onClose={() => setCreating(false)} open={true} />
      ) : null}
    </div>
  );
}
