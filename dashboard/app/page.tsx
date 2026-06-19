import type { Metadata } from "next";
import Link from "next/link";
import {
  countActivityByEvent,
  countMessagesByRole,
  listConversations,
  listEscalations,
  listPatients,
} from "@essos/shared";
import { Card, LevelBadge, PageHeader, Stat } from "@/lib/ui";
import { formatDateTime, humanize } from "@/lib/format";
import { EscalationActions } from "./conversations/[id]/escalation-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Overview — Essos Concierge" };

export default function OverviewPage() {
  const patients = listPatients();
  const conversations = listConversations();
  const openEscalations = listEscalations("open");
  const allEscalations = listEscalations();
  const autonomousReplies = countMessagesByRole("agent");
  const escalatedTurns = countActivityByEvent("escalated");

  const patientsById = new Map(patients.map((p) => [p.id, p]));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        subtitle="What every Eve agent is doing across all patients, plus the live flag queue."
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Patients" value={patients.length} />
        <Stat label="Conversations" value={conversations.length} />
        <Stat
          label="Open flags"
          value={openEscalations.length}
          hint={`${allEscalations.length} total`}
        />
        <Stat
          label="Autonomous replies"
          value={autonomousReplies}
          hint={`${escalatedTurns} escalated`}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Escalation queue</h2>
        {openEscalations.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">
              No open flags. Eve is handling everything autonomously right now.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {openEscalations.map((esc) => {
              const patient = patientsById.get(esc.patient_id);
              return (
                <Card key={esc.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <LevelBadge level={esc.level} />
                        <span className="text-sm font-medium">{humanize(esc.reason)}</span>
                        <span className="text-xs text-muted">
                          {formatDateTime(esc.created_at)}
                        </span>
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
    </div>
  );
}
