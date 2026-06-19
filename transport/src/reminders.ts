import {
  appendMessage,
  type CareInstruction,
  hasMessageWithMetaKind,
  type ItineraryEvent,
  listCareInstructions,
  listConversations,
  listItinerary,
  listPatients,
  logActivity,
  type Patient,
} from "@essos/shared";
import { debug } from "./debug.js";
import { type SpectrumApp, sendToPatientSpace } from "./outbound.js";

/**
 * Proactive pre-op reminders. The night before a procedure, Eve sends the
 * patient a warm, source-grounded nudge built ONLY from their verified pre-op
 * packet (answer_policy = answer_reference) — never free-form, so a proactive
 * health message can never drift off-policy. Delivery rides the transport's
 * Spectrum send path; eve `schedules` are root-only and hand off to an eve
 * channel, but patient delivery lives here, so the scheduler lives here too.
 * See ADR 011.
 */

/** How far ahead of a procedure to send the reminder, for the scheduled loop. */
const REMINDER_WINDOW_HOURS = 18;
const HOUR_MS = 60 * 60 * 1000;

export interface ReminderOptions {
  /**
   * Demo override: send even if the procedure isn't inside the look-ahead
   * window, and bypass the once-per-conversation dedup. Used by `transport:remind`.
   */
  force?: boolean;
  /** Clock override (tests/demo). */
  now?: Date;
  /** Restrict to a single patient (demo / one-shot). */
  patientId?: string;
  /** Look-ahead window in hours for the scheduled path. */
  withinHours?: number;
}

function firstName(patient: Patient): string {
  return patient.name.split(/\s+/)[0] ?? patient.name;
}

/** The procedure-adjacent itinerary event a reminder is anchored to. */
async function selectPreopEvent(
  patientId: string,
  now: Date,
  withinHours: number,
  force: boolean
): Promise<ItineraryEvent | null> {
  const candidates = (await listItinerary(patientId))
    .filter(
      (event) =>
        (event.kind === "clinic" || event.kind === "preop") && event.starts_at
    )
    .sort((a, b) => String(a.starts_at).localeCompare(String(b.starts_at)));
  if (candidates.length === 0) {
    return null;
  }

  const nowMs = now.getTime();
  const upcoming = candidates.filter((event) => {
    const ms = new Date(event.starts_at as string).getTime();
    return ms >= nowMs && ms - nowMs <= withinHours * HOUR_MS;
  });
  if (upcoming.length > 0) {
    return upcoming[0] ?? null;
  }
  if (!force) {
    return null;
  }
  // Demo fallback: anchor on the procedure itself, else the earliest pre-op event.
  return (
    candidates.find((event) => event.kind === "clinic") ?? candidates[0] ?? null
  );
}

/** The verified, quotable pre-op instruction to ground the reminder in (fasting first). */
async function selectFastingInstruction(
  patientId: string
): Promise<CareInstruction | null> {
  const preop = (await listCareInstructions(patientId, "preop")).filter(
    (care) =>
      care.source_status === "verified" &&
      care.answer_policy === "answer_reference"
  );
  if (preop.length === 0) {
    return null;
  }
  return (
    preop.find((care) =>
      /eat|drink|food|fast|fasting/i.test(`${care.title} ${care.body}`)
    ) ??
    preop[0] ??
    null
  );
}

function whenPhrase(startsAt: string | null, now: Date): string {
  if (!startsAt) {
    return "ahead of your procedure";
  }
  const eventMs = new Date(startsAt).getTime();
  if (Number.isNaN(eventMs)) {
    return "ahead of your procedure";
  }
  const diffMs = eventMs - now.getTime();
  if (diffMs < 0) {
    return "ahead of your procedure";
  }
  if (diffMs <= 18 * HOUR_MS) {
    return "for your procedure later today";
  }
  if (diffMs <= 42 * HOUR_MS) {
    return "for your procedure tomorrow";
  }
  const date = new Date(eventMs).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `for your procedure on ${date}`;
}

function buildReminder(
  patient: Patient,
  event: ItineraryEvent,
  instruction: CareInstruction
): string {
  return (
    `Hi ${firstName(patient)} — a quick reminder ${whenPhrase(event.starts_at, new Date())}. ` +
    `From your verified pre-op packet: "${instruction.body.trim()}" ` +
    "If anything's unclear, just reply here and the Essos care team will help."
  );
}

/**
 * Find patients with a procedure inside the reminder window (or all, when
 * forced), and send each a one-time, source-grounded pre-op reminder into their
 * existing conversation. Returns how many were sent.
 */
export async function sendDuePreopReminders(
  app: SpectrumApp,
  opts: ReminderOptions = {}
): Promise<number> {
  const now = opts.now ?? new Date();
  const withinHours = opts.withinHours ?? REMINDER_WINDOW_HOURS;
  const force = opts.force ?? false;
  const conversations = await listConversations();
  const patients = (await listPatients()).filter(
    (p) => !opts.patientId || p.id === opts.patientId
  );

  let sent = 0;
  for (const patient of patients) {
    const conversation = conversations.find((c) => c.patient_id === patient.id);
    if (!conversation) {
      continue; // need an existing thread to message into
    }

    const event = await selectPreopEvent(patient.id, now, withinHours, force);
    if (!event) {
      continue;
    }

    // One pre-op reminder per conversation unless forced (demo repeats).
    if (!force && (await hasMessageWithMetaKind(conversation.id, "reminder"))) {
      continue;
    }

    const instruction = await selectFastingInstruction(patient.id);
    if (!instruction) {
      continue;
    }

    const text = buildReminder(patient, event, instruction);
    try {
      const delivered = await sendToPatientSpace(
        app,
        conversation.space_id,
        patient.handle,
        text
      );
      if (!delivered) {
        debug(
          "reminders",
          "could not resolve space for",
          patient.id,
          "- skipping"
        );
        continue;
      }
      await appendMessage({
        conversationId: conversation.id,
        role: "agent",
        text,
        meta: { kind: "reminder", event_id: event.id },
      });
      await logActivity({
        conversationId: conversation.id,
        event: "reminder",
        actor: "eve",
        detail: `Pre-op reminder sent for ${event.title}.`,
      });
      debug("reminders", "sent pre-op reminder to", patient.id);
      sent += 1;
    } catch (err) {
      debug("reminders", "send failed for", patient.id, String(err));
    }
  }
  return sent;
}

/**
 * Start an hourly sweep that delivers due pre-op reminders. Runs once on start,
 * then on the interval; ticks never overlap. Returns a stop function.
 */
export function startReminderLoop(
  app: SpectrumApp,
  intervalMs = HOUR_MS
): () => void {
  let running = false;
  const tick = (): void => {
    if (running) {
      return;
    }
    running = true;
    void sendDuePreopReminders(app)
      .catch((err) => debug("reminders", "sweep error", String(err)))
      .finally(() => {
        running = false;
      });
  };
  tick();
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
