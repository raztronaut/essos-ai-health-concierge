import type { Escalation } from "@essos/shared";
import { LevelBadge, StatusBadge } from "@/components/badges";
import { SparkleIcon } from "@/components/icons";
import { Card } from "@/components/ui";
import { cn } from "@/lib/cn";
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
  const openCount = escalations.filter((esc) => esc.status === "open").length;

  return (
    <Card className="flex flex-col gap-4">
      {/* Header Area */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-ink text-sm">Flags</h2>
          {openCount > 0 ? (
            <span className="inline-flex items-center justify-center rounded-full bg-high px-1.5 py-0.5 font-bold text-[10px] text-pearl tabular-nums leading-none">
              {openCount}
            </span>
          ) : null}
        </div>
      </div>

      {/* Unanswered Messages Alert Banner */}
      {unansweredCount > 0 ? (
        <div className="flex items-center gap-2.5 rounded-control border border-high/10 bg-high-soft/50 px-3 py-2 font-medium text-high text-xs tabular-nums">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-high opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-high" />
          </span>
          <span>
            {unansweredCount} patient message{unansweredCount > 1 ? "s" : ""}{" "}
            awaiting a reply
          </span>
        </div>
      ) : null}

      {/* Escalations List */}
      {escalations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-control border border-border/60 border-dashed py-6 text-center">
          <svg
            aria-hidden="true"
            className="size-5 text-muted/60"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
          >
            <path
              d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="mt-1.5 font-medium text-muted text-xs">
            No active flags
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {escalations.map((esc) => {
            const isOpen = esc.status === "open";
            return (
              <div
                className={cn(
                  "rounded-control border p-3.5 transition-all duration-base ease-out",
                  isOpen
                    ? "border-border bg-surface/25 shadow-sm"
                    : "border-border/60 bg-surface/10 opacity-65"
                )}
                key={esc.id}
              >
                {/* Meta Row: Badges & Timestamp */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <LevelBadge level={esc.level} />
                    <StatusBadge status={esc.status} />
                  </div>
                  <span className="text-meta text-muted">
                    {isOpen ? "waiting " : "resolved "}
                    {formatRelativeTime(
                      isOpen
                        ? esc.created_at
                        : (esc.resolved_at ?? esc.created_at)
                    )}
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="mt-2.5 font-semibold text-ink text-sm tracking-tight">
                  {humanize(esc.reason)}
                </h3>
                <p className="mt-1 text-muted text-xs leading-relaxed">
                  {esc.summary}
                </p>

                {/* AI Draft Ready Badge */}
                {isOpen && esc.suggested_reply?.trim() ? (
                  <div className="mt-3 flex items-center gap-1.5 rounded-control border border-primary/10 bg-primary/5 px-2.5 py-1 font-medium text-primary text-xs">
                    <SparkleIcon className="size-3.5 shrink-0 animate-pulse text-primary" />
                    <span>AI draft ready — review in the reply box below</span>
                  </div>
                ) : null}

                {/* Footer Actions */}
                {isOpen ? (
                  <div className="mt-3.5 flex items-center justify-end gap-2 border-border/40 border-t pt-3">
                    <EscalationActions
                      conversationId={conversationId}
                      escalationId={esc.id}
                      size="sm"
                      status={esc.status}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
