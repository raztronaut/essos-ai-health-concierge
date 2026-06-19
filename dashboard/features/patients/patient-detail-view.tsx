"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { CareInstructions } from "./care-instructions";
import { ItineraryTimeline } from "./itinerary-timeline";
import { SourceDocuments } from "./source-documents";

export function PatientDetailView({ id }: { id: string }) {
  const patient = useQuery(api.queries.getPatient, { id });
  const itinerary = useQuery(api.queries.listItinerary, { patientId: id });
  const care = useQuery(api.queries.listCareInstructions, { patientId: id });
  const docs = useQuery(api.queries.listSourceDocumentsForPatient, {
    patientId: id,
  });

  if (patient === undefined) {
    return <p className="text-muted text-sm">Loading patient…</p>;
  }
  if (patient === null) {
    return (
      <Card>
        <p className="text-muted text-sm">Patient not found.</p>
        <Link
          className="mt-2 inline-block text-primary text-sm hover:underline"
          href="/conversations"
        >
          ← Conversations
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link
            className="text-primary text-sm hover:underline"
            href="/conversations"
          >
            ← Conversations
          </Link>
        }
        subtitle={`${patient.procedure.replace(/_/g, " ")} · ${patient.clinic_name} · ${patient.destination_city}, ${patient.destination_country}`}
        title={patient.name}
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
