import type { Patient } from "@essos/shared";
import { Card, DefinitionRow, DefinitionList } from "@/components/ui";
import { humanize } from "@/lib/format";

/** At-a-glance patient facts shown above the itinerary on the detail page. */
export function PatientProfileCard({ patient }: { patient: Patient }) {
  const rows: { label: string; value: string }[] = [
    { label: "Procedure", value: humanize(patient.procedure) },
    { label: "Clinic", value: patient.clinic_name || "—" },
    { label: "Hotel", value: patient.hotel_name || "—" },
    {
      label: "Destination",
      value: [patient.destination_city, patient.destination_country]
        .filter(Boolean)
        .join(", "),
    },
    { label: "Handle", value: patient.handle || "—" },
    { label: "Companion", value: patient.companion_name || "—" },
    { label: "Dietary notes", value: patient.dietary_notes || "—" },
  ];

  return (
    <Card>
      <DefinitionList>
        {rows.map((row) => (
          <DefinitionRow
            key={row.label}
            label={row.label}
            value={row.value}
            layout="vertical"
          />
        ))}
      </DefinitionList>
    </Card>
  );
}
