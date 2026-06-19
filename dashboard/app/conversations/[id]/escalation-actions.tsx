import type { EscalationStatus } from "@essos/shared";
import { Button } from "@/lib/ui";
import {
  resolveEscalationAction,
  resumeAutomationAction,
  takeOverConversationAction,
} from "@/app/actions";

/** Take-over / resolve actions for a single escalation (queue + thread). */
export function EscalationActions({
  escalationId,
  conversationId,
  status,
}: {
  escalationId: string;
  conversationId: string;
  status: EscalationStatus;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {status === "open" ? (
        <form action={takeOverConversationAction}>
          <input type="hidden" name="conversationId" value={conversationId} />
          <Button type="submit" variant="ghost">
            Take over
          </Button>
        </form>
      ) : null}
      {status !== "resolved" ? (
        <form action={resolveEscalationAction}>
          <input type="hidden" name="escalationId" value={escalationId} />
          <input type="hidden" name="conversationId" value={conversationId} />
          <Button type="submit" variant="ok">
            Resolve
          </Button>
        </form>
      ) : null}
    </div>
  );
}

/** Resume Eve automation on a paused / taken-over thread. */
export function ResumeAutomationButton({ conversationId }: { conversationId: string }) {
  return (
    <form action={resumeAutomationAction}>
      <input type="hidden" name="conversationId" value={conversationId} />
      <Button type="submit" variant="primary">
        Resume Eve
      </Button>
    </form>
  );
}
