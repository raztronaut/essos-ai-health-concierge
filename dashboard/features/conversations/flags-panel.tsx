import type { Escalation } from "@essos/shared";
import { LevelBadge, StatusBadge } from "@/components/badges";
import { Card } from "@/components/ui";
import { formatRelativeTime, humanize } from "@/lib/format";
import { EscalationActions } from "./escalation-actions";

export function FlagsPanel({
  escalations,
  conversationId,
  unansweredCount = 0,
}: {
  escalations: Escalation[];
  conversationId: string;
  /** Patient messages received since the last agent/concierge reply. */
  unansweredCount?: number;
}) {
  return (
    <Card>
      <h2 className="font-semibold text-sm">Flags</h2>
      {unansweredCount > 0 ? (
        <p className="mt-2 rounded-control bg-high-soft px-2 py-1 font-medium text-high text-xs">
          {unansweredCount} patient message{unansweredCount > 1 ? "s" : ""}{" "}
          awaiting a reply
        </p>
      ) : null}
      {escalations.length === 0 ? (
        <p className="mt-2 text-muted text-sm">
          No escalations on this thread.
        </p>
      ) : (
        <div className="mt-2 space-y-3">
          {escalations.map((esc) => (
            <div
              className="border-border border-t pt-3 first:border-t-0 first:pt-0"
              key={esc.id}
            >
              <div className="flex items-center gap-2">
                <LevelBadge level={esc.level} />
                <StatusBadge status={esc.status} />
                {esc.status === "open" ? (
                  <span className="text-muted text-xs">
                    waiting {formatRelativeTime(esc.created_at)}
                  </span>
                ) : null}
              </div>
              <div className="mt-1.5 font-medium text-xs">
                {humanize(esc.reason)}
              </div>
              <p className="mt-1 text-sm">{esc.summary}</p>
              {esc.status === "open" &&
              esc.suggested_reply &&
              esc.suggested_reply.trim() ? (
                <p className="mt-2 inline-block rounded-control bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
                  AI draft ready — review in the reply box below
                </p>
              ) : null}
              <div className="mt-2">
                <EscalationActions
                  conversationId={conversationId}
                  escalationId={esc.id}
                  status={esc.status}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
