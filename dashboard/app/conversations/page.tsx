import type { Metadata } from "next";
import { ConversationsView } from "@/features/conversations/conversations-view";

export const metadata: Metadata = { title: "Conversations — Essos Concierge" };

export default function ConversationsPage() {
  return <ConversationsView />;
}
