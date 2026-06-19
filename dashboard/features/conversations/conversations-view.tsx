"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { StaggerList } from "@/components/motion/stagger-list";
import { Card, PageHeader } from "@/components/ui";
import { useDemoIdentity } from "@/features/demo/demo-identity";
import { ConversationListItem } from "./conversation-list-item";

export function ConversationsView() {
  const { viewAs, effectiveId, concierges } = useDemoIdentity();
  const conversations = useQuery(api.queries.listConversationSummaries, {
    viewAs,
  });
  const [mineOnly, setMineOnly] = useState(false);

  const names = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of concierges) {
      map[c.clerkId] = c.name;
    }
    return map;
  }, [concierges]);

  const visible = useMemo(() => {
    if (!(conversations && mineOnly && effectiveId)) {
      return conversations;
    }
    return conversations.filter((c) => c.assignee_user_id === effectiveId);
  }, [conversations, mineOnly, effectiveId]);

  return (
    <div className="space-y-6">
      <PageHeader
        subtitle="Every patient thread, most recently active first."
        title="Conversations"
      />

      {effectiveId ? (
        <label className="flex items-center gap-2 text-muted text-sm">
          <input
            checked={mineOnly}
            className="focus-ring"
            onChange={(e) => setMineOnly(e.target.checked)}
            type="checkbox"
          />
          Mine only
        </label>
      ) : null}

      {visible === undefined ? (
        <Card>
          <p className="text-muted text-sm">Loading conversations…</p>
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <p className="text-muted text-sm">No conversations in this view.</p>
        </Card>
      ) : (
        <StaggerList className="space-y-3">
          {visible.map((c) => (
            <ConversationListItem
              conversation={c}
              key={c.id}
              ownerName={
                c.assignee_user_id ? (names[c.assignee_user_id] ?? null) : null
              }
            />
          ))}
        </StaggerList>
      )}
    </div>
  );
}
