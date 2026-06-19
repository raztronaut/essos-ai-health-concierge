import type { SlackOutbox } from "@essos/shared";
import {
  getEscalationCard,
  getSlackLinkByConversation,
  listPendingSlackOutbox,
  markSlackOutboxPosted,
  upsertSlackLink,
} from "@essos/shared";
import type { App } from "@slack/bolt";
import {
  activityText,
  escalationBlocks,
  escalationFallbackText,
  patientMessageText,
} from "./blocks.js";
import { debug } from "./debug.js";
import {
  DASHBOARD_URL,
  SLACK_ACTIVITY_CHANNEL_ID,
  SLACK_BOT_TOKEN,
  SLACK_ESCALATION_CHANNEL_ID,
} from "./env.js";

/** How often the bridge drains Slack posts queued by Convex. */
const POLL_INTERVAL_MS = 3000;

async function deliverEscalation(
  app: App,
  row: SlackOutbox,
  channel: string
): Promise<void> {
  if (!row.escalation_id) {
    await markSlackOutboxPosted(row.id, "");
    return;
  }
  const card = await getEscalationCard(row.escalation_id);
  if (!card) {
    debug("outbox", "no escalation for", row.id, "- dropping");
    await markSlackOutboxPosted(row.id, "");
    return;
  }
  const res = await app.client.chat.postMessage({
    token: SLACK_BOT_TOKEN ?? undefined,
    channel,
    text: escalationFallbackText(card),
    blocks: escalationBlocks(card, DASHBOARD_URL),
  });
  const ts = typeof res.ts === "string" ? res.ts : "";
  if (ts) {
    await upsertSlackLink({
      conversationId: row.conversation_id,
      escalationId: row.escalation_id,
      channelId: channel,
      threadTs: ts,
    });
  }
  await markSlackOutboxPosted(row.id, ts);
}

async function deliverThreaded(app: App, row: SlackOutbox): Promise<string> {
  const link = await getSlackLinkByConversation(row.conversation_id);
  if (!link) {
    // No thread yet (escalation not posted) — drop so it doesn't pile up.
    return "";
  }
  const payload = parsePayload(row.payload_json);
  const text =
    row.kind === "activity"
      ? activityText(
          String(payload.event ?? ""),
          String(payload.actor ?? "concierge"),
          payload.detail == null ? null : String(payload.detail)
        )
      : patientMessageText(
          String(payload.text ?? ""),
          payload.authorHandle == null ? null : String(payload.authorHandle)
        );
  const res = await app.client.chat.postMessage({
    token: SLACK_BOT_TOKEN ?? undefined,
    channel: link.channel_id,
    thread_ts: link.thread_ts,
    text,
  });
  return typeof res.ts === "string" ? res.ts : "";
}

async function mirrorActivityFeed(app: App, row: SlackOutbox): Promise<void> {
  if (row.kind !== "activity" || !SLACK_ACTIVITY_CHANNEL_ID) {
    return;
  }
  const payload = parsePayload(row.payload_json);
  const text = [
    activityText(
      String(payload.event ?? ""),
      String(payload.actor ?? "concierge"),
      payload.detail == null ? null : String(payload.detail)
    ),
    `Conversation: \`${row.conversation_id}\``,
    `<${DASHBOARD_URL}/conversations/${row.conversation_id}|Open in dashboard>`,
  ].join("\n");
  await app.client.chat.postMessage({
    token: SLACK_BOT_TOKEN ?? undefined,
    channel: SLACK_ACTIVITY_CHANNEL_ID,
    text,
  });
}

function parsePayload(raw: string | null): Record<string, unknown> {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

async function drainPendingOutbox(app: App): Promise<void> {
  const channel = SLACK_ESCALATION_CHANNEL_ID;
  if (!channel) {
    return;
  }
  const pending = await listPendingSlackOutbox();
  for (const row of pending) {
    try {
      switch (row.kind) {
        case "escalation":
          await deliverEscalation(app, row, channel);
          break;
        case "activity":
        case "patient_message":
          await markSlackOutboxPosted(row.id, await deliverThreaded(app, row));
          await mirrorActivityFeed(app, row).catch((err) =>
            debug("outbox", "activity feed failed for", row.id, String(err))
          );
          break;
        default: {
          const exhaustive: never = row.kind;
          throw new Error(`Unknown slack outbox kind: ${String(exhaustive)}`);
        }
      }
    } catch (err) {
      // Leave pending for the next tick (at-least-once delivery).
      debug("outbox", "deliver failed for", row.id, String(err));
    }
  }
}

/** Start the Slack outbox poll loop. Returns a stop function; ticks never overlap. */
export function startOutboxLoop(app: App): () => void {
  let running = false;
  const timer = setInterval(() => {
    if (running) {
      return;
    }
    running = true;
    void drainPendingOutbox(app)
      .catch((err) => debug("outbox", "drain error", String(err)))
      .finally(() => {
        running = false;
      });
  }, POLL_INTERVAL_MS);
  timer.unref?.();
  return () => clearInterval(timer);
}
