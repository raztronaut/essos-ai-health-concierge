import type { Metadata } from "next";
import { listConversationSummaries } from "@essos/shared";
import { Card, PageHeader } from "@/components/ui";
import { StaggerList } from "@/components/motion/stagger-list";
import { ConversationListItem } from "@/features/conversations/conversation-list-item";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Conversations — Essos Concierge" };

export default function ConversationsPage() {
  const conversations = listConversationSummaries();

  return (
    <div className="space-y-6">
      <PageHeader title="Conversations" subtitle="Every patient thread, most recently active first." />

      {conversations.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">No conversations yet.</p>
        </Card>
      ) : (
        <StaggerList className="space-y-3">
          {conversations.map((c) => (
            <ConversationListItem key={c.id} conversation={c} />
          ))}
        </StaggerList>
      )}
    </div>
  );
}
