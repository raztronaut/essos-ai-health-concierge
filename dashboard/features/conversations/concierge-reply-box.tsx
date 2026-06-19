"use client";

import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { useState } from "react";
import { Button, Card } from "@/components/ui";

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
  const [sending, setSending] = useState(false);
  const sendReply = useMutation(api.mutations.sendConciergeReply);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) {
      return;
    }
    setSending(true);
    try {
      await sendReply({ conversationId, text: trimmed });
      setText("");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <form className="space-y-3" onSubmit={onSubmit}>
        <div className="flex items-center justify-between gap-2">
          <label
            className="block font-semibold text-ink text-sm"
            htmlFor="concierge-reply"
          >
            Reply to patient
          </label>
          {hasDraft ? (
            <span className="rounded-control bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
              AI-suggested · review before sending
            </span>
          ) : null}
        </div>
        {hasDraft && sources.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted text-xs">Drafted from</span>
            {sources.map((source) => (
              <span
                className="rounded-full border border-border px-2 py-0.5 text-ink text-xs"
                key={source}
              >
                {source}
              </span>
            ))}
          </div>
        ) : null}
        <textarea
          className="focus-ring w-full resize-y rounded-control border border-border bg-surface px-3 py-2 text-ink text-sm transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] placeholder:text-muted hover:border-secondary/70"
          id="concierge-reply"
          name="text"
          onChange={(event) => setText(event.target.value)}
          placeholder="Type a message — it's delivered to the patient's iMessage and takes over the thread."
          required
          rows={hasDraft ? 5 : 3}
          value={text}
        />
        <div className="flex items-center justify-end gap-2">
          {hasDraft && text.length > 0 ? (
            <Button onClick={() => setText("")} type="button" variant="ghost">
              Clear draft
            </Button>
          ) : null}
          <Button
            disabled={sending || !text.trim()}
            type="submit"
            variant="primary"
          >
            {sending ? "Sending…" : "Send to patient"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
