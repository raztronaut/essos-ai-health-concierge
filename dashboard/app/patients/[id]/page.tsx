import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getPatientById,
  listCareInstructions,
  listItinerary,
  listSourceDocumentsForPatient,
} from "@essos/shared";
import { Card, CareRow, PageHeader } from "@/lib/ui";
import { formatDateTime, humanize } from "@/lib/format";

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

  const byPhase = {
    preop: care.filter((c) => c.phase === "preop"),
    postop: care.filter((c) => c.phase === "postop"),
    general: care.filter((c) => c.phase === "general"),
  };

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
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Itinerary</h2>
          <Card>
            <ol className="space-y-4">
              {itinerary.map((event) => (
                <li key={event.id} className="flex gap-3">
                  <div className="w-24 shrink-0 text-xs text-muted">
                    {formatDateTime(event.starts_at)}
                  </div>
                  <div className="min-w-0 border-l border-secondary/50 pl-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-surface px-1.5 py-0.5 text-[11px] uppercase tracking-wide text-muted">
                        {event.kind}
                      </span>
                      <span className="font-medium">{event.title}</span>
                    </div>
                    {event.detail ? <p className="mt-1 text-sm text-ink/80">{event.detail}</p> : null}
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted">
                      {event.location ? <span>{event.location}</span> : null}
                      {event.confirmation_number ? <span>Conf# {event.confirmation_number}</span> : null}
                      {event.driver_name ? (
                        <span>
                          Driver: {event.driver_name}
                          {event.driver_phone ? ` (${event.driver_phone})` : ""}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
              {itinerary.length === 0 ? (
                <li className="text-sm text-muted">No itinerary on file.</li>
              ) : null}
            </ol>
          </Card>
        </section>

        <aside className="space-y-4">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Care instructions</h2>
            {(["preop", "postop", "general"] as const).map((phase) =>
              byPhase[phase].length > 0 ? (
                <Card key={phase}>
                  <h3 className="text-sm font-semibold">{humanize(phase)}</h3>
                  <ul className="mt-2 space-y-3">
                    {byPhase[phase].map((doc) => (
                      <CareRow key={doc.id} doc={doc} />
                    ))}
                  </ul>
                </Card>
              ) : null,
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Source documents</h2>
            <Card>
              <ul className="space-y-2 text-sm">
                {docs.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-2">
                    <a
                      href={`/source-docs/${doc.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      {doc.title}
                    </a>
                    <span className="shrink-0 text-xs text-muted">{humanize(doc.source_status)}</span>
                  </li>
                ))}
                {docs.length === 0 ? <li className="text-muted">No documents.</li> : null}
              </ul>
            </Card>
          </section>
        </aside>
      </div>
    </div>
  );
}
