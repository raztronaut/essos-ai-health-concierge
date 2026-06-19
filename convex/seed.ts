import { v } from "convex/values";
import { mutation } from "./_generated/server";
import * as Patients from "./model/patients.js";
import * as Conversations from "./model/conversations.js";
import * as Messages from "./model/messages.js";
import * as Escalations from "./model/escalations.js";
import * as Activity from "./model/activity.js";

/**
 * Dev seeding. A Node runner (`scripts/seed.ts`) parses the mock-asset fixture
 * pack (it needs filesystem access, which Convex functions don't have) and
 * sends the parsed payload here. These are plain public mutations intended for
 * local/dev use only — guard or remove before any real deployment.
 */

const TABLES = [
  "activity_log",
  "escalations",
  "messages",
  "conversations",
  "care_instructions",
  "itinerary_events",
  "source_documents",
  "patients",
  "agent_turns",
] as const;

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    for (const table of TABLES) {
      const rows = await ctx.db.query(table).collect();
      for (const row of rows) await ctx.db.delete(row._id);
    }
  },
});

export const importAll = mutation({
  args: { data: v.any() },
  handler: async (ctx, { data }) => {
    const payload = data as ImportPayload;

    for (const patient of payload.patients) {
      await Patients.upsert(ctx, patient);
    }
    for (const doc of payload.sourceDocuments) {
      await Patients.insertSourceDocument(ctx, doc);
    }
    for (const event of payload.itinerary) {
      await Patients.insertItineraryEvent(ctx, event);
    }
    for (const care of payload.careInstructions) {
      await Patients.insertCareInstruction(ctx, care);
    }

    for (const conv of payload.conversations) {
      const conversation = await Conversations.ensure(ctx, {
        spaceId: conv.space_id,
        patientId: conv.patient_id,
        channel: conv.channel,
      });
      const captured = new Map<string, string>();
      for (const m of conv.messages) {
        const msg = await Messages.add(ctx, {
          conversationId: conversation.id,
          role: m.role,
          text: m.text,
          authorHandle: m.author_handle ?? null,
          category: m.category ?? null,
        });
        if (m.capture_as) captured.set(m.capture_as, msg.id);
      }
      let escalationId: string | null = null;
      if (conv.escalation) {
        const esc = await Escalations.create(ctx, {
          conversationId: conversation.id,
          patientId: conv.patient_id,
          level: conv.escalation.level,
          reason: conv.escalation.reason,
          summary: conv.escalation.summary,
          sourceMessageId: conv.escalation.source_message_capture
            ? captured.get(conv.escalation.source_message_capture) ?? null
            : null,
          suggestedReply: conv.escalation.suggested_reply ?? null,
          suggestedReplySources: conv.escalation.suggested_reply_sources ?? null,
        });
        escalationId = esc.id;
      }
      await Conversations.setAutomationState(
        ctx,
        conversation.id,
        conv.automation_state,
      );
      for (const a of conv.activity ?? []) {
        const detail =
          a.event === "escalated" && escalationId
            ? `${a.detail ?? "escalated"} - ${escalationId}`
            : a.detail ?? null;
        await Activity.log(ctx, {
          conversationId: conversation.id,
          event: a.event,
          actor: a.actor,
          detail,
        });
      }
    }

    return { ok: true };
  },
});

// Loose payload typing (validated upstream by the parser).
interface ImportPayload {
  patients: Parameters<typeof Patients.upsert>[1][];
  sourceDocuments: Parameters<typeof Patients.insertSourceDocument>[1][];
  itinerary: Parameters<typeof Patients.insertItineraryEvent>[1][];
  careInstructions: Parameters<typeof Patients.insertCareInstruction>[1][];
  conversations: Array<{
    space_id: string;
    channel: "terminal" | "imessage";
    patient_id: string;
    automation_state: "active" | "paused_for_review" | "taken_over" | "resolved";
    messages: Array<{
      role: "patient" | "agent" | "concierge" | "system";
      text: string;
      author_handle?: string | null;
      category?: string | null;
      capture_as?: string;
    }>;
    escalation?: {
      level: "High" | "Med";
      reason: string;
      summary: string;
      source_message_capture?: string;
      suggested_reply?: string | null;
      suggested_reply_sources?: string[] | null;
    };
    activity?: Array<{
      event:
        | "message"
        | "logistics"
        | "escalated"
        | "drafted"
        | "paused"
        | "taken_over"
        | "resolved"
        | "resumed"
        | "reminder";
      actor: string;
      detail?: string | null;
    }>;
  }>;
}
