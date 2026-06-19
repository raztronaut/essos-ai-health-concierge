"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Card, PageHeader, Stat } from "@/components/ui";
import { humanize } from "@/lib/format";

function fmtMs(ms: number): string {
  if (ms <= 0) return "—";
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}
function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/** AI observability: resolution rate, latency, tool usage, tokens, draft quality. */
export function PerformanceView() {
  // Window passed as an arg — Convex queries must not call Date.now().
  const since = useMemo(
    () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    [],
  );
  const perf = useQuery(api.queries.aiPerformance, { since });

  if (perf === undefined) {
    return (
      <div className="space-y-6">
        <PageHeader title="AI performance" subtitle="What Eve is doing, and how well." />
        <Card>
          <p className="text-sm text-muted">Loading telemetry…</p>
        </Card>
      </div>
    );
  }

  const tools = Object.entries(perf.toolUsage).sort((a, b) => b[1] - a[1]);
  const maxTool = tools.reduce((m, [, n]) => Math.max(m, n), 0);
  const maxTrend = perf.trend.reduce((m, t) => Math.max(m, t.turns), 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="AI performance"
        subtitle="Per-turn telemetry over the last 7 days — autonomy, latency, tools, cost, and draft quality."
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Turns" value={perf.totalTurns} />
        <Stat
          label="Autonomy"
          value={pct(perf.resolutionRate)}
          hint={`${perf.autonomousTurns} of ${perf.totalTurns}`}
        />
        <Stat label="Escalated turns" value={perf.escalatedTurns} />
        <Stat label="Reminders sent" value={perf.remindersSent} />
        <Stat label="Latency p50" value={fmtMs(perf.latency.p50)} />
        <Stat label="Latency p95" value={fmtMs(perf.latency.p95)} />
        <Stat label="Avg latency" value={fmtMs(perf.latency.avg)} />
        <Stat
          label="Tokens"
          value={perf.tokens.totalTokens > 0 ? perf.tokens.totalTokens.toLocaleString() : "—"}
          hint={
            perf.tokens.totalTokens > 0
              ? `${perf.tokens.promptTokens.toLocaleString()} in / ${perf.tokens.completionTokens.toLocaleString()} out`
              : "no usage reported"
          }
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold">Tool usage</h2>
          {tools.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No tool calls recorded yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {tools.map(([tool, n]) => (
                <div key={tool} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink">{humanize(tool)}</span>
                    <span className="text-muted">{n}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-surface">
                    <div
                      className="h-1.5 rounded-full bg-primary"
                      style={{ width: `${maxTool ? (n / maxTool) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-semibold">Concierge AI-assist drafts</h2>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <Stat label="Escalations" value={perf.drafts.escalations} />
            <Stat
              label="With draft"
              value={perf.drafts.withDraft}
              hint={`${pct(perf.drafts.draftRate)} drafted`}
            />
          </div>
          <p className="mt-3 text-xs text-muted">
            Eve drafts a source-grounded reply on escalation; the concierge reviews
            and sends it. A higher draft rate means less cold-start typing for the team.
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="text-sm font-semibold">Daily volume</h2>
        {perf.trend.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No turns in this window.</p>
        ) : (
          <div className="mt-4 flex items-end gap-2">
            {perf.trend.map((t) => (
              <div key={t.day} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div className="flex h-24 w-full items-end justify-center">
                  <div
                    className="w-full max-w-8 rounded-t bg-primary/80"
                    style={{ height: `${maxTrend ? (t.turns / maxTrend) * 100 : 0}%` }}
                    title={`${t.turns} turns, ${t.escalated} escalated`}
                  />
                </div>
                <span className="truncate text-[10px] text-muted">{t.day.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
