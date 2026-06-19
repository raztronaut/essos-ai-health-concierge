import type { Metadata } from "next";
import { OverviewView } from "@/features/overview/overview-view";

export const metadata: Metadata = { title: "Overview — Essos Concierge" };

export default function OverviewPage() {
  return <OverviewView />;
}
