import { Stat } from "@/components/ui";

export interface OverviewStats {
  autonomousReplies: number;
  conversations: number;
  escalatedTurns: number;
  openFlags: number;
  patients: number;
  remindersSent: number;
  totalFlags: number;
}

export function TelemetryStats({
  stats,
}: {
  stats: OverviewStats | undefined;
}) {
  const containment =
    stats && stats.autonomousReplies + stats.escalatedTurns > 0
      ? Math.round(
          (stats.autonomousReplies /
            (stats.autonomousReplies + stats.escalatedTurns)) *
            100
        )
      : null;

  return (
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <Stat label="Patients" value={stats?.patients ?? "—"} />
      <Stat label="Conversations" value={stats?.conversations ?? "—"} />
      <Stat
        hint={stats ? `${stats.totalFlags} total` : undefined}
        label="Open flags"
        value={stats?.openFlags ?? "—"}
      />
      <Stat
        hint={containment === null ? undefined : `${containment}% contained`}
        label="Autonomous replies"
        value={stats?.autonomousReplies ?? "—"}
      />
      <Stat label="Reminders sent" value={stats?.remindersSent ?? "—"} />
    </section>
  );
}
