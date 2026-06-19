import { Button, Card } from "@/components/ui";
import { sendConciergeReplyAction } from "@/lib/actions";

/**
 * Lets a concierge reply to the patient directly from the dashboard. The message
 * is queued for the transport to deliver to the patient's iMessage and marks the
 * thread as taken over so Eve stays paused. See decision 010.
 */
export function ConciergeReplyBox({ conversationId }: { conversationId: string }) {
  return (
    <Card>
      <form action={sendConciergeReplyAction} className="space-y-3">
        <input type="hidden" name="conversationId" value={conversationId} />
        <label htmlFor="concierge-reply" className="block text-sm font-semibold text-ink">
          Reply to patient
        </label>
        <textarea
          id="concierge-reply"
          name="text"
          rows={3}
          required
          placeholder="Type a message — it's delivered to the patient's iMessage and takes over the thread."
          className="focus-ring w-full resize-y rounded-control border border-secondary/70 bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted"
        />
        <div className="flex items-center gap-2">
          <input
            type="text"
            name="agentName"
            aria-label="Your name"
            placeholder="Your name (signs the message)"
            className="focus-ring min-w-0 flex-1 rounded-control border border-secondary/70 bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-muted"
          />
          <Button type="submit" variant="primary">
            Send to patient
          </Button>
        </div>
      </form>
    </Card>
  );
}
