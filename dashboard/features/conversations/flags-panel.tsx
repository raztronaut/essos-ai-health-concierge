import type { Escalation } from "@essos/shared";
import { Card } from "@/components/ui";
import { LevelBadge, StatusBadge } from "@/components/badges";
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
      <h2 className="text-sm font-semibold">Flags</h2>
      {unansweredCount > 0 ? (
        <p className="mt-2 rounded-control bg-high-soft px-2 py-1 text-xs font-medium text-high">
          {unansweredCount} patient message{unansweredCount > 1 ? "s" : ""} awaiting a reply
        </p>
      ) : null}
      {escalations.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No escalations on this thread.</p>
      ) : (
        <div className="mt-2 space-y-3">
          {escalations.map((esc) => (
            <div
              key={esc.id}
              className="border-t border-border pt-3 first:border-t-0 first:pt-0"
            >
              <div className="flex items-center gap-2">
                <LevelBadge level={esc.level} />
                <StatusBadge status={esc.status} />
                {esc.status === "open" ? (
                  <span className="text-xs text-muted">waiting {formatRelativeTime(esc.created_at)}</span>
                ) : null}
              </div>
              <div className="mt-1.5 text-xs font-medium">{humanize(esc.reason)}</div>
              <p className="mt-1 text-sm">{esc.summary}</p>
              {esc.status === "open" && esc.suggested_reply && esc.suggested_reply.trim() ? (
                <p className="mt-2 inline-block rounded-control bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  AI draft ready — review in the reply box below
                </p>
              ) : null}
              <div className="mt-2">
                <EscalationActions
                  escalationId={esc.id}
                  conversationId={conversationId}
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
