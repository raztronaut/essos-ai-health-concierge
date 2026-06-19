import type { Patient } from "@essos/shared";
import Link from "next/link";
import { Card, DefinitionRow } from "@/components/ui";

export function PatientSummaryCard({ patient }: { patient: Patient }) {
  return (
    <Card>
      <h2 className="font-semibold text-sm">Patient</h2>
      <dl className="mt-2 space-y-1 text-sm">
        <DefinitionRow
          label="Procedure"
          value={patient.procedure.replace(/_/g, " ")}
        />
        <DefinitionRow
          label="Destination"
          value={`${patient.destination_city}, ${patient.destination_country}`}
        />
        <DefinitionRow label="Clinic" value={patient.clinic_name} />
        <DefinitionRow label="Hotel" value={patient.hotel_name} />
        {patient.companion_name ? (
          <DefinitionRow label="Companion" value={patient.companion_name} />
        ) : null}
        {patient.dietary_notes ? (
          <DefinitionRow label="Dietary" value={patient.dietary_notes} />
        ) : null}
      </dl>
      <Link
        className="mt-3 inline-block font-medium text-primary text-sm hover:underline"
        href={`/patients/${patient.id}`}
      >
        View itinerary & documents →
      </Link>
    </Card>
  );
}
