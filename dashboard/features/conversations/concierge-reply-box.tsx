"use client";

import { api } from "@convex/_generated/api";
import type { EscalationStatus } from "@essos/shared";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { TextMorph } from "torph/react";
import { DocIcon } from "@/components/icons";
import { BorderBeam } from "@/components/motion/border-beam";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { HandoffActionBar } from "./escalation-actions";
import { useConciergeSignature } from "./use-concierge-signature";

type AutomationState =
  | "active"
  | "paused_for_review"
  | "taken_over"
  | "resolved";

/**
 * Lets a concierge reply to the patient directly from the dashboard. The message
 * is queued for the transport to deliver to the patient's iMessage and marks the
 * thread as taken over so Eve stays paused. See decision 010.
 *
 * The reply is signed before delivery: a named agent signs
 * "— {name}, Essos Care Team"; an unsigned reply falls back to "— Essos Care
 * Team". The name field is prefilled with the signed-in concierge's first name.
 *
 * When Eve has drafted a source-grounded `suggestedReply` for an open escalation,
 * the textarea is prefilled with it (editable) so the concierge can review and
 * send in one tap. The draft is never delivered until a human submits. See ADR 011.
 */
export function ConciergeReplyBox({
  conversationId,
  suggestedReply,
  sources = [],
  automationState,
  openEscalationId = null,
  openEscalationStatus = null,
}: {
  conversationId: string;
  suggestedReply?: string | null;
  sources?: string[];
  automationState: AutomationState;
  openEscalationId?: string | null;
  openEscalationStatus?: EscalationStatus | null;
}) {
  const { defaultName, viewAs } = useConciergeSignature();
  const draft = suggestedReply?.trim() ?? "";
  const hasDraft = draft.length > 0;
  const [text, setText] = useState(draft);
  // Track only the concierge's own edit (null = untouched). The displayed name
  // is derived during render, so it shows `defaultName` as soon as Clerk
  // resolves without an effect — and the typed value takes over once edited.
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const name = nameOverride ?? defaultName;
  const [sending, setSending] = useState(false);
  const [textareaFocused, setTextareaFocused] = useState(false);
  const sendReply = useMutation(api.mutations.sendConciergeReply);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) {
      return;
    }
    setSending(true);
    try {
      await sendReply({
        conversationId,
        text: trimmed,
        agentName: name.trim(),
        viewAs,
      });
      setText("");
      toast.success("Reply delivered to patient");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Reply didn’t send — try again"
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      className={cn(
        "relative overflow-hidden rounded-card bg-card shadow-border transition-all duration-fast ease-out",
        textareaFocused &&
          "shadow-[0_0_0_1px_var(--color-stone-50),0_4px_12px_rgba(0,0,0,0.05)]"
      )}
      onSubmit={onSubmit}
    >
      {hasDraft ? (
        <BorderBeam radius={12} size={220} strength={0.5} tone="colorful" />
      ) : null}
      <HandoffActionBar
        automationState={automationState}
        conversationId={conversationId}
        openEscalationId={openEscalationId}
        openEscalationStatus={openEscalationStatus}
      />
      <div className="flex items-center justify-between gap-2 px-4 pt-3.5">
        <label
          className="block font-semibold text-ink text-sm"
          htmlFor="concierge-reply"
        >
          Reply to patient
        </label>
        {hasDraft ? (
          <span className="inline-flex items-center gap-1 rounded-pill bg-stone-10/60 px-2 py-0.5 font-medium text-[11px] text-stone-70">
            <span className="size-1.5 rounded-full bg-stone-50" />
            AI-suggested · review before sending
          </span>
        ) : null}
      </div>

      {hasDraft && sources.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 px-4">
          <span className="text-[11px] text-muted">Drafted from</span>
          {sources.map((source) => (
            <span
              className="inline-flex max-w-full items-center gap-1 rounded-pill border border-border bg-surface/60 px-2 py-0.5 text-[11px] text-ink"
              key={source}
            >
              <DocIcon className="size-3 shrink-0 text-muted" />
              <span className="truncate">{source}</span>
            </span>
          ))}
        </div>
      ) : null}

      <textarea
        className="mt-1.5 w-full resize-y bg-transparent px-4 py-2 text-ink text-sm leading-relaxed outline-none placeholder:text-muted"
        id="concierge-reply"
        name="text"
        onBlur={() => setTextareaFocused(false)}
        onChange={(event) => setText(event.target.value)}
        onFocus={() => setTextareaFocused(true)}
        placeholder="Type a message — it's delivered to the patient's iMessage and takes over the thread."
        required
        rows={hasDraft ? 5 : 3}
        value={text}
      />

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-b-[11px] border-border border-t bg-surface/40 px-3 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <input
            aria-label="Your name"
            className="focus-ring min-w-0 max-w-[12rem] flex-1 rounded-control border border-border bg-card px-2.5 py-1 text-ink text-xs outline-none transition-colors duration-fast ease-out placeholder:text-muted hover:border-secondary/70 focus:border-secondary/70"
            id="signature-name"
            name="agentName"
            onChange={(event) => setNameOverride(event.target.value)}
            placeholder="Your name"
            type="text"
            value={name}
          />
          <p className="truncate text-[11px] text-muted">
            <TextMorph>
              {name.trim()
                ? `Signs “— ${name.trim()}, Essos Care Team”`
                : "Signs “— Essos Care Team”"}
            </TextMorph>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
      </div>
    </form>
  );
}
