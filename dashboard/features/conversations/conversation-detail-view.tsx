"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import { AutomationBadge } from "@/components/badges";
import { LoadingState, NotFoundCard, PageHeader } from "@/components/ui";
import { useDemoIdentity } from "@/features/demo/demo-identity";
import { ActivityLog } from "./activity-log";
import { ConciergeReplyBox } from "./concierge-reply-box";
import { ResumeAutomationButton } from "./escalation-actions";
import { FlagsPanel } from "./flags-panel";
import { MessageThread } from "./message-thread";
import { PatientSummaryCard } from "./patient-summary-card";
import { useConversationThread } from "./use-conversation-thread";

export function ConversationDetailView({ id }: { id: string }) {
  const { viewAs } = useDemoIdentity();
  const conversation = useQuery(api.queries.getConversation, { id, viewAs });
  const patient = useQuery(
    api.queries.getPatient,
    conversation ? { id: conversation.patient_id, viewAs } : "skip"
  );
  const messages = useQuery(api.queries.listMessages, {
    conversationId: id,
    viewAs,
  });
  const escalations = useQuery(api.queries.listEscalationsForConversation, {
    conversationId: id,
    viewAs,
  });
  const activity = useQuery(api.queries.listActivity, {
    conversationId: id,
    viewAs,
  });

  const msgs = messages ?? [];
  const escs = escalations ?? [];

  const { unansweredCount, openEscalation, draftSources } =
    useConversationThread(msgs, escs);

  if (conversation === undefined) {
    return <LoadingState message="Loading conversation…" />;
  }
  if (conversation === null) {
    return (
      <NotFoundCard
        backHref="/conversations"
        backLabel="All conversations"
        message="Conversation not found."
      />
    );
  }

  const canResume = conversation.automation_state !== "active";

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <AutomationBadge state={conversation.automation_state} />
            {patient ? (
              <Link
                className="focus-ring inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-control border border-border px-3 py-1.5 font-semibold text-ink text-xs transition-colors hover:border-secondary/70 hover:bg-surface"
                href={`/patients/${patient.id}`}
              >
                View profile
              </Link>
            ) : null}
            {canResume ? (
              <ResumeAutomationButton conversationId={conversation.id} />
            ) : null}
          </>
        }
        eyebrow={
          <Link
            className="text-primary text-sm hover:underline"
            href="/conversations"
          >
            ← All conversations
          </Link>
        }
        title={patient ? patient.name : "Unknown patient"}
      />

      <div className="grid h-[700px] min-h-0 gap-6 overflow-hidden lg:h-[calc(100vh-180px)] lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex h-full min-h-0 min-w-0 flex-col gap-4">
          <MessageThread messages={msgs} />
          <ConciergeReplyBox
            conversationId={conversation.id}
            sources={draftSources}
            suggestedReply={openEscalation?.suggested_reply ?? null}
          />
        </div>
        <aside className="min-h-0 space-y-4 lg:h-full lg:overflow-y-auto lg:pr-1">
          {patient ? <PatientSummaryCard patient={patient} /> : null}
          <FlagsPanel
            conversationId={conversation.id}
            escalations={escs}
            unansweredCount={unansweredCount}
          />
          <ActivityLog activity={activity ?? []} />
        </aside>
      </div>
    </div>
  );
}
