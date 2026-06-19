import type { EscalationStatus } from "@essos/shared";
import {
  resolveEscalationAction,
  resumeAutomationAction,
  takeOverConversationAction,
} from "@/app/actions";

const baseBtn =
  "rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50";
const primaryBtn = `${baseBtn} bg-primary text-white hover:opacity-90`;
const ghostBtn = `${baseBtn} border border-secondary/70 text-ink hover:bg-surface`;
const okBtn = `${baseBtn} bg-ok text-white hover:opacity-90`;

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
          <button type="submit" className={ghostBtn}>
            Take over
          </button>
        </form>
      ) : null}
      {status !== "resolved" ? (
        <form action={resolveEscalationAction}>
          <input type="hidden" name="escalationId" value={escalationId} />
          <input type="hidden" name="conversationId" value={conversationId} />
          <button type="submit" className={okBtn}>
            Resolve
          </button>
        </form>
      ) : null}
    </div>
  );
}

/** Resume Eve automation on a paused / taken-over thread. */
export function ResumeAutomationButton({
  conversationId,
}: {
  conversationId: string;
}) {
  return (
    <form action={resumeAutomationAction}>
      <input type="hidden" name="conversationId" value={conversationId} />
      <button type="submit" className={primaryBtn}>
        Resume Eve
      </button>
    </form>
  );
}
