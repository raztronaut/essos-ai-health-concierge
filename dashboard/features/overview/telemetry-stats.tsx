import { Stat } from "@/components/ui";

export function TelemetryStats({
  patients,
  conversations,
  openFlags,
  totalFlags,
  autonomousReplies,
  escalatedTurns,
}: {
  patients: number;
  conversations: number;
  openFlags: number;
  totalFlags: number;
  autonomousReplies: number;
  escalatedTurns: number;
}) {
  return (
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Stat label="Patients" value={patients} />
      <Stat label="Conversations" value={conversations} />
      <Stat label="Open flags" value={openFlags} hint={`${totalFlags} total`} />
      <Stat
        label="Autonomous replies"
        value={autonomousReplies}
        hint={`${escalatedTurns} escalated`}
      />
    </section>
  );
}
