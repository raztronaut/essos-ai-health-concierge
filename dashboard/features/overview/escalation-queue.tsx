import Link from "next/link";
import type { Escalation, Patient } from "@essos/shared";
import { Card } from "@/components/ui";
import { LevelBadge } from "@/components/badges";
import { formatDateTime, humanize } from "@/lib/format";
import { EscalationActions } from "@/features/conversations/escalation-actions";

export function EscalationQueue({
  escalations,
  patients,
}: {
  escalations: Escalation[];
  patients: Patient[];
}) {
  const patientsById = new Map(patients.map((p) => [p.id, p]));

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Escalation queue</h2>
      {escalations.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            No open flags. Eve is handling everything autonomously right now.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {escalations.map((esc) => {
            const patient = patientsById.get(esc.patient_id);
            return (
              <Card key={esc.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <LevelBadge level={esc.level} />
                      <span className="text-sm font-medium">{humanize(esc.reason)}</span>
                      <span className="text-xs text-muted">{formatDateTime(esc.created_at)}</span>
                    </div>
                    <p className="mt-2 text-sm">{esc.summary}</p>
                    <Link
                      href={`/conversations/${esc.conversation_id}`}
                      className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
                    >
                      {patient ? patient.name : "Unknown patient"} → open thread
                    </Link>
                  </div>
                  <EscalationActions
                    escalationId={esc.id}
                    conversationId={esc.conversation_id}
                    status={esc.status}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
