"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { PageHeader } from "@/components/ui";
import { useDemoIdentity } from "@/features/demo/demo-identity";
import { EMPTY_ARRAY } from "@/lib/empty";
import { EscalationQueue } from "./escalation-queue";
import { PatientsPanel } from "./patients-panel";
import { TelemetryStats } from "./telemetry-stats";

/** Live overview: telemetry tiles + the open-escalation queue (reactive). */
export function OverviewView() {
  const { viewAs } = useDemoIdentity();
  const stats = useQuery(api.queries.overviewStats);
  const openEscalations = useQuery(api.queries.listOpenEscalations);
  const patients = useQuery(api.queries.listPatients, { viewAs });

  return (
    <div className="space-y-8">
      <PageHeader
        subtitle="What every Eve agent is doing across all patients, plus the live flag queue."
        title="Overview"
      />
      <TelemetryStats stats={stats} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <EscalationQueue
          escalations={openEscalations ?? EMPTY_ARRAY}
          now={Date.now()}
          patients={patients ?? EMPTY_ARRAY}
        />
        <PatientsPanel />
      </div>
    </div>
  );
}
