"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { PageHeader } from "@/components/ui";
import { TelemetryStats } from "./telemetry-stats";
import { EscalationQueue } from "./escalation-queue";

/** Live overview: telemetry tiles + the open-escalation queue (reactive). */
export function OverviewView() {
  const stats = useQuery(api.queries.overviewStats);
  const openEscalations = useQuery(api.queries.listOpenEscalations);
  const patients = useQuery(api.queries.listPatients);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        subtitle="What every Eve agent is doing across all patients, plus the live flag queue."
      />
      <TelemetryStats stats={stats} />
      <EscalationQueue
        escalations={openEscalations ?? []}
        patients={patients ?? []}
      />
    </div>
  );
}
