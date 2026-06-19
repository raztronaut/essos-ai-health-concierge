import type { Escalation, Patient } from "@essos/shared";
import Link from "next/link";
import { LevelBadge } from "@/components/badges";
import { StaggerList } from "@/components/motion/stagger-list";
import { Card } from "@/components/ui";
import { EscalationActions } from "@/features/conversations/escalation-actions";
import {
  formatRelativeTime,
  humanize,
  isSlaBreached,
  sortEscalationsByUrgency,
} from "@/lib/format";

export function EscalationQueue({
  escalations,
  patients,
}: {
  escalations: Escalation[];
  patients: Patient[];
}) {
  const patientsById = new Map(patients.map((p) => [p.id, p]));
  // Most urgent first: High before Med, then longest-waiting first.
  const queue = sortEscalationsByUrgency(escalations);
  const now = Date.now();

  return (
    <section className="space-y-3">
      <h2 className="text-balance font-semibold text-lg">Escalation queue</h2>
      {queue.length === 0 ? (
        <Card>
          <p className="text-pretty text-muted text-sm">
            No open flags. Eve is handling everything autonomously right now.
          </p>
        </Card>
      ) : (
        <StaggerList className="space-y-3">
          {queue.map((esc) => {
            const patient = patientsById.get(esc.patient_id);
            const breached = isSlaBreached(esc.level, esc.created_at, now);
            const hasDraft = Boolean(
              esc.suggested_reply && esc.suggested_reply.trim().length > 0
            );
            return (
              <Card key={esc.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <LevelBadge level={esc.level} />
                      <span className="font-medium text-sm">
                        {humanize(esc.reason)}
                      </span>
                      <span
                        className={
                          breached
                            ? "rounded-control bg-high-soft px-2 py-0.5 font-medium text-high text-xs"
                            : "text-muted text-xs"
                        }
                      >
                        waiting {formatRelativeTime(esc.created_at, now)}
                        {breached ? " · SLA" : ""}
                      </span>
                      {hasDraft ? (
                        <span className="rounded-control bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
                          AI draft ready
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm">{esc.summary}</p>
                    <Link
                      className="mt-2 inline-block font-medium text-primary text-sm hover:underline"
                      href={`/conversations/${esc.conversation_id}`}
                    >
                      {patient ? patient.name : "Unknown patient"} → open thread
                    </Link>
                  </div>
                  <EscalationActions
                    conversationId={esc.conversation_id}
                    escalationId={esc.id}
                    status={esc.status}
                  />
                </div>
              </Card>
            );
          })}
        </StaggerList>
      )}
    </section>
  );
}
