import Link from "next/link";
import type { ConversationSummary } from "@essos/shared";
import { Card } from "@/components/ui";
import { AutomationBadge } from "@/components/badges";
import { formatDateTime } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/labels";

export function ConversationListItem({ conversation }: { conversation: ConversationSummary }) {
  const c = conversation;
  return (
    <Link href={`/conversations/${c.id}`}>
      <Card interactive>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{c.patient_name ?? "Unknown patient"}</span>
              <AutomationBadge state={c.automation_state} />
              {c.open_flags > 0 ? (
                <span className="rounded-pill bg-high-soft px-2 py-0.5 text-xs font-medium text-high">
                  {c.open_flags} open flag{c.open_flags > 1 ? "s" : ""}
                </span>
              ) : null}
              {c.open_flags > 0 && c.last_role === "patient" ? (
                <span className="rounded-pill bg-high-soft px-2 py-0.5 text-xs font-medium text-high">
                  patient waiting
                </span>
              ) : null}
            </div>
            {c.patient_procedure ? (
              <div className="mt-0.5 text-xs text-muted">
                {c.patient_procedure.replace(/_/g, " ")} · {c.patient_city}, {c.patient_country}
              </div>
            ) : null}
            {c.last_text ? (
              <p className="mt-2 truncate text-sm text-ink/80">
                <span className="font-medium">{c.last_role ? ROLE_LABEL[c.last_role] : "—"}:</span>{" "}
                {c.last_text}
              </p>
            ) : null}
          </div>
          <div className="shrink-0 text-xs text-muted">{formatDateTime(c.updated_at)}</div>
        </div>
      </Card>
    </Link>
  );
}
