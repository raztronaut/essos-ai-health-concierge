import Link from "next/link";
import {
  getPatientById,
  listConversations,
  listMessages,
  listOpenEscalationsForConversation,
} from "@essos/shared";
import { AutomationBadge, Card } from "@/lib/ui";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function ConversationsPage() {
  const conversations = listConversations();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="serif text-4xl">Conversations</h1>
        <p className="mt-1 text-sm text-muted">
          Every patient thread, most recently active first.
        </p>
      </header>

      <div className="space-y-3">
        {conversations.map((conversation) => {
          const patient = getPatientById(conversation.patient_id);
          const messages = listMessages(conversation.id);
          const last = messages[messages.length - 1];
          const openFlags = listOpenEscalationsForConversation(conversation.id);
          return (
            <Link key={conversation.id} href={`/conversations/${conversation.id}`}>
              <Card className="transition hover:border-primary/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {patient ? patient.name : "Unknown patient"}
                      </span>
                      <AutomationBadge state={conversation.automation_state} />
                      {openFlags.length > 0 ? (
                        <span className="rounded-full bg-high-soft px-2 py-0.5 text-xs font-medium text-high">
                          {openFlags.length} open flag
                          {openFlags.length > 1 ? "s" : ""}
                        </span>
                      ) : null}
                    </div>
                    {patient ? (
                      <div className="mt-0.5 text-xs text-muted">
                        {patient.procedure.replace(/_/g, " ")} ·{" "}
                        {patient.destination_city}, {patient.destination_country}
                      </div>
                    ) : null}
                    {last ? (
                      <p className="mt-2 truncate text-sm text-ink/80">
                        <span className="font-medium">{last.role}:</span> {last.text}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-xs text-muted">
                    {formatDateTime(conversation.updated_at)}
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
