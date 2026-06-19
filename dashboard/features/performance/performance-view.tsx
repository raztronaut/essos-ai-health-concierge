"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { BarColumn, BarMeter } from "@/components/charts/bar-meter";
import {
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  Stat,
} from "@/components/ui";
import { humanize } from "@/lib/format";

function fmtMs(ms: number): string {
  if (ms <= 0) {
    return "—";
  }
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
    []
  );
  const perf = useQuery(api.queries.aiPerformance, { since });

  if (perf === undefined) {
    return (
      <div className="space-y-6">
        <PageHeader
          subtitle="What Eve is doing, and how well."
          title="AI performance"
        />
        <Card>
          <LoadingState message="Loading telemetry…" />
        </Card>
      </div>
    );
  }

  const tools = Object.entries(perf.toolUsage).sort((a, b) => b[1] - a[1]);
  const maxTool = tools.reduce((m, [, n]) => Math.max(m, n), 0);
  const maxTrend = perf.trend.reduce((m, t) => Math.max(m, t.turns), 0);
  const maxCategory = perf.byCategory.reduce((m, c) => Math.max(m, c.turns), 0);

  return (
    <div className="space-y-8">
      <PageHeader
        subtitle="Per-turn telemetry over the last 7 days — autonomy, latency, tools, cost, and draft quality."
        title="AI performance"
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Turns" value={perf.totalTurns} />
        <Stat
          hint={`${perf.autonomousTurns} of ${perf.totalTurns}`}
          label="Autonomy"
          value={pct(perf.resolutionRate)}
        />
        <Stat label="Escalated turns" value={perf.escalatedTurns} />
        <Stat label="Reminders sent" value={perf.remindersSent} />
        <Stat label="Latency p50" value={fmtMs(perf.latency.p50)} />
        <Stat label="Latency p95" value={fmtMs(perf.latency.p95)} />
        <Stat label="Avg latency" value={fmtMs(perf.latency.avg)} />
        <Stat
          hint={
            perf.tokens.totalTokens > 0
              ? `${perf.tokens.promptTokens.toLocaleString()} in / ${perf.tokens.completionTokens.toLocaleString()} out`
              : "no usage reported"
          }
          label="Tokens"
          value={
            perf.tokens.totalTokens > 0
              ? perf.tokens.totalTokens.toLocaleString()
              : "—"
          }
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-sm">Tool usage</h2>
          {tools.length === 0 ? (
            <EmptyState message="No tool calls recorded yet." />
          ) : (
            <div className="mt-3 space-y-2">
              {tools.map(([tool, n]) => (
                <div className="space-y-1" key={tool}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink">{humanize(tool)}</span>
                    <span className="text-muted tabular-nums">{n}</span>
                  </div>
                  <BarMeter label={humanize(tool)} max={maxTool} value={n} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-balance font-semibold text-sm">
            Concierge AI-assist drafts
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-4">
            <Stat label="Escalations" value={perf.drafts.escalations} />
            <Stat
              hint={`${pct(perf.drafts.draftRate)} drafted`}
              label="With draft"
              value={perf.drafts.withDraft}
            />
            <Stat
              hint="lower = less rework"
              label="Avg edit"
              value={
                perf.drafts.avgEditDistance === null
                  ? "—"
                  : pct(perf.drafts.avgEditDistance)
              }
            />
          </div>
          <p className="mt-3 text-pretty text-muted text-xs">
            Eve drafts a source-grounded reply on escalation; the concierge
            reviews and sends it. A higher draft rate means less cold-start
            typing — and a low average edit distance means the drafts are good
            enough to send nearly as-is.
          </p>
        </Card>

        <Card>
          <h2 className="text-balance font-semibold text-sm">
            Escalation validity
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <Stat
              hint={`${perf.validity.labeled} labeled`}
              label="Were necessary"
              value={
                perf.validity.labeled === 0 ? "—" : pct(perf.validity.validRate)
              }
            />
            <Stat label="Unnecessary" value={perf.validity.invalid} />
          </div>
          <p className="mt-3 text-pretty text-muted text-xs">
            The human verdict on each flag. A falling "were necessary" rate
            means Eve is over-escalating — the signal to loosen a category or
            expand what it can answer.
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold text-sm">Turns by category</h2>
        {perf.byCategory.length === 0 ? (
          <EmptyState message="No categorized turns yet." />
        ) : (
          <div className="mt-3 space-y-2">
            {perf.byCategory.map((c) => (
              <div className="space-y-1" key={c.category}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink">{humanize(c.category)}</span>
                  <span className="text-muted tabular-nums">
                    {c.turns}
                    {c.escalated > 0 ? ` · ${c.escalated} escalated` : ""}
                  </span>
                </div>
                <BarMeter
                  label={humanize(c.category)}
                  max={maxCategory}
                  value={c.turns}
                />
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-pretty text-muted text-xs">
          Where Eve spends its turns, and which categories drive escalations —
          the slice to watch when tuning the taxonomy or expanding what Eve can
          answer.
        </p>
      </Card>

      <Card>
        <h2 className="font-semibold text-sm">Daily volume</h2>
        {perf.trend.length === 0 ? (
          <EmptyState message="No turns in this window." />
        ) : (
          <div className="mt-4 flex items-end gap-2">
            {perf.trend.map((t) => (
              <div
                className="flex min-w-0 flex-1 flex-col items-center gap-1"
                key={t.day}
              >
                <div className="flex h-24 w-full items-end justify-center">
                  <BarColumn
                    label={`Turns on ${t.day}`}
                    max={maxTrend}
                    title={`${t.turns} turns, ${t.escalated} escalated`}
                    value={t.turns}
                  />
                </div>
                <span className="truncate text-meta tabular-nums">
                  {t.day.slice(5)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
