"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Card, PageHeader } from "@/components/ui";
import { StaggerList } from "@/components/motion/stagger-list";
import { ConversationListItem } from "./conversation-list-item";

export function ConversationsView() {
  const conversations = useQuery(api.queries.listConversationSummaries);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conversations"
        subtitle="Every patient thread, most recently active first."
      />

      {conversations === undefined ? (
        <Card>
          <p className="text-sm text-muted">Loading conversations…</p>
        </Card>
      ) : conversations.length === 0 ? (
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
