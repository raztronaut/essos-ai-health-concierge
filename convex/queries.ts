import { v } from "convex/values";
import { conciergeQuery } from "./lib/functions.js";
import * as Patients from "./model/patients.js";
import * as Conversations from "./model/conversations.js";
import * as Messages from "./model/messages.js";
import * as Escalations from "./model/escalations.js";
import * as Activity from "./model/activity.js";
import * as Telemetry from "./model/telemetry.js";

/**
 * Public, Clerk-gated reads for the admin dashboard. These power the reactive
 * `useQuery` hooks; long lists stay index-backed. Time-derived analytics take
 * the window/`now` as an argument (queries must never call `Date.now()`).
 */

export const listPatients = conciergeQuery({
  args: {},
  handler: async (ctx) => Patients.list(ctx),
});

export const getPatient = conciergeQuery({
  args: { id: v.string() },
  handler: async (ctx, { id }) => Patients.getByExternalId(ctx, id),
});

export const getConversation = conciergeQuery({
  args: { id: v.string() },
  handler: async (ctx, { id }) => Conversations.getByExternalId(ctx, id),
});

export const listMessages = conciergeQuery({
  args: { conversationId: v.string() },
  handler: async (ctx, { conversationId }) => Messages.list(ctx, conversationId),
});

export const listEscalationsForConversation = conciergeQuery({
  args: { conversationId: v.string() },
  handler: async (ctx, { conversationId }) =>
    Escalations.listForConversation(ctx, conversationId),
});

export const listOpenEscalations = conciergeQuery({
  args: {},
  handler: async (ctx) => Escalations.listByStatus(ctx, "open"),
});

export const listActivity = conciergeQuery({
  args: { conversationId: v.string() },
  handler: async (ctx, { conversationId }) =>
    Activity.listForConversation(ctx, conversationId),
});

export const listItinerary = conciergeQuery({
  args: { patientId: v.string() },
  handler: async (ctx, { patientId }) => Patients.listItinerary(ctx, patientId),
});

export const listCareInstructions = conciergeQuery({
  args: { patientId: v.string() },
  handler: async (ctx, { patientId }) =>
    Patients.listCareInstructions(ctx, patientId),
});

export const listSourceDocumentsForPatient = conciergeQuery({
  args: { patientId: v.string() },
  handler: async (ctx, { patientId }) =>
    Patients.listSourceDocumentsForPatient(ctx, patientId),
});

export const getSourceDocument = conciergeQuery({
  args: { id: v.string() },
  handler: async (ctx, { id }) => Patients.getSourceDocument(ctx, id),
});

/** Denormalized conversation list for the dashboard (patient + last message + open flags). */
export const listConversationSummaries = conciergeQuery({
  args: {},
  handler: async (ctx) => {
    const conversations = await Conversations.list(ctx);
    const summaries = [];
    for (const c of conversations) {
      const patient = await Patients.getByExternalId(ctx, c.patient_id);
      const last = await Messages.last(ctx, c.id);
      const open = await Escalations.listOpenForConversation(ctx, c.id);
      summaries.push({
        id: c.id,
        patient_id: c.patient_id,
        automation_state: c.automation_state,
        updated_at: c.updated_at,
        patient_name: patient?.name ?? null,
        patient_procedure: patient?.procedure ?? null,
        patient_city: patient?.destination_city ?? null,
        patient_country: patient?.destination_country ?? null,
        last_role: last?.role ?? null,
        last_text: last?.text ?? null,
        open_flags: open.length,
      });
    }
    return summaries;
  },
});

/** Overview tiles. */
export const overviewStats = conciergeQuery({
  args: {},
  handler: async (ctx) => {
    const patients = await Patients.list(ctx);
    const conversations = await Conversations.list(ctx);
    const allEscalations = await Escalations.listByStatus(ctx);
    const openEscalations = allEscalations.filter((e) => e.status === "open");
    const autonomousReplies = await Messages.countByRole(ctx, "agent");
    const escalatedTurns = await Activity.countByEvent(ctx, "escalated");
    const remindersSent = await Activity.countByEvent(ctx, "reminder");
    return {
      patients: patients.length,
      conversations: conversations.length,
      openFlags: openEscalations.length,
      totalFlags: allEscalations.length,
      autonomousReplies,
      escalatedTurns,
      remindersSent,
    };
  },
});

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx] ?? 0;
}

/** AI observability: resolution rate, latency, tool usage, tokens, draft quality. */
export const aiPerformance = conciergeQuery({
  args: { since: v.string() },
  handler: async (ctx, { since }) => {
    const turns = await Telemetry.listSince(ctx, since);
    const latencies = turns
      .map((t) => t.latency_ms)
      .filter((n) => n > 0)
      .sort((a, b) => a - b);
    const escalatedTurns = turns.filter((t) => t.escalated).length;
    const totalTurns = turns.length;

    const toolUsage: Record<string, number> = {};
    for (const t of turns) {
      for (const tool of t.tool_calls) {
        toolUsage[tool] = (toolUsage[tool] ?? 0) + 1;
      }
    }

    const promptTokens = turns.reduce((s, t) => s + (t.prompt_tokens ?? 0), 0);
    const completionTokens = turns.reduce(
      (s, t) => s + (t.completion_tokens ?? 0),
      0,
    );
    const totalTokens = turns.reduce((s, t) => s + (t.total_tokens ?? 0), 0);

    // Per-day trend (by ISO date prefix).
    const byDay: Record<string, { turns: number; escalated: number }> = {};
    for (const t of turns) {
      const day = t.created_at.slice(0, 10);
      byDay[day] ??= { turns: 0, escalated: 0 };
      byDay[day].turns += 1;
      if (t.escalated) byDay[day].escalated += 1;
    }
    const trend = Object.entries(byDay)
      .map(([day, v2]) => ({ day, ...v2 }))
      .sort((a, b) => a.day.localeCompare(b.day));

    // Draft quality from escalations created in-window.
    const escalations = (await Escalations.listByStatus(ctx)).filter(
      (e) => e.created_at >= since,
    );
    const withDraft = escalations.filter((e) => e.suggested_reply).length;

    const remindersSent = (await Activity.listAll(ctx, 1000)).filter(
      (a) => a.event === "reminder" && a.created_at >= since,
    ).length;

    return {
      totalTurns,
      escalatedTurns,
      autonomousTurns: totalTurns - escalatedTurns,
      resolutionRate: totalTurns === 0 ? 0 : (totalTurns - escalatedTurns) / totalTurns,
      latency: {
        p50: percentile(latencies, 50),
        p95: percentile(latencies, 95),
        avg:
          latencies.length === 0
            ? 0
            : Math.round(latencies.reduce((s, n) => s + n, 0) / latencies.length),
        count: latencies.length,
      },
      toolUsage,
      tokens: { promptTokens, completionTokens, totalTokens },
      trend,
      drafts: {
        escalations: escalations.length,
        withDraft,
        draftRate: escalations.length === 0 ? 0 : withDraft / escalations.length,
      },
      remindersSent,
    };
  },
});

/** Concierge team performance. `now` passed in (no Date.now() in queries). */
export const teamPerformance = conciergeQuery({
  args: { now: v.string(), orgId: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, { now, orgId }) => {
    const escalations = await Escalations.listByStatus(ctx);
    const usersQuery = orgId
      ? ctx.db.query("users").withIndex("by_org", (q) => q.eq("orgId", orgId))
      : ctx.db.query("users");
    const users = await usersQuery.collect();

    const nowMs = new Date(now).getTime();
    const resolved = escalations.filter((e) => e.status === "resolved" && e.resolved_at);
    const open = escalations.filter((e) => e.status === "open");

    // Per-assignee tallies.
    const byAssignee: Record<
      string,
      { resolved: number; takenOver: number; totalResolutionMs: number }
    > = {};
    for (const e of escalations) {
      const who = e.assignee ?? "unassigned";
      byAssignee[who] ??= { resolved: 0, takenOver: 0, totalResolutionMs: 0 };
      if (e.status === "resolved") {
        byAssignee[who].resolved += 1;
        if (e.resolved_at) {
          byAssignee[who].totalResolutionMs +=
            new Date(e.resolved_at).getTime() - new Date(e.created_at).getTime();
        }
      }
      if (e.status === "taken_over") byAssignee[who].takenOver += 1;
    }

    const resolutionTimesMs = resolved.map(
      (e) => new Date(e.resolved_at as string).getTime() - new Date(e.created_at).getTime(),
    );
    const avgResolutionMs =
      resolutionTimesMs.length === 0
        ? 0
        : Math.round(
            resolutionTimesMs.reduce((s, n) => s + n, 0) / resolutionTimesMs.length,
          );

    const oldestOpenMs =
      open.length === 0
        ? 0
        : Math.max(...open.map((e) => nowMs - new Date(e.created_at).getTime()));

    return {
      members: users.map((u) => ({
        clerkId: u.clerkId,
        name: u.name,
        email: u.email,
        role: u.role,
        resolved: byAssignee[u.name]?.resolved ?? byAssignee[u.email]?.resolved ?? 0,
        takenOver:
          byAssignee[u.name]?.takenOver ?? byAssignee[u.email]?.takenOver ?? 0,
      })),
      byAssignee: Object.entries(byAssignee).map(([assignee, v2]) => ({
        assignee,
        resolved: v2.resolved,
        takenOver: v2.takenOver,
        avgResolutionMs: v2.resolved === 0 ? 0 : Math.round(v2.totalResolutionMs / v2.resolved),
      })),
      totals: {
        open: open.length,
        resolved: resolved.length,
        avgResolutionMs,
        oldestOpenMs,
      },
    };
  },
});
