import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getPatientById,
  listCareInstructions,
  listItinerary,
  listSourceDocumentsForPatient,
} from "@essos/shared";
import { PageHeader } from "@/components/ui";
import { ItineraryTimeline } from "@/features/patients/itinerary-timeline";
import { CareInstructions } from "@/features/patients/care-instructions";
import { SourceDocuments } from "@/features/patients/source-documents";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const patient = getPatientById(id);
  return { title: `${patient?.name ?? "Patient"} — Essos Concierge` };
}

export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = getPatientById(id);
  if (!patient) notFound();

  const itinerary = listItinerary(id);
  const care = listCareInstructions(id);
  const docs = listSourceDocumentsForPatient(id);

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
        <ItineraryTimeline itinerary={itinerary} />
        <aside className="space-y-4">
          <CareInstructions care={care} />
          <SourceDocuments docs={docs} />
        </aside>
      </div>
    </div>
  );
}
