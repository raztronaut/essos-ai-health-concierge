"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import {
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  Stat,
} from "@/components/ui";
import { formatDuration, stripOrgPrefix } from "@/lib/format";

/** Concierge team performance: response/resolution times and per-rep workload. */
export function TeamView() {
  const now = useMemo(() => new Date().toISOString(), []);
  const team = useQuery(api.queries.teamPerformance, { now });

  if (team === undefined) {
    return (
      <div className="space-y-6">
        <PageHeader
          subtitle="Concierge performance and workload."
          title="Team"
        />
        <Card>
          <LoadingState message="Loading team metrics..." />
        </Card>
      </div>
    );
  }

  const rows = [...team.members].sort(
    (a, b) => b.resolved + b.takenOver - (a.resolved + a.takenOver)
  );

  return (
    <div className="space-y-8">
      <PageHeader
        subtitle="How the concierge team is handling escalations — response, resolution, and workload."
        title="Team"
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Open flags" value={team.totals.open} />
        <Stat label="Unassigned" value={team.totals.unassignedOpen} />
        <Stat
          label="Avg first response"
          value={formatDuration(team.totals.avgFirstResponseMs)}
        />
        <Stat
          label="Avg resolution"
          value={formatDuration(team.totals.avgResolutionMs)}
        />
        <Stat
          label="Oldest open"
          value={formatDuration(team.totals.oldestOpenMs)}
        />
      </section>

      <Card>
        <h2 className="font-semibold text-sm">By concierge</h2>
        {rows.length === 0 ? (
          <EmptyState message="No concierge accounts synced yet. With Clerk configured, team members appear here as they sign in (and via the org webhook)." />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border border-b text-left text-muted text-xs">
                  <th className="py-2 pr-4 font-medium">Concierge</th>
                  <th className="py-2 pr-4 font-medium">Role</th>
                  <th className="py-2 pr-4 font-medium">Resolved</th>
                  <th className="py-2 pr-4 font-medium">Taken over</th>
                  <th className="py-2 pr-4 font-medium">First response</th>
                  <th className="py-2 font-medium">Avg resolution</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    className="border-border/60 border-b last:border-0"
                    key={r.clerkId}
                  >
                    <td className="py-2 pr-4">
                      <div className="text-ink">{r.name}</div>
                      <div className="text-muted text-xs">{r.email}</div>
                    </td>
                    <td className="py-2 pr-4 text-muted">
                      {stripOrgPrefix(r.role)}
                    </td>
                    <td className="py-2 pr-4 tabular-nums">{r.resolved}</td>
                    <td className="py-2 pr-4 tabular-nums">{r.takenOver}</td>
                    <td className="py-2 pr-4 tabular-nums">
                      {formatDuration(r.avgFirstResponseMs)}
                    </td>
                    <td className="py-2 tabular-nums">
                      {formatDuration(r.avgResolutionMs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
