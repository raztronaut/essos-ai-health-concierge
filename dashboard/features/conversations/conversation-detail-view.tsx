"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { parseSuggestedReplySources } from "@essos/shared";
import { Card, PageHeader } from "@/components/ui";
import { AutomationBadge } from "@/components/badges";
import { MessageThread } from "./message-thread";
import { ConciergeReplyBox } from "./concierge-reply-box";
import { PatientSummaryCard } from "./patient-summary-card";
import { FlagsPanel } from "./flags-panel";
import { ActivityLog } from "./activity-log";
import { ResumeAutomationButton } from "./escalation-actions";

export function ConversationDetailView({ id }: { id: string }) {
  const conversation = useQuery(api.queries.getConversation, { id });
  const patient = useQuery(
    api.queries.getPatient,
    conversation ? { id: conversation.patient_id } : "skip",
  );
  const messages = useQuery(api.queries.listMessages, { conversationId: id });
  const escalations = useQuery(api.queries.listEscalationsForConversation, {
    conversationId: id,
  });
  const activity = useQuery(api.queries.listActivity, { conversationId: id });

  if (conversation === undefined) {
    return <p className="text-sm text-muted">Loading conversation…</p>;
  }
  if (conversation === null) {
    return (
      <Card>
        <p className="text-sm text-muted">Conversation not found.</p>
        <Link href="/conversations" className="mt-2 inline-block text-sm text-primary hover:underline">
          ← All conversations
        </Link>
      </Card>
    );
  }

  const msgs = messages ?? [];
  const escs = escalations ?? [];
  const canResume = conversation.automation_state !== "active";

  const lastRepliedIndex = msgs.findLastIndex(
    (m) => m.role === "agent" || m.role === "concierge",
  );
  const unansweredCount = msgs
    .slice(lastRepliedIndex + 1)
    .filter((m) => m.role === "patient").length;

  const openEscalation = escs.find((e) => e.status === "open") ?? null;
  const draftSources = parseSuggestedReplySources(openEscalation);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/conversations" className="text-sm text-primary hover:underline">
            ← All conversations
          </Link>
        }
        title={patient ? patient.name : "Unknown patient"}
        actions={
          <>
            <AutomationBadge state={conversation.automation_state} />
            {canResume ? <ResumeAutomationButton conversationId={conversation.id} /> : null}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <MessageThread messages={msgs} />
          <ConciergeReplyBox
            conversationId={conversation.id}
            suggestedReply={openEscalation?.suggested_reply ?? null}
            sources={draftSources}
          />
        </div>
        <aside className="space-y-4">
          {patient ? <PatientSummaryCard patient={patient} /> : null}
          <FlagsPanel
            escalations={escs}
            conversationId={conversation.id}
            unansweredCount={unansweredCount}
          />
          <ActivityLog activity={activity ?? []} />
        </aside>
      </div>
    </div>
  );
}
