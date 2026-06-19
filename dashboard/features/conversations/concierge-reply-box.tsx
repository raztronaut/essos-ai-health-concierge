"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { sendConciergeReplyAction } from "@/lib/actions";

/**
 * Lets a concierge reply to the patient directly from the dashboard. The message
 * is queued for the transport to deliver to the patient's iMessage and marks the
 * thread as taken over so Eve stays paused. See decision 010.
 *
 * When Eve has drafted a source-grounded `suggestedReply` for an open escalation,
 * the textarea is prefilled with it (editable) so the concierge can review and
 * send in one tap. The draft is never delivered until a human submits. See ADR 011.
 */
export function ConciergeReplyBox({
  conversationId,
  suggestedReply,
  sources = [],
}: {
  conversationId: string;
  suggestedReply?: string | null;
  sources?: string[];
}) {
  const draft = suggestedReply?.trim() ?? "";
  const hasDraft = draft.length > 0;
  const [text, setText] = useState(draft);

  return (
    <Card>
      <form action={sendConciergeReplyAction} className="space-y-3">
        <input type="hidden" name="conversationId" value={conversationId} />
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="concierge-reply" className="block text-sm font-semibold text-ink">
            Reply to patient
          </label>
          {hasDraft ? (
            <span className="rounded-control bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              AI-suggested · review before sending
            </span>
          ) : null}
        </div>
        {hasDraft && sources.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted">Drafted from</span>
            {sources.map((source) => (
              <span
                key={source}
                className="rounded-full border border-border px-2 py-0.5 text-xs text-ink"
              >
                {source}
              </span>
            ))}
          </div>
        ) : null}
        <textarea
          id="concierge-reply"
          name="text"
          rows={hasDraft ? 5 : 3}
          required
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Type a message — it's delivered to the patient's iMessage and takes over the thread."
          className="focus-ring w-full resize-y rounded-control border border-border bg-surface px-3 py-2 text-sm text-ink transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] placeholder:text-muted hover:border-secondary/70"
        />
        <div className="flex items-center gap-2">
          <input
            type="text"
            name="agentName"
            aria-label="Your name"
            placeholder="Your name (signs the message)"
            className="focus-ring min-w-0 flex-1 rounded-control border border-border bg-surface px-3 py-1.5 text-sm text-ink transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] placeholder:text-muted hover:border-secondary/70"
          />
          {hasDraft && text.length > 0 ? (
            <Button type="button" variant="ghost" onClick={() => setText("")}>
              Clear draft
            </Button>
          ) : null}
          <Button type="submit" variant="primary">
            Send to patient
          </Button>
        </div>
      </form>
    </Card>
  );
}
