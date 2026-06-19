"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Card, PageHeader } from "@/components/ui";
import { ItineraryTimeline } from "./itinerary-timeline";
import { CareInstructions } from "./care-instructions";
import { SourceDocuments } from "./source-documents";

export function PatientDetailView({ id }: { id: string }) {
  const patient = useQuery(api.queries.getPatient, { id });
  const itinerary = useQuery(api.queries.listItinerary, { patientId: id });
  const care = useQuery(api.queries.listCareInstructions, { patientId: id });
  const docs = useQuery(api.queries.listSourceDocumentsForPatient, {
    patientId: id,
  });

  if (patient === undefined) {
    return <p className="text-sm text-muted">Loading patient…</p>;
  }
  if (patient === null) {
    return (
      <Card>
        <p className="text-sm text-muted">Patient not found.</p>
        <Link href="/conversations" className="mt-2 inline-block text-sm text-primary hover:underline">
          ← Conversations
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/conversations" className="text-sm text-primary hover:underline">
            ← Conversations
          </Link>
        }
        title={patient.name}
        subtitle={`${patient.procedure.replace(/_/g, " ")} · ${patient.clinic_name} · ${patient.destination_city}, ${patient.destination_country}`}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <ItineraryTimeline itinerary={itinerary ?? []} />
        <aside className="space-y-4">
          <CareInstructions care={care ?? []} />
          <SourceDocuments docs={docs ?? []} />
        </aside>
      </div>
    </div>
  );
}
