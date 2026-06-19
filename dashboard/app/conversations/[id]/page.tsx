import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getConversationById,
  getPatientById,
  listActivity,
  listEscalationsForConversation,
  listMessages,
  type MessageRole,
} from "@essos/shared";
import { AutomationBadge, Card, LevelBadge, StatusBadge } from "@/lib/ui";
import { formatDateTime, humanize } from "@/lib/format";
import { EscalationActions, ResumeAutomationButton } from "./escalation-actions";

export const dynamic = "force-dynamic";

const ROLE_STYLES: Record<MessageRole, string> = {
  patient: "bg-card border border-secondary/60",
  agent: "bg-primary/10 border border-primary/30",
  concierge: "bg-med-soft border border-med/30",
  system: "bg-surface border border-secondary/40 text-muted italic",
};

const ROLE_LABEL: Record<MessageRole, string> = {
  patient: "Patient",
  agent: "Eve",
  concierge: "Concierge",
  system: "System",
};

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

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/conversations" className="text-sm text-primary hover:underline">
            ← All conversations
          </Link>
          <h1 className="serif mt-1 text-3xl">
            {patient ? patient.name : "Unknown patient"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <AutomationBadge state={conversation.automation_state} />
          {canResume ? <ResumeAutomationButton conversationId={conversation.id} /> : null}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-3">
          {messages.map((message) => (
            <div key={message.id} className={`rounded-[var(--radius-card)] p-3.5 ${ROLE_STYLES[message.role]}`}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted">
                <span className="font-semibold text-ink/80">
                  {ROLE_LABEL[message.role]}
                  {message.author_handle ? ` · ${message.author_handle}` : ""}
                </span>
                <span>{formatDateTime(message.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{message.text}</p>
              {message.category ? (
                <div className="mt-1.5 text-[11px] text-muted">{humanize(message.category)}</div>
              ) : null}
            </div>
          ))}
          {messages.length === 0 ? (
            <Card>
              <p className="text-sm text-muted">No messages yet.</p>
            </Card>
          ) : null}
        </section>

        <aside className="space-y-4">
          {patient ? (
            <Card>
              <h2 className="text-sm font-semibold">Patient</h2>
              <dl className="mt-2 space-y-1 text-sm">
                <Row label="Procedure" value={patient.procedure.replace(/_/g, " ")} />
                <Row label="Destination" value={`${patient.destination_city}, ${patient.destination_country}`} />
                <Row label="Clinic" value={patient.clinic_name} />
                <Row label="Hotel" value={patient.hotel_name} />
                {patient.companion_name ? <Row label="Companion" value={patient.companion_name} /> : null}
                {patient.dietary_notes ? <Row label="Dietary" value={patient.dietary_notes} /> : null}
              </dl>
              <Link
                href={`/patients/${patient.id}`}
                className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
              >
                View itinerary & documents →
              </Link>
            </Card>
          ) : null}

          <Card>
            <h2 className="text-sm font-semibold">Flags</h2>
            {escalations.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No escalations on this thread.</p>
            ) : (
              <div className="mt-2 space-y-3">
                {escalations.map((esc) => (
                  <div key={esc.id} className="border-t border-secondary/40 pt-3 first:border-t-0 first:pt-0">
                    <div className="flex items-center gap-2">
                      <LevelBadge level={esc.level} />
                      <StatusBadge status={esc.status} />
                    </div>
                    <div className="mt-1.5 text-xs font-medium">{humanize(esc.reason)}</div>
                    <p className="mt-1 text-sm">{esc.summary}</p>
                    <div className="mt-2">
                      <EscalationActions
                        escalationId={esc.id}
                        conversationId={conversation.id}
                        status={esc.status}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-sm font-semibold">Activity</h2>
            {activity.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No activity logged.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-xs">
                {activity.map((entry) => (
                  <li key={entry.id} className="flex justify-between gap-2">
                    <span>
                      <span className="font-semibold">{humanize(entry.event)}</span>
                      <span className="text-muted"> · {entry.actor}</span>
                      {entry.detail ? <span className="text-muted"> — {entry.detail}</span> : null}
                    </span>
                    <span className="shrink-0 text-muted">{formatDateTime(entry.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
