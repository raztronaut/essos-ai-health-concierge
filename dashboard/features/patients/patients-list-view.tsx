"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { useState } from "react";
import { Button, EmptyState, LoadingState, PageHeader } from "@/components/ui";
import { PatientFilters } from "./patient-filters";
import { PatientFormDialog } from "./patient-form-dialog";
import { PatientRow } from "./patient-row";
import { usePatientRoster } from "./use-patient-roster";

/** Sortable, filterable roster of every patient, with create-patient flow. */
export function PatientsListView() {
  const rows = useQuery(api.queries.listPatientsWithMeta, {});
  const [creating, setCreating] = useState(false);

  const {
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
  } = usePatientRoster(rows);

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

      <PatientFilters
        assigneeFilter={assigneeFilter}
        assigneeOptions={assigneeOptions}
        grouped={grouped}
        onAssigneeFilterChange={setAssigneeFilter}
        onGroupedChange={setGrouped}
        onProcedureFilterChange={setProcedureFilter}
        onSearchChange={setSearch}
        onSortKeyChange={setSortKey}
        procedureFilter={procedureFilter}
        search={search}
        sortKey={sortKey}
      />

      {rows === undefined ? (
        <LoadingState message="Loading patients…" />
      ) : sorted.length === 0 ? (
        <EmptyState message="No patients match your filters." />
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
