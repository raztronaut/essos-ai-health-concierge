import type { Metadata } from "next";
import { PatientsListView } from "@/features/patients/patients-list-view";

export const metadata: Metadata = { title: "Patients — Essos Concierge" };

export default function PatientsPage() {
  return <PatientsListView />;
}
