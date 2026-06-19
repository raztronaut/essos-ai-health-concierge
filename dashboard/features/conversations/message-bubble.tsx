import type { Message, MessageRole } from "@essos/shared";
import { formatDateTime, humanize } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/labels";

const ROLE_STYLES: Record<MessageRole, string> = {
  patient: "bg-card border border-secondary/60",
  agent: "bg-primary/10 border border-primary/30",
  concierge: "bg-med-soft border border-med/30",
  system: "bg-surface border border-secondary/40 text-muted italic",
};

export function MessageBubble({ message }: { message: Message }) {
  return (
    <div className={`rounded-card p-3.5 ${ROLE_STYLES[message.role]}`}>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted">
        <span className="font-semibold text-ink/80">
          {ROLE_LABEL[message.role]}
          {message.author_handle ? ` · ${message.author_handle}` : ""}
        </span>
        <span>{formatDateTime(message.created_at)}</span>
      </div>
      <p className="whitespace-pre-wrap text-sm">{message.text}</p>
      {message.category ? (
        <div className="mt-1.5 text-[11px] text-muted">{humanize(message.category)}</div>
      ) : null}
    </div>
  );
}
