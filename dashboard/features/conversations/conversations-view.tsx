"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { StaggerList } from "@/components/motion/stagger-list";
import { Card, PageHeader } from "@/components/ui";
import { ConversationListItem } from "./conversation-list-item";

export function ConversationsView() {
  const conversations = useQuery(api.queries.listConversationSummaries);

  return (
    <div className="space-y-6">
      <PageHeader
        subtitle="Every patient thread, most recently active first."
        title="Conversations"
      />

      {conversations === undefined ? (
        <Card>
          <p className="text-muted text-sm">Loading conversations…</p>
        </Card>
      ) : conversations.length === 0 ? (
        <Card>
          <p className="text-muted text-sm">No conversations yet.</p>
        </Card>
      ) : (
        <StaggerList className="space-y-3">
          {conversations.map((c) => (
            <ConversationListItem conversation={c} key={c.id} />
          ))}
        </StaggerList>
      )}
    </div>
  );
}
