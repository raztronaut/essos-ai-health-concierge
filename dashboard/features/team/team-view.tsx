"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { Card, PageHeader, Stat } from "@/components/ui";

function fmtDuration(ms: number): string {
  if (ms <= 0) {
    return "—";
  }
  const min = Math.round(ms / 60_000);
  if (min < 60) {
    return `${min}m`;
  }
  const hr = Math.floor(min / 60);
  return `${hr}h ${min % 60}m`;
}

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
          <p className="text-muted text-sm">Loading team metrics…</p>
        </Card>
      </div>
    );
  }

  const rows = team.byAssignee
    .filter((r) => r.assignee !== "unassigned" || r.resolved + r.takenOver > 0)
    .sort((a, b) => b.resolved - a.resolved);

  return (
    <div className="space-y-8">
      <PageHeader
        subtitle="How the concierge team is handling escalations — response, resolution, and workload."
        title="Team"
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Open flags" value={team.totals.open} />
        <Stat label="Resolved" value={team.totals.resolved} />
        <Stat
          label="Avg resolution"
          value={fmtDuration(team.totals.avgResolutionMs)}
        />
        <Stat
          label="Oldest open"
          value={fmtDuration(team.totals.oldestOpenMs)}
        />
      </section>

      <Card>
        <h2 className="font-semibold text-sm">By concierge</h2>
        {rows.length === 0 ? (
          <p className="mt-2 text-muted text-sm">No handled escalations yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border border-b text-left text-muted text-xs">
                  <th className="py-2 pr-4 font-medium">Concierge</th>
                  <th className="py-2 pr-4 font-medium">Resolved</th>
                  <th className="py-2 pr-4 font-medium">Taken over</th>
                  <th className="py-2 font-medium">Avg resolution</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    className="border-border/60 border-b last:border-0"
                    key={r.assignee}
                  >
                    <td className="py-2 pr-4 text-ink">{r.assignee}</td>
                    <td className="py-2 pr-4">{r.resolved}</td>
                    <td className="py-2 pr-4">{r.takenOver}</td>
                    <td className="py-2">{fmtDuration(r.avgResolutionMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {team.members.length > 0 ? (
        <Card>
          <h2 className="font-semibold text-sm">Members</h2>
          <div className="mt-3 space-y-2">
            {team.members.map((m) => (
              <div
                className="flex items-center justify-between border-border/60 border-b py-2 text-sm last:border-0"
                key={m.clerkId}
              >
                <div className="min-w-0">
                  <div className="truncate text-ink">{m.name}</div>
                  <div className="truncate text-muted text-xs">{m.email}</div>
                </div>
                <div className="flex items-center gap-4 text-muted text-xs">
                  <span>{m.role.replace(/^org:/, "")}</span>
                  <span className="text-ink">{m.resolved} resolved</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-muted text-sm">
            No concierge accounts synced yet. With Clerk configured, team
            members appear here as they sign in (and via the org webhook).
          </p>
        </Card>
      )}
    </div>
  );
}
