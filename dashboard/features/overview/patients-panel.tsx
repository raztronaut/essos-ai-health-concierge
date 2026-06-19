"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import {
  Badge,
  Card,
  EmptyState,
  LoadingState,
  SectionHeader,
  TextLink,
} from "@/components/ui";
import { humanize } from "@/lib/format";

/** Compact roster snapshot for the overview: unassigned first, then flagged. */
export function PatientsPanel() {
  const rows = useQuery(api.queries.listPatientsWithMeta, {});

  const ranked = [...(rows ?? [])]
    .sort((a, b) => {
      const aUn = a.assignee ? 0 : 1;
      const bUn = b.assignee ? 0 : 1;
      if (aUn !== bUn) {
        return bUn - aUn;
      }
      return b.openFlags - a.openFlags;
    })
    .slice(0, 6);

  return (
    <section className="space-y-3">
      <SectionHeader
        action={<TextLink href="/patients">View all →</TextLink>}
        title="Patients"
      />

      {rows === undefined ? (
        <Card>
          <LoadingState message="Loading..." />
        </Card>
      ) : ranked.length === 0 ? (
        <EmptyState message="No patients yet." />
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {ranked.map((r) => (
              <li key={r.patient.id}>
                <Link
                  className="focus-ring -mx-2 flex items-center justify-between gap-3 rounded-control px-2 py-2 hover:bg-surface"
                  href={`/patients/${r.patient.id}`}
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-ink text-sm">
                      {r.patient.name}
                    </div>
                    <div className="truncate text-muted text-xs">
                      {humanize(r.patient.procedure)} ·{" "}
                      {r.patient.destination_city}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {r.openFlags > 0 ? (
                      <Badge className="bg-high-soft text-high" dot>
                        {r.openFlags}
                      </Badge>
                    ) : null}
                    <span className="text-muted text-xs">
                      {r.assignee?.name ?? "Unassigned"}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
