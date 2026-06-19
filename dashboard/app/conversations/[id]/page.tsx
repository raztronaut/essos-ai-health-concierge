import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getConversationById,
  getPatientById,
  listActivity,
  listEscalationsForConversation,
  listMessages,
  parseSuggestedReplySources,
} from "@essos/shared";
import { PageHeader } from "@/components/ui";
import { AutomationBadge } from "@/components/badges";
import { MessageThread } from "@/features/conversations/message-thread";
import { ConciergeReplyBox } from "@/features/conversations/concierge-reply-box";
import { PatientSummaryCard } from "@/features/conversations/patient-summary-card";
import { FlagsPanel } from "@/features/conversations/flags-panel";
import { ActivityLog } from "@/features/conversations/activity-log";
import { ResumeAutomationButton } from "@/features/conversations/escalation-actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const conversation = getConversationById(id);
  const patient = conversation ? getPatientById(conversation.patient_id) : null;
  const who = patient?.name ?? "Conversation";
  return { title: `${who} — Essos Concierge` };
}

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const conversation = getConversationById(id);
  if (!conversation) notFound();

  const patient = getPatientById(conversation.patient_id);
  const messages = listMessages(conversation.id);
  const escalations = listEscalationsForConversation(conversation.id);
  const activity = listActivity(conversation.id);
  const canResume = conversation.automation_state !== "active";

  // Patient messages received since the last agent/concierge reply — the
  // concierge's "someone is waiting on you" signal.
  const lastRepliedIndex = messages.findLastIndex(
    (m) => m.role === "agent" || m.role === "concierge",
  );
  const unansweredCount = messages
    .slice(lastRepliedIndex + 1)
    .filter((m) => m.role === "patient").length;

  // The most recent open escalation's AI draft prefills the reply box so the
  // concierge can review and send in one tap (escalations are newest-first).
  const openEscalation = escalations.find((e) => e.status === "open") ?? null;
  const draftSources = openEscalation ? parseSuggestedReplySources(openEscalation) : [];

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
          <MessageThread messages={messages} />
          <ConciergeReplyBox
            conversationId={conversation.id}
            suggestedReply={openEscalation?.suggested_reply ?? null}
            sources={draftSources}
          />
        </div>
        <aside className="space-y-4">
          {patient ? <PatientSummaryCard patient={patient} /> : null}
          <FlagsPanel
            escalations={escalations}
            conversationId={conversation.id}
            unansweredCount={unansweredCount}
          />
          <ActivityLog activity={activity} />
        </aside>
      </div>
    </div>
  );
}
