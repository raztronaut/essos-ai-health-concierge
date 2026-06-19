"use client";

import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Button,
  ConfirmDialog,
  LoadingState,
  NotFoundCard,
  PageHeader,
} from "@/components/ui";
import { useDemoIdentity } from "@/features/demo/demo-identity";
import { AssignControl } from "./assign-control";
import { CareInstructions } from "./care-instructions";
import { ItineraryTimeline } from "./itinerary-timeline";
import { PatientFormDialog } from "./patient-form-dialog";
import { PatientProfileCard } from "./patient-profile-card";
import { SourceDocuments } from "./source-documents";

export function PatientDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { viewAs } = useDemoIdentity();
  const patient = useQuery(api.queries.getPatient, { id, viewAs });
  const itinerary = useQuery(api.queries.listItinerary, {
    patientId: id,
    viewAs,
  });
  const care = useQuery(api.queries.listCareInstructions, {
    patientId: id,
    viewAs,
  });
  const docs = useQuery(api.queries.listSourceDocumentsForPatient, {
    patientId: id,
    viewAs,
  });
  const conversation = useQuery(api.queries.getConversationForPatient, {
    patientId: id,
    viewAs,
  });
  const removePatient = useMutation(api.mutations.deletePatient);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (patient === undefined) {
    return <LoadingState message="Loading patient…" />;
  }
  if (patient === null) {
    return (
      <NotFoundCard
        backHref="/patients"
        backLabel="Patients"
        message="Patient not found."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            {conversation ? (
              <Link
                className="focus-ring inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-control border border-border px-3 py-1.5 font-semibold text-ink text-xs transition-colors hover:border-secondary/70 hover:bg-surface"
                href={`/conversations/${conversation.id}`}
              >
                View conversation
              </Link>
            ) : null}
            <Button onClick={() => setEditing(true)} variant="ghost">
              Edit
            </Button>
            <Button onClick={() => setDeleting(true)} variant="danger">
              Delete
            </Button>
          </>
        }
        eyebrow={
          <Link
            className="text-primary text-sm hover:underline"
            href="/patients"
          >
            ← Patients
          </Link>
        }
        subtitle={`${patient.procedure.replace(/_/g, " ")} · ${patient.clinic_name} · ${patient.destination_city}, ${patient.destination_country}`}
        title={patient.name}
      />

      <PatientProfileCard patient={patient} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <ItineraryTimeline itinerary={itinerary ?? []} patientId={patient.id} />
        <aside className="space-y-6">
          <AssignControl
            assigneeUserId={patient.assignee_user_id ?? null}
            patientId={patient.id}
          />
          <SourceDocuments docs={docs ?? []} patientId={patient.id} />
        </aside>
      </div>

      <CareInstructions
        care={care ?? []}
        patientId={patient.id}
        patientProcedure={patient.procedure}
      />

      {editing ? (
        <PatientFormDialog
          onClose={() => setEditing(false)}
          open={true}
          patient={patient}
        />
      ) : null}
      {deleting ? (
        <ConfirmDialog
          confirmLabel="Delete patient"
          description={`Permanently delete ${patient.name} and all itinerary, care, and uploaded documents? Patients with conversations cannot be deleted.`}
          onClose={() => setDeleting(false)}
          onConfirm={async () => {
            await removePatient({ patientId: patient.id, viewAs });
            router.push("/patients");
          }}
          open={true}
          title="Delete patient"
        />
      ) : null}
    </div>
  );
}
