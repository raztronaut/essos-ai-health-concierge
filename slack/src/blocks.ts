import type {
  ConciergeIdentity,
  EscalationCard,
  ItineraryEvent,
  Patient,
  PatientOverview,
  QueueData,
  SourceDocumentRef,
} from "@essos/shared";
import { parseSuggestedReplySources } from "@essos/shared";
import type { KnownBlock, View } from "@slack/types";

/**
 * Block Kit renderers for the Slack concierge bridge. All staff-facing surfaces
 * (escalation cards, threaded progress, slash-command views, App Home) are built
 * here so the listener/loop modules stay focused on wiring.
 */

export const ACTION_SEND_SUGGESTED = "essos_send_suggested";
export const ACTION_TAKE_OVER = "essos_take_over";
export const ACTION_RESOLVE = "essos_resolve";
export const ACTION_RESUME = "essos_resume";
export const ACTION_RESOLVE_RESUME = "essos_resolve_resume";
export const ACTION_FEEDBACK_VALID = "essos_feedback_valid";
export const ACTION_FEEDBACK_INVALID = "essos_feedback_invalid";

/** Encoded into button `value`s so a click carries the ids it needs to act. */
export interface ActionPayload {
  conversationId: string;
  escalationId: string | null;
  patientId: string | null;
}

export function encodeAction(payload: ActionPayload): string {
  return JSON.stringify(payload);
}

export function decodeAction(value: string | undefined): ActionPayload | null {
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(value) as ActionPayload;
    if (typeof parsed.conversationId === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function titleCase(s: string): string {
  return s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatWhen(iso: string | null): string {
  if (!iso) {
    return "TBD";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function patientLine(patient: Patient | null): string {
  if (!patient) {
    return "Unknown patient";
  }
  return `*${patient.name}* · ${titleCase(patient.procedure)} · ${patient.destination_city}, ${patient.destination_country}`;
}

// --------------------------- Escalation card ---------------------------

export function escalationBlocks(
  card: EscalationCard,
  dashboardUrl: string
): KnownBlock[] {
  const { escalation, patient, conversation } = card;
  const levelEmoji = escalation.level === "High" ? "🔴" : "🟠";
  const blocks: KnownBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${levelEmoji} Escalation · ${escalation.level}`,
        emoji: true,
      },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: patientLine(patient) },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Reason:*\n${titleCase(escalation.reason)}` },
        { type: "mrkdwn", text: `*Status:*\n${titleCase(escalation.status)}` },
      ],
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Summary*\n${escalation.summary}` },
    },
  ];

  if (escalation.suggested_reply) {
    const sources = parseSuggestedReplySources(escalation);
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*AI draft reply*\n>${escalation.suggested_reply.replace(/\n/g, "\n>")}`,
      },
    });
    if (sources.length > 0) {
      blocks.push({
        type: "context",
        elements: [{ type: "mrkdwn", text: `Sources: ${sources.join(", ")}` }],
      });
    }
  }

  const payload = encodeAction({
    conversationId: escalation.conversation_id,
    escalationId: escalation.id,
    patientId: escalation.patient_id,
  });

  const actionButtons: KnownBlock = {
    type: "actions",
    elements: [
      ...(escalation.suggested_reply
        ? [
            {
              type: "button" as const,
              text: {
                type: "plain_text" as const,
                text: "Send AI draft",
                emoji: true,
              },
              style: "primary" as const,
              action_id: ACTION_SEND_SUGGESTED,
              value: payload,
            },
          ]
        : []),
      {
        type: "button",
        text: { type: "plain_text", text: "Take over", emoji: true },
        action_id: ACTION_TAKE_OVER,
        value: payload,
      },
      {
        type: "button",
        text: { type: "plain_text", text: "Resolve", emoji: true },
        style: "danger",
        action_id: ACTION_RESOLVE,
        value: payload,
      },
      {
        type: "button",
        text: { type: "plain_text", text: "Resolve + Resume Eve", emoji: true },
        action_id: ACTION_RESOLVE_RESUME,
        value: payload,
      },
      {
        type: "button",
        text: { type: "plain_text", text: "Resume Eve", emoji: true },
        action_id: ACTION_RESUME,
        value: payload,
      },
      {
        type: "button",
        text: { type: "plain_text", text: "Open in dashboard", emoji: true },
        url: `${dashboardUrl}/conversations/${conversation?.id ?? escalation.conversation_id}`,
        action_id: "essos_open_dashboard",
      },
    ],
  };
  blocks.push(actionButtons);
  // Validity verdict (ADR 022): was this escalation necessary?
  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "✅ Was necessary", emoji: true },
        action_id: ACTION_FEEDBACK_VALID,
        value: payload,
      },
      {
        type: "button",
        text: { type: "plain_text", text: "🚫 Unnecessary", emoji: true },
        action_id: ACTION_FEEDBACK_INVALID,
        value: payload,
      },
    ],
  });
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: "Reply in this thread to message the patient directly.",
      },
    ],
  });
  return blocks;
}

// --------------------------- Threaded updates ---------------------------

const ACTIVITY_EMOJI: Record<string, string> = {
  taken_over: "🙋",
  resolved: "✅",
  resumed: "▶️",
  reminder: "⏰",
};

export function activityText(
  event: string,
  actor: string,
  detail: string | null
): string {
  const emoji = ACTIVITY_EMOJI[event] ?? "•";
  const label = titleCase(event);
  const tail = detail ? ` — ${detail}` : "";
  return `${emoji} *${label}* by ${actor}${tail}`;
}

export function patientMessageText(
  text: string,
  authorHandle: string | null
): string {
  const who = authorHandle ? ` (${authorHandle})` : "";
  return `💬 *Patient${who}:* ${text}`;
}

// --------------------------- Slash command views ---------------------------

export function patientOverviewBlocks(overview: PatientOverview): KnownBlock[] {
  const { patient, conversation, openEscalations, itinerary } = overview;
  const next = [...itinerary]
    .filter((e) => e.starts_at)
    .sort((a, b) => (a.starts_at ?? "").localeCompare(b.starts_at ?? ""))[0];
  return [
    { type: "section", text: { type: "mrkdwn", text: patientLine(patient) } },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Automation:*\n${conversation ? titleCase(conversation.automation_state) : "No conversation"}`,
        },
        {
          type: "mrkdwn",
          text: `*Open escalations:*\n${openEscalations}`,
        },
        { type: "mrkdwn", text: `*Clinic:*\n${patient.clinic_name}` },
        { type: "mrkdwn", text: `*Hotel:*\n${patient.hotel_name}` },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: next
          ? `*Next up:* ${next.title} — ${formatWhen(next.starts_at)}`
          : "*Next up:* nothing scheduled",
      },
    },
  ];
}

export function scheduleBlocks(
  patient: Patient,
  itinerary: ItineraryEvent[]
): KnownBlock[] {
  const sorted = [...itinerary].sort((a, b) => {
    if (a.starts_at && b.starts_at) {
      return a.starts_at.localeCompare(b.starts_at);
    }
    return a.sort_order - b.sort_order;
  });
  const blocks: KnownBlock[] = [
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Schedule* · ${patient.name}` },
    },
  ];
  if (sorted.length === 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "_No itinerary events._" },
    });
    return blocks;
  }
  for (const e of sorted) {
    const loc = e.location ? ` · ${e.location}` : "";
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${titleCase(e.kind)}* — ${e.title}\n${formatWhen(e.starts_at)}${loc}`,
      },
    });
  }
  return blocks;
}

export function filesBlocks(
  patient: Patient,
  docs: SourceDocumentRef[]
): KnownBlock[] {
  const blocks: KnownBlock[] = [
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Files* · ${patient.name}` },
    },
  ];
  if (docs.length === 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "_No documents on file._" },
    });
    return blocks;
  }
  for (const doc of docs) {
    const title = doc.url
      ? `<${doc.url}|${doc.title}>`
      : `${doc.title} _(seeded — view in dashboard)_`;
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `• ${title} _(${titleCase(doc.kind)})_` },
    });
  }
  return blocks;
}

export function queueBlocks(
  queue: QueueData,
  dashboardUrl: string
): KnownBlock[] {
  const byPatient = new Map<string, Patient>();
  for (const p of queue.patients) {
    byPatient.set(p.id, p);
  }
  const blocks: KnownBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `Open escalations (${queue.escalations.length})`,
        emoji: true,
      },
    },
  ];
  if (queue.escalations.length === 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "🎉 No open escalations." },
    });
    return blocks;
  }
  for (const esc of queue.escalations) {
    const patient = byPatient.get(esc.patient_id) ?? null;
    const levelEmoji = esc.level === "High" ? "🔴" : "🟠";
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${levelEmoji} ${patient ? patient.name : esc.patient_id} — ${titleCase(esc.reason)}\n${esc.summary}`,
      },
      accessory: {
        type: "button",
        text: { type: "plain_text", text: "Open", emoji: true },
        url: `${dashboardUrl}/conversations/${esc.conversation_id}`,
        action_id: `essos_open_${esc.id}`,
      },
    });
  }
  return blocks;
}

// --------------------------- App Home ---------------------------

export function homeView(
  identity: ConciergeIdentity,
  queue: QueueData,
  dashboardUrl: string
): View {
  const mine = identity.clerkId
    ? queue.escalations.filter((e) => {
        const patient = queue.patients.find((p) => p.id === e.patient_id);
        return (
          identity.isLead ||
          !patient?.assignee_user_id ||
          patient.assignee_user_id === identity.clerkId
        );
      })
    : queue.escalations;

  const blocks: KnownBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `Welcome, ${identity.name}`,
        emoji: true,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: identity.isLead
            ? "Team lead — you can act on every patient."
            : "Showing your assigned patients and the shared queue.",
        },
      ],
    },
    { type: "divider" },
    ...queueBlocks(
      { patients: queue.patients, escalations: mine },
      dashboardUrl
    ),
  ];
  return { type: "home", blocks };
}

export function escalationFallbackText(card: EscalationCard): string {
  const name = card.patient?.name ?? card.escalation.patient_id;
  return `${card.escalation.level} escalation for ${name}: ${card.escalation.summary}`;
}
