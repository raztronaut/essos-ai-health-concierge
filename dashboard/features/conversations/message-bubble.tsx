import type { Message, MessageRole } from "@essos/shared";
import { formatDateTime, humanize } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/labels";
import { SparkleIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

type Side = "left" | "right" | "center";

const ROLE_SIDE: Record<MessageRole, Side> = {
  patient: "left",
  agent: "left",
  concierge: "right",
  system: "center",
};

/**
 * Build the bubble's corner radii so consecutive messages from one sender read
 * as a single connected run: the corner on the speaker's side that touches a
 * neighbouring bubble tightens, while the outer corners stay fully rounded.
 */
function bubbleRadius(
  side: Side,
  groupedWithPrev: boolean,
  groupedWithNext: boolean
): string {
  if (side === "center") {
    return "";
  }
  const corners = ["rounded-2xl"];
  if (side === "left") {
    corners.push(groupedWithPrev ? "rounded-tl-md" : "rounded-tl-2xl");
    corners.push(groupedWithNext ? "rounded-bl-md" : "rounded-bl-2xl");
  } else {
    corners.push(groupedWithPrev ? "rounded-tr-md" : "rounded-tr-2xl");
    corners.push(groupedWithNext ? "rounded-br-md" : "rounded-br-2xl");
  }
  return corners.join(" ");
}

export function MessageBubble({
  message,
  groupedWithPrev = false,
  groupedWithNext = false,
}: {
  message: Message;
  groupedWithPrev?: boolean;
  groupedWithNext?: boolean;
}) {
  const side = ROLE_SIDE[message.role];

  // System notes are quiet, centered chrome — no bubble, no header.
  if (side === "center") {
    return (
      <div
        className={cn(
          "flex justify-center px-4",
          groupedWithPrev ? "" : "mt-3"
        )}
      >
        <p className="text-balance text-center text-meta italic">
          {message.text}
        </p>
      </div>
    );
  }

  const isOutgoing = side === "right";
  const isEve = message.role === "agent";
  const showHeader = !groupedWithPrev;

  // S-Tier Component-Level CSS Custom Properties.
  // Completely decouples dynamic role-based theme mapping from complex JSX class strings.
  const bubbleStyle = {
    "--bubble-bg": message.role === "concierge"
      ? "var(--color-stone-90)"
      : message.role === "agent"
      ? "color-mix(in srgb, var(--color-stone-10) 45%, transparent)"
      : "var(--color-card)",
    "--bubble-border": message.role === "concierge"
      ? "transparent"
      : message.role === "agent"
      ? "color-mix(in srgb, var(--color-stone-20) 60%, transparent)"
      : "color-mix(in srgb, var(--color-border) 70%, transparent)",
    "--bubble-text": message.role === "concierge"
      ? "var(--color-pearl)"
      : "var(--color-ink)",
  } as React.CSSProperties;

  return (
    <div
      className={cn(
        "flex flex-col",
        isOutgoing ? "items-end" : "items-start",
        groupedWithPrev ? "" : "mt-3"
      )}
    >
      {showHeader ? (
        <div
          className={cn(
            "mb-1 flex items-center gap-1.5 px-1",
            isOutgoing && "flex-row-reverse"
          )}
        >
          <span className="flex items-center gap-1 font-medium text-ink/70 text-xs">
            {isEve ? <SparkleIcon className="size-3 text-stone-50" /> : null}
            {ROLE_LABEL[message.role]}
            {message.author_handle ? (
              <span className="text-meta">
                {message.author_handle}
              </span>
            ) : null}
          </span>
          <span className="text-meta tabular-nums">
            {formatDateTime(message.created_at)}
          </span>
        </div>
      ) : null}

      <div
        className={cn(
          "enter-fade max-w-[82%] px-3.5 py-2.5 border shadow-sm bg-[var(--bubble-bg)] border-[var(--bubble-border)] text-[var(--bubble-text)]",
          bubbleRadius(side, groupedWithPrev, groupedWithNext)
        )}
        style={bubbleStyle}
      >
        <p className="whitespace-pre-wrap text-pretty text-sm leading-relaxed">
          {message.text}
        </p>
        {message.category ? (
          <div
            className={cn(
              "mt-1.5 text-meta uppercase tracking-wide",
              isOutgoing ? "text-pearl/55" : "text-muted"
            )}
          >
            {humanize(message.category)}
          </div>
        ) : null}
      </div>
    </div>
  );
}
