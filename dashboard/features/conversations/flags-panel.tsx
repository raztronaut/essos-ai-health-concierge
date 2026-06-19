import type { Escalation } from "@essos/shared";
import { Card } from "@/components/ui";
import { LevelBadge, StatusBadge } from "@/components/badges";
import { humanize } from "@/lib/format";
import { EscalationActions } from "./escalation-actions";

export function FlagsPanel({
  escalations,
  conversationId,
}: {
  escalations: Escalation[];
  conversationId: string;
}) {
  return (
    <Card>
      <h2 className="text-sm font-semibold">Flags</h2>
      {escalations.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No escalations on this thread.</p>
      ) : (
        <div className="mt-2 space-y-3">
          {escalations.map((esc) => (
            <div
              key={esc.id}
              className="border-t border-secondary/40 pt-3 first:border-t-0 first:pt-0"
            >
              <div className="flex items-center gap-2">
                <LevelBadge level={esc.level} />
                <StatusBadge status={esc.status} />
              </div>
              <div className="mt-1.5 text-xs font-medium">{humanize(esc.reason)}</div>
              <p className="mt-1 text-sm">{esc.summary}</p>
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
