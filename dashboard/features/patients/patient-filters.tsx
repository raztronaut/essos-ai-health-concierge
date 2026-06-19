import { Button, Card, Input, Select } from "@/components/ui";
import { PROCEDURE_OPTIONS } from "./options";
import { ALL, type SortKey, UNASSIGNED } from "./use-patient-roster";

export function PatientFilters({
  search,
  onSearchChange,
  assigneeFilter,
  onAssigneeFilterChange,
  assigneeOptions,
  procedureFilter,
  onProcedureFilterChange,
  sortKey,
  onSortKeyChange,
  grouped,
  onGroupedChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  assigneeFilter: string;
  onAssigneeFilterChange: (value: string) => void;
  assigneeOptions: [string, string][];
  procedureFilter: string;
  onProcedureFilterChange: (value: string) => void;
  sortKey: SortKey;
  onSortKeyChange: (value: SortKey) => void;
  grouped: boolean;
  onGroupedChange: (value: boolean) => void;
}) {
  return (
    <Card>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Search Input with Icon */}
        <div className="relative max-w-md flex-1">
          <Input
            aria-label="Search patients by name or handle"
            className="w-full pl-9"
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search name or handle…"
            value={search}
          />
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted/60">
            <svg
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col flex-wrap items-stretch gap-2.5 sm:flex-row sm:items-center">
          <Select
            aria-label="Filter by assigned member"
            onChange={(e) => onAssigneeFilterChange(e.target.value)}
            value={assigneeFilter}
            wrapperClassName="w-full sm:w-40"
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
            aria-label="Filter by procedure"
            onChange={(e) => onProcedureFilterChange(e.target.value)}
            value={procedureFilter}
            wrapperClassName="w-full sm:w-44"
          >
            <option value={ALL}>All procedures</option>
            {PROCEDURE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Sort patients"
            onChange={(e) => onSortKeyChange(e.target.value as SortKey)}
            value={sortKey}
            wrapperClassName="w-full sm:w-48"
          >
            <option value="name">Sort: Name (A–Z)</option>
            <option value="created">Sort: Newest</option>
            <option value="activity">Sort: Last activity</option>
            <option value="flags">Sort: Open flags</option>
          </Select>

          <Button
            className="w-full whitespace-nowrap sm:w-auto"
            onClick={() => onGroupedChange(!grouped)}
            variant={grouped ? "primary" : "ghost"}
          >
            {grouped ? "Grouped" : "Group by member"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
