import type { ConciergeIdentity, Patient } from "@essos/shared";
import {
  conciergeReplyFromSlack,
  getEscalationCard,
  getPatientOverview,
  getQueueForConcierge,
  getSlackLinkByConversation,
  getSlackLinkByThread,
  listPatients,
  listSourceDocumentsWithUrls,
  resolveAndResumeFromSlack,
  resolveEscalationFromSlack,
  resumeAutomationFromSlack,
  setEscalationFeedbackFromSlack,
  takeOverFromSlack,
} from "@essos/shared";
import type { App } from "@slack/bolt";
import type { KnownBlock } from "@slack/types";
import {
  ACTION_FEEDBACK_INVALID,
  ACTION_FEEDBACK_VALID,
  ACTION_RESOLVE,
  ACTION_RESOLVE_RESUME,
  ACTION_RESUME,
  ACTION_SEND_SUGGESTED,
  ACTION_TAKE_OVER,
  decodeAction,
  filesBlocks,
  homeView,
  patientOverviewBlocks,
  queueBlocks,
  scheduleBlocks,
} from "./blocks.js";
import { debug } from "./debug.js";
import { DASHBOARD_URL, SLACK_BOT_TOKEN, SLASH_COMMAND } from "./env.js";
import { resolveIdentity } from "./identity.js";

async function findPatient(query: string): Promise<Patient | null> {
  const q = query.trim().toLowerCase();
  if (!q) {
    return null;
  }
  const patients = await listPatients();
  return (
    patients.find(
      (p) => p.id.toLowerCase() === q || p.name.toLowerCase().includes(q)
    ) ?? null
  );
}

/** Register all Socket Mode listeners (replies, buttons, slash, App Home). */
export function registerListeners(app: App): void {
  // --- Thread replies → concierge reply to the patient ---
  app.message(async ({ message, client }) => {
    // Only plain user messages (GenericMessageEvent has no subtype).
    if (message.subtype || message.bot_id) {
      return;
    }
    const threadTs = message.thread_ts;
    if (!threadTs) {
      return;
    }
    const link = await getSlackLinkByThread(threadTs);
    if (!link) {
      return;
    }
    const text = (message.text ?? "").trim();
    if (!text) {
      return;
    }
    try {
      const identity = await resolveIdentity(client, message.user);
      await conciergeReplyFromSlack({
        conversationId: link.conversation_id,
        text,
        label: identity.label,
        clerkId: identity.clerkId,
      });
      await client.reactions
        .add({
          token: SLACK_BOT_TOKEN ?? undefined,
          channel: message.channel,
          timestamp: message.ts,
          name: "white_check_mark",
        })
        .catch(() => undefined);
    } catch (err) {
      debug("listeners", "reply failed", String(err));
    }
  });

  // --- Send the AI draft to the patient ---
  app.action(ACTION_SEND_SUGGESTED, async ({ ack, body, action, client }) => {
    await ack();
    const value = "value" in action ? action.value : undefined;
    const payload = decodeAction(value);
    if (!payload?.escalationId) {
      return;
    }
    try {
      const card = await getEscalationCard(payload.escalationId);
      const draft = card?.escalation.suggested_reply?.trim();
      const identity = await resolveIdentity(client, body.user.id);
      if (!draft) {
        await postThread(
          app,
          payload.conversationId,
          `⚠️ No AI draft to send (by ${identity.label}).`
        );
        return;
      }
      await conciergeReplyFromSlack({
        conversationId: payload.conversationId,
        text: draft,
        label: identity.label,
        clerkId: identity.clerkId,
      });
      await postThread(
        app,
        payload.conversationId,
        `📤 Sent AI draft to patient (by ${identity.label}):\n>${draft.replace(/\n/g, "\n>")}`
      );
    } catch (err) {
      debug("listeners", "send suggested failed", String(err));
    }
  });

  // --- Take over (pause Eve) ---
  app.action(ACTION_TAKE_OVER, async ({ ack, body, action, client }) => {
    await ack();
    const payload = decodeAction("value" in action ? action.value : undefined);
    if (!payload) {
      return;
    }
    try {
      const identity = await resolveIdentity(client, body.user.id);
      await takeOverFromSlack({
        conversationId: payload.conversationId,
        label: identity.label,
        clerkId: identity.clerkId,
      });
    } catch (err) {
      debug("listeners", "take over failed", String(err));
    }
  });

  // --- Resolve the escalation ---
  app.action(ACTION_RESOLVE, async ({ ack, body, action, client }) => {
    await ack();
    const payload = decodeAction("value" in action ? action.value : undefined);
    if (!payload?.escalationId) {
      return;
    }
    try {
      const identity = await resolveIdentity(client, body.user.id);
      await resolveEscalationFromSlack({
        escalationId: payload.escalationId,
        label: identity.label,
        clerkId: identity.clerkId,
      });
    } catch (err) {
      debug("listeners", "resolve failed", String(err));
    }
  });

  // --- Resolve every flag + resume Eve in one tap ---
  app.action(ACTION_RESOLVE_RESUME, async ({ ack, body, action, client }) => {
    await ack();
    const payload = decodeAction("value" in action ? action.value : undefined);
    if (!payload) {
      return;
    }
    try {
      const identity = await resolveIdentity(client, body.user.id);
      await resolveAndResumeFromSlack({
        conversationId: payload.conversationId,
        label: identity.label,
        clerkId: identity.clerkId,
      });
    } catch (err) {
      debug("listeners", "resolve+resume failed", String(err));
    }
  });

  // --- Resume Eve automation ---
  app.action(ACTION_RESUME, async ({ ack, body, action, client }) => {
    await ack();
    const payload = decodeAction("value" in action ? action.value : undefined);
    if (!payload) {
      return;
    }
    try {
      const identity = await resolveIdentity(client, body.user.id);
      await resumeAutomationFromSlack({
        conversationId: payload.conversationId,
        label: identity.label,
      });
    } catch (err) {
      debug("listeners", "resume failed", String(err));
    }
  });

  // --- Escalation-validity verdict (ADR 022) ---
  for (const [actionId, valid] of [
    [ACTION_FEEDBACK_VALID, true],
    [ACTION_FEEDBACK_INVALID, false],
  ] as const) {
    app.action(actionId, async ({ ack, body, action, client }) => {
      await ack();
      const payload = decodeAction(
        "value" in action ? action.value : undefined
      );
      if (!payload?.escalationId) {
        return;
      }
      try {
        const identity = await resolveIdentity(client, body.user.id);
        await setEscalationFeedbackFromSlack({
          escalationId: payload.escalationId,
          valid,
          label: identity.label,
        });
        await postThread(
          app,
          payload.conversationId,
          `${valid ? "✅" : "🚫"} ${identity.label} marked this escalation ${
            valid ? "necessary" : "unnecessary"
          }.`
        );
      } catch (err) {
        debug("listeners", "feedback failed", String(err));
      }
    });
  }

  // Acknowledge link-only buttons (URL buttons still fire an action event).
  app.action("essos_open_dashboard", async ({ ack }) => {
    await ack();
  });
  app.action(/^essos_open_.+/, async ({ ack }) => {
    await ack();
  });

  // --- Slash command: /essos patient|schedule|files|queue <name> ---
  app.command(SLASH_COMMAND, async ({ ack, command, client, respond }) => {
    await ack();
    const parts = command.text.trim().split(/\s+/);
    const sub = (parts.shift() ?? "").toLowerCase();
    const arg = parts.join(" ");
    try {
      const blocks = await runSlashCommand(client, command.user_id, sub, arg);
      await respond({ response_type: "ephemeral", blocks });
    } catch (err) {
      debug("listeners", "slash failed", String(err));
      await respond({
        response_type: "ephemeral",
        text: "Sorry, something went wrong running that command.",
      });
    }
  });

  // --- App Home: per-user queue ---
  app.event("app_home_opened", async ({ event, client }) => {
    if (event.tab !== "home") {
      return;
    }
    try {
      const identity = await resolveIdentity(client, event.user);
      const queue = await getQueueForConcierge({
        clerkId: identity.clerkId,
        isLead: identity.isLead,
      });
      await client.views.publish({
        token: SLACK_BOT_TOKEN ?? undefined,
        user_id: event.user,
        view: homeView(identity, queue, DASHBOARD_URL),
      });
    } catch (err) {
      debug("listeners", "home publish failed", String(err));
    }
  });
}

type SlackClient = App["client"];

async function runSlashCommand(
  client: SlackClient,
  slackUserId: string,
  sub: string,
  arg: string
): Promise<KnownBlock[]> {
  switch (sub) {
    case "patient": {
      const patient = await findPatient(arg);
      if (!patient) {
        return notFoundBlocks(arg);
      }
      const overview = await getPatientOverview(patient.id);
      if (!overview) {
        return notFoundBlocks(arg);
      }
      return patientOverviewBlocks(overview);
    }
    case "schedule": {
      const patient = await findPatient(arg);
      if (!patient) {
        return notFoundBlocks(arg);
      }
      const overview = await getPatientOverview(patient.id);
      return scheduleBlocks(patient, overview?.itinerary ?? []);
    }
    case "files": {
      const patient = await findPatient(arg);
      if (!patient) {
        return notFoundBlocks(arg);
      }
      const docs = await listSourceDocumentsWithUrls(patient.id);
      return filesBlocks(patient, docs);
    }
    case "queue": {
      const identity: ConciergeIdentity = await resolveIdentity(
        client,
        slackUserId
      );
      const queue = await getQueueForConcierge({
        clerkId: identity.clerkId,
        isLead: identity.isLead,
      });
      return queueBlocks(queue, DASHBOARD_URL);
    }
    default:
      return helpBlocks();
  }
}

function notFoundBlocks(query: string): KnownBlock[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `No patient matched “${query}”. Try \`${SLASH_COMMAND} queue\` to see open work.`,
      },
    },
  ];
}

function helpBlocks(): KnownBlock[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: [
          "*Essos commands*",
          `• \`${SLASH_COMMAND} patient <name>\` — status snapshot`,
          `• \`${SLASH_COMMAND} schedule <name>\` — itinerary`,
          `• \`${SLASH_COMMAND} files <name>\` — documents`,
          `• \`${SLASH_COMMAND} queue\` — open escalations`,
        ].join("\n"),
      },
    },
  ];
}

async function postThread(
  app: App,
  conversationId: string,
  text: string
): Promise<void> {
  const link = await getSlackLinkByConversation(conversationId);
  if (!link) {
    return;
  }
  await app.client.chat.postMessage({
    token: SLACK_BOT_TOKEN ?? undefined,
    channel: link.channel_id,
    thread_ts: link.thread_ts,
    text,
  });
}
