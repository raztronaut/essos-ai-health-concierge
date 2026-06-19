"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { PageHeader } from "@/components/ui";
import { EscalationQueue } from "./escalation-queue";
import { TelemetryStats } from "./telemetry-stats";

/** Live overview: telemetry tiles + the open-escalation queue (reactive). */
export function OverviewView() {
  const stats = useQuery(api.queries.overviewStats);
  const openEscalations = useQuery(api.queries.listOpenEscalations);
  const patients = useQuery(api.queries.listPatients);

  return (
    <div className="space-y-8">
      <PageHeader
        subtitle="What every Eve agent is doing across all patients, plus the live flag queue."
        title="Overview"
      />
      <TelemetryStats stats={stats} />
      <EscalationQueue
        escalations={openEscalations ?? []}
        patients={patients ?? []}
      />
    </div>
  );
}
