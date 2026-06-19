import type { ActivityLogEntry } from "@essos/shared";
import { Card } from "@/components/ui";
import { formatDateTime, humanize } from "@/lib/format";

export function ActivityLog({ activity }: { activity: ActivityLogEntry[] }) {
  return (
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
  );
}
