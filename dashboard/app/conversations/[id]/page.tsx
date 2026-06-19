import type { Metadata } from "next";
import { ConversationDetailView } from "@/features/conversations/conversation-detail-view";

export const metadata: Metadata = { title: "Conversation — Essos Concierge" };

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ConversationDetailView id={id} />;
}
