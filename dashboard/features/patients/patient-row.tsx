import type { api } from "@convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { formatRelativeTime, humanize } from "@/lib/format";

type Row = FunctionReturnType<typeof api.queries.listPatientsWithMeta>[number];

export function PatientRow({ row }: { row: Row }) {
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
                <Badge className="bg-high-soft text-high tabular-nums" dot>
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
            <div className="text-muted text-xs tabular-nums">
              {conversationCount} conv ·{" "}
              {lastActivity ? formatRelativeTime(lastActivity) : "no activity"}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
