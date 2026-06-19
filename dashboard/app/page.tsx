import type { Metadata } from "next";
import {
  countActivityByEvent,
  countMessagesByRole,
  listConversations,
  listEscalations,
  listPatients,
} from "@essos/shared";
import { PageHeader } from "@/components/ui";
import { TelemetryStats } from "@/features/overview/telemetry-stats";
import { EscalationQueue } from "@/features/overview/escalation-queue";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Overview — Essos Concierge" };

export default function OverviewPage() {
  const patients = listPatients();
  const conversations = listConversations();
  const openEscalations = listEscalations("open");
  const allEscalations = listEscalations();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        subtitle="What every Eve agent is doing across all patients, plus the live flag queue."
      />
      <TelemetryStats
        patients={patients.length}
        conversations={conversations.length}
        openFlags={openEscalations.length}
        totalFlags={allEscalations.length}
        autonomousReplies={countMessagesByRole("agent")}
        escalatedTurns={countActivityByEvent("escalated")}
      />
      <EscalationQueue escalations={openEscalations} patients={patients} />
    </div>
  );
}
