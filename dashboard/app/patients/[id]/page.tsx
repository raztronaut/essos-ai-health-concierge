import type { Metadata } from "next";
import { PatientDetailView } from "@/features/patients/patient-detail-view";

export const metadata: Metadata = { title: "Patient — Essos Concierge" };

export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PatientDetailView id={id} />;
}
