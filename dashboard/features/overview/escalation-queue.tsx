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
              <Card className="flex flex-col p-5" key={esc.id}>
                {/* Header: Patient Identity & Status Badges */}
                <div className="mb-3 flex items-center justify-between gap-3 border-border/40 border-b pb-3">
                  <div className="min-w-0">
                    {patient ? (
                      <Link
                        className="group flex flex-col"
                        href={`/patients/${patient.id}`}
                      >
                        <span className="font-semibold text-ink text-sm transition-colors duration-fast ease-out group-hover:text-primary group-hover:underline">
                          {patient.name}
                        </span>
                        <span className="mt-0.5 truncate text-muted text-xs">
                          {humanize(patient.procedure)} · {patient.clinic_name}
                        </span>
                      </Link>
                    ) : (
                      <span className="font-semibold text-ink text-sm">
                        Unknown patient
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <LevelBadge level={esc.level} />
                    <span
                      className={
                        breached
                          ? "rounded-control bg-high-soft px-2 py-0.5 font-medium text-high text-xs tabular-nums"
                          : "text-muted text-xs tabular-nums"
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
                </div>

                {/* Body: Escalation Reason & Summary */}
                <div className="mb-4 flex-1 space-y-1">
                  <h4 className="font-semibold text-ink text-sm">
                    {humanize(esc.reason)}
                  </h4>
                  <p className="text-muted text-sm leading-relaxed">
                    {esc.summary}
                  </p>
                </div>

                {/* Footer: Interactive Thread Link & Actions */}
                <div className="mt-1 flex items-center justify-between gap-3 border-border/40 border-t pt-3">
                  <Link
                    className="focus-ring inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-control bg-primary/5 px-3 py-1.5 font-semibold text-primary text-xs transition-[transform,background-color,opacity,box-shadow] duration-fast ease-out hover:bg-primary/10 active:scale-[0.96]"
                    href={`/conversations/${esc.conversation_id}`}
                  >
                    <svg
                      aria-hidden="true"
                      className="size-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>Open conversation thread</span>
                  </Link>
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
