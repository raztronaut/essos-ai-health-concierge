import type { Patient, SourceDocument } from "@essos/shared";
import { Card, DefinitionList, DefinitionRow } from "@/components/ui";
import { useDemoIdentity } from "@/features/demo/demo-identity";
import { humanize } from "@/lib/format";
import { SourceDocuments } from "./source-documents";

/** At-a-glance patient facts shown above the itinerary on the detail page. */
export function PatientProfileCard({
  patient,
  docs,
}: {
  patient: Patient;
  docs: SourceDocument[];
}) {
  const { concierges } = useDemoIdentity();
  const ownerName =
    concierges.find((c) => c.clerkId === patient.assignee_user_id)?.name ??
    (patient.assignee_user_id ? "Assigned" : "Unassigned");

  const associatedNames = (patient.associated_user_ids ?? [])
    .map((id) => concierges.find((c) => c.clerkId === id)?.name)
    .filter(Boolean)
    .join(", ");

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
    { label: "Owner", value: ownerName },
    { label: "Associated concierges", value: associatedNames || "—" },
  ];

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid grid-cols-1 divide-y divide-border/40 md:grid-cols-3 md:divide-x md:divide-y-0">
        {/* Left Section: Patient Details */}
        <div className="p-5 md:col-span-2">
          <DefinitionList className="lg:grid-cols-2">
            {rows.map((row) => (
              <DefinitionRow
                key={row.label}
                label={row.label}
                layout="vertical"
                value={row.value}
              />
            ))}
          </DefinitionList>
        </div>

        {/* Right Section: Source Documents */}
        <div className="bg-surface/15 p-5 md:col-span-1">
          <SourceDocuments docs={docs} minimal={true} patientId={patient.id} />
        </div>
      </div>
    </Card>
  );
}
