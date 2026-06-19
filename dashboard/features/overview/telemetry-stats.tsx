import { Stat } from "@/components/ui";

export interface OverviewStats {
  patients: number;
  conversations: number;
  openFlags: number;
  totalFlags: number;
  autonomousReplies: number;
  escalatedTurns: number;
  remindersSent: number;
}

export function TelemetryStats({ stats }: { stats: OverviewStats | undefined }) {
  const containment =
    stats && stats.autonomousReplies + stats.escalatedTurns > 0
      ? Math.round(
          (stats.autonomousReplies /
            (stats.autonomousReplies + stats.escalatedTurns)) *
            100,
        )
      : null;

  return (
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <Stat label="Patients" value={stats?.patients ?? "—"} />
      <Stat label="Conversations" value={stats?.conversations ?? "—"} />
      <Stat
        label="Open flags"
        value={stats?.openFlags ?? "—"}
        hint={stats ? `${stats.totalFlags} total` : undefined}
      />
      <Stat
        label="Autonomous replies"
        value={stats?.autonomousReplies ?? "—"}
        hint={
          containment !== null ? `${containment}% contained` : undefined
        }
      />
      <Stat label="Reminders sent" value={stats?.remindersSent ?? "—"} />
    </section>
  );
}
