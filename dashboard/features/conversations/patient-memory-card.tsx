"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { SparkleIcon } from "@/components/icons";
import { Card } from "@/components/ui";
import { useDemoIdentity } from "@/features/demo/demo-identity";

/**
 * What Eve has durably remembered about this patient (per-person memory,
 * written by the agent and carried across the patient's conversations). Renders
 * nothing until there's a note, so it stays out of the way for new patients.
 */
export function PatientMemoryCard({ patientId }: { patientId: string }) {
  const { viewAs } = useDemoIdentity();
  const memory = useQuery(api.queries.getPatientMemory, { patientId, viewAs });

  if (!memory) {
    return null;
  }

  return (
    <Card>
      <h2 className="flex items-center gap-1.5 font-semibold text-sm">
        <SparkleIcon className="size-3.5 text-stone-50" />
        What Eve remembers
      </h2>
      <p className="mt-2 whitespace-pre-wrap text-pretty text-muted text-sm leading-relaxed">
        {memory}
      </p>
    </Card>
  );
}
