import type { Metadata } from "next";
import Link from "next/link";
import { listConversationSummaries } from "@essos/shared";
import { AutomationBadge, Card, PageHeader, ROLE_LABEL } from "@/lib/ui";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Conversations — Essos Concierge" };

export default function ConversationsPage() {
  const conversations = listConversationSummaries();

  return (
    <div className="space-y-6">
      <PageHeader title="Conversations" subtitle="Every patient thread, most recently active first." />

      <div className="space-y-3">
        {conversations.map((c) => (
          <Link key={c.id} href={`/conversations/${c.id}`}>
            <Card className="transition hover:border-primary/60">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{c.patient_name ?? "Unknown patient"}</span>
                    <AutomationBadge state={c.automation_state} />
                    {c.open_flags > 0 ? (
                      <span className="rounded-full bg-high-soft px-2 py-0.5 text-xs font-medium text-high">
                        {c.open_flags} open flag{c.open_flags > 1 ? "s" : ""}
                      </span>
                    ) : null}
                  </div>
                  {c.patient_procedure ? (
                    <div className="mt-0.5 text-xs text-muted">
                      {c.patient_procedure.replace(/_/g, " ")} · {c.patient_city},{" "}
                      {c.patient_country}
                    </div>
                  ) : null}
                  {c.last_text ? (
                    <p className="mt-2 truncate text-sm text-ink/80">
                      <span className="font-medium">
                        {c.last_role ? ROLE_LABEL[c.last_role] : "—"}:
                      </span>{" "}
                      {c.last_text}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 text-xs text-muted">{formatDateTime(c.updated_at)}</div>
              </div>
            </Card>
          </Link>
        ))}
        {conversations.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">No conversations yet.</p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
