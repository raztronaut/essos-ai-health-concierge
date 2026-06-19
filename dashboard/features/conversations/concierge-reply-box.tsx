"use client";

import { useUser } from "@clerk/nextjs";
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { clerkEnabled } from "@/app/ConvexClientProvider";
import { Button, Card } from "@/components/ui";
import { useDemoIdentity } from "@/features/demo/demo-identity";

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
export function ConciergeReplyBox(props: {
  conversationId: string;
  suggestedReply?: string | null;
  sources?: string[];
}) {
  return clerkEnabled ? (
    <ClerkReplyBox {...props} />
  ) : (
    <DemoReplyBox {...props} clerkName="" />
  );
}

function ClerkReplyBox(props: {
  conversationId: string;
  suggestedReply?: string | null;
  sources?: string[];
}) {
  const { user } = useUser();
  return <DemoReplyBox {...props} clerkName={user?.firstName ?? ""} />;
}

/** Resolves the demo "view as" identity (name + viewAs) on top of the real user. */
function DemoReplyBox(props: {
  conversationId: string;
  suggestedReply?: string | null;
  sources?: string[];
  clerkName: string;
}) {
  const { viewAs, selected } = useDemoIdentity();
  const defaultName = selected
    ? (selected.name.split(" ")[0] ?? props.clerkName)
    : props.clerkName;
  return (
    <ConciergeReplyBoxInner
      conversationId={props.conversationId}
      defaultName={defaultName}
      sources={props.sources}
      suggestedReply={props.suggestedReply}
      viewAs={viewAs}
    />
  );
}

function ConciergeReplyBoxInner({
  conversationId,
  suggestedReply,
  sources = [],
  defaultName,
  viewAs,
}: {
  conversationId: string;
  suggestedReply?: string | null;
  sources?: string[];
  defaultName: string;
  viewAs: string | null;
}) {
  const draft = suggestedReply?.trim() ?? "";
  const hasDraft = draft.length > 0;
  const [text, setText] = useState(draft);
  const [name, setName] = useState(defaultName);
  const nameTouched = useRef(false);
  const [sending, setSending] = useState(false);
  const sendReply = useMutation(api.mutations.sendConciergeReply);

  // Prefill the name once the Clerk user resolves, unless the concierge typed.
  useEffect(() => {
    if (!nameTouched.current && defaultName) {
      setName(defaultName);
    }
  }, [defaultName]);

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
        <p className="text-[11px] text-muted">
          {name.trim()
            ? `Signs as “— ${name.trim()}, Essos Care Team”`
            : "Signs as “— Essos Care Team”"}
        </p>
        <div className="flex items-center gap-2">
          <input
            aria-label="Your name"
            className="focus-ring min-w-0 flex-1 rounded-control border border-border bg-surface px-3 py-1.5 text-ink text-sm transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] placeholder:text-muted hover:border-secondary/70"
            onChange={(event) => {
              nameTouched.current = true;
              setName(event.target.value);
            }}
            placeholder="Your name (signs the message)"
            type="text"
            value={name}
          />
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
