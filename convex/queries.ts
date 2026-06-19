import { v } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import type { Concierge, Scope } from "./lib/functions.js";
import { conciergeQuery, effectiveScope } from "./lib/functions.js";
import {
  activityLogDoc,
  careInstructionDoc,
  conversationDoc,
  conversationSummary,
  escalationDoc,
  itineraryEventDoc,
  messageDoc,
  patientDoc,
  sourceDocumentDoc,
} from "./lib/validators.js";
import * as Activity from "./model/activity.js";
import * as Conversations from "./model/conversations.js";
import * as Escalations from "./model/escalations.js";
import * as Messages from "./model/messages.js";
import * as Patients from "./model/patients.js";
import * as Telemetry from "./model/telemetry.js";

/**
 * Public, Clerk-gated reads for the admin dashboard. These power the reactive
 * `useQuery` hooks; long lists stay index-backed and bounded. Time-derived
 * analytics take the window/`now` as an argument (queries never call
 * `Date.now()`). Reads are scoped to the signed-in concierge: leads see
 * everything, members see their assigned patients plus the unassigned queue.
 */

type CtxWithConcierge = QueryCtx & { concierge: Concierge };

/** Optional demo-only "view as" override (a Clerk user id). */
const viewAsArg = { viewAs: v.optional(v.union(v.string(), v.null())) };

async function assertPatientAccess(
  ctx: CtxWithConcierge,
  patientId: string,
  scope: Scope
): Promise<void> {
  const patient = await Patients.getByExternalId(ctx, patientId);
  if (!patient) {
    return;
  }
  if (!Patients.canAccess(patient, scope)) {
    throw new Error("Not authorized for this patient");
  }
}

async function assertConversationAccess(
  ctx: CtxWithConcierge,
  conversationId: string,
  scope: Scope
): Promise<void> {
  const conv = await Conversations.getByExternalId(ctx, conversationId);
  if (!conv) {
    return;
  }
  await assertPatientAccess(ctx, conv.patient_id, scope);
}

export const listPatients = conciergeQuery({
  args: viewAsArg,
  returns: v.array(patientDoc),
  handler: async (ctx, { viewAs }) => {
    const scope = await effectiveScope(ctx, ctx.concierge, viewAs);
    return Patients.listForConcierge(ctx, scope);
  },
});

/**
 * Patient roster for the list view: every patient joined with its owning
 * concierge profile, open-flag count, conversation count, and last activity.
 * Returned unscoped so leads/members can sort and filter the whole roster by
 * assigned member; access control on individual records still applies on edit.
 */
export const listPatientsWithMeta = conciergeQuery({
  args: {},
  returns: v.array(
    v.object({
      patient: patientDoc,
      assignee: v.union(
        v.object({
          clerkId: v.string(),
          name: v.string(),
          email: v.string(),
          pictureUrl: v.union(v.string(), v.null()),
        }),
        v.null()
      ),
      openFlags: v.number(),
      conversationCount: v.number(),
      lastActivity: v.union(v.string(), v.null()),
    })
  ),
  handler: async (ctx) => {
    const patients = await Patients.list(ctx);
    const openEscalations = await Escalations.listByStatus(ctx, "open");
    const conversations = await Conversations.list(ctx);
    const users = await ctx.db.query("users").collect();

    const userByClerkId = new Map(users.map((u) => [u.clerkId, u]));
    const openByPatient = new Map<string, number>();
    for (const e of openEscalations) {
      openByPatient.set(
        e.patient_id,
        (openByPatient.get(e.patient_id) ?? 0) + 1
      );
    }
    const convCount = new Map<string, number>();
    const lastActivity = new Map<string, string>();
    for (const c of conversations) {
      convCount.set(c.patient_id, (convCount.get(c.patient_id) ?? 0) + 1);
      const prior = lastActivity.get(c.patient_id);
      if (!prior || c.updated_at > prior) {
        lastActivity.set(c.patient_id, c.updated_at);
      }
    }

    return patients.map((patient) => {
      const owner = patient.assignee_user_id
        ? userByClerkId.get(patient.assignee_user_id)
        : undefined;
      return {
        patient,
        assignee: owner
          ? {
              clerkId: owner.clerkId,
              name: owner.name,
              email: owner.email,
              pictureUrl: owner.pictureUrl,
            }
          : null,
        openFlags: openByPatient.get(patient.id) ?? 0,
        conversationCount: convCount.get(patient.id) ?? 0,
        lastActivity: lastActivity.get(patient.id) ?? null,
      };
    });
  },
});

export const getPatient = conciergeQuery({
  args: { id: v.string(), ...viewAsArg },
  returns: v.union(patientDoc, v.null()),
  handler: async (ctx, { id, viewAs }) => {
    const scope = await effectiveScope(ctx, ctx.concierge, viewAs);
    await assertPatientAccess(ctx, id, scope);
    return Patients.getByExternalId(ctx, id);
  },
});

export const getConversation = conciergeQuery({
  args: { id: v.string(), ...viewAsArg },
  returns: v.union(conversationDoc, v.null()),
  handler: async (ctx, { id, viewAs }) => {
    const scope = await effectiveScope(ctx, ctx.concierge, viewAs);
    await assertConversationAccess(ctx, id, scope);
    return Conversations.getByExternalId(ctx, id);
  },
});

/** Find the conversation for a patient (most recent), for cross-linking from the patient profile. */
export const getConversationForPatient = conciergeQuery({
  args: { patientId: v.string(), ...viewAsArg },
  returns: v.union(conversationDoc, v.null()),
  handler: async (ctx, { patientId, viewAs }) => {
    const scope = await effectiveScope(ctx, ctx.concierge, viewAs);
    await assertPatientAccess(ctx, patientId, scope);
    return Conversations.getByPatient(ctx, patientId);
  },
});

export const listMessages = conciergeQuery({
  args: { conversationId: v.string(), ...viewAsArg },
  returns: v.array(messageDoc),
  handler: async (ctx, { conversationId, viewAs }) => {
    const scope = await effectiveScope(ctx, ctx.concierge, viewAs);
    await assertConversationAccess(ctx, conversationId, scope);
    return Messages.listRecent(ctx, conversationId);
  },
});

export const listEscalationsForConversation = conciergeQuery({
  args: { conversationId: v.string(), ...viewAsArg },
  returns: v.array(escalationDoc),
  handler: async (ctx, { conversationId, viewAs }) => {
    const scope = await effectiveScope(ctx, ctx.concierge, viewAs);
    await assertConversationAccess(ctx, conversationId, scope);
    return Escalations.listForConversation(ctx, conversationId);
  },
});

export const listOpenEscalations = conciergeQuery({
  args: {},
  returns: v.array(escalationDoc),
  // The triage queue is shared across the team so anyone can claim a flag.
  handler: async (ctx) => Escalations.listByStatus(ctx, "open"),
});

export const listActivity = conciergeQuery({
  args: { conversationId: v.string(), ...viewAsArg },
  returns: v.array(activityLogDoc),
  handler: async (ctx, { conversationId, viewAs }) => {
    const scope = await effectiveScope(ctx, ctx.concierge, viewAs);
    await assertConversationAccess(ctx, conversationId, scope);
    return Activity.listForConversation(ctx, conversationId);
  },
});

export const listItinerary = conciergeQuery({
  args: { patientId: v.string(), ...viewAsArg },
  returns: v.array(itineraryEventDoc),
  handler: async (ctx, { patientId, viewAs }) => {
    const scope = await effectiveScope(ctx, ctx.concierge, viewAs);
    await assertPatientAccess(ctx, patientId, scope);
    return Patients.listItinerary(ctx, patientId);
  },
});

export const listCareInstructions = conciergeQuery({
  args: { patientId: v.string(), ...viewAsArg },
  returns: v.array(careInstructionDoc),
  handler: async (ctx, { patientId, viewAs }) => {
    const scope = await effectiveScope(ctx, ctx.concierge, viewAs);
    await assertPatientAccess(ctx, patientId, scope);
    return Patients.listCareInstructions(ctx, patientId);
  },
});

export const listSourceDocumentsForPatient = conciergeQuery({
  args: { patientId: v.string(), ...viewAsArg },
  returns: v.array(sourceDocumentDoc),
  handler: async (ctx, { patientId, viewAs }) => {
    const scope = await effectiveScope(ctx, ctx.concierge, viewAs);
    await assertPatientAccess(ctx, patientId, scope);
    return Patients.listSourceDocumentsForPatient(ctx, patientId);
  },
});

export const getSourceDocument = conciergeQuery({
  args: { id: v.string(), ...viewAsArg },
  returns: v.union(sourceDocumentDoc, v.null()),
  handler: async (ctx, { id, viewAs }) => {
    const doc = await Patients.getSourceDocument(ctx, id);
    // Patient-scoped docs honor ownership; global docs (null patient) are shared.
    if (doc?.patient_id) {
      const scope = await effectiveScope(ctx, ctx.concierge, viewAs);
      await assertPatientAccess(ctx, doc.patient_id, scope);
    }
    return doc;
  },
});

/** Resolve a short-lived download URL for an uploaded (storage-backed) document. */
export const getSourceDocumentUrl = conciergeQuery({
  args: { id: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { id }) => {
    const doc = await Patients.getSourceDocument(ctx, id);
    if (!doc?.storage_id) {
      return null;
    }
    return await ctx.storage.getUrl(doc.storage_id);
  },
});

/** Denormalized conversation list for the dashboard (patient + last message + open flags). */
export const listConversationSummaries = conciergeQuery({
  args: viewAsArg,
  returns: v.array(conversationSummary),
  handler: async (ctx, { viewAs }) => {
    const scope = await effectiveScope(ctx, ctx.concierge, viewAs);
    const conversations = await Conversations.list(ctx);
    const summaries = [];
    for (const c of conversations) {
      if (
        !Patients.canAccess({ assignee_user_id: c.assignee_user_id }, scope)
      ) {
        continue;
      }
      const patient = await Patients.getByExternalId(ctx, c.patient_id);
      const last = await Messages.last(ctx, c.id);
      const open = await Escalations.listOpenForConversation(ctx, c.id);
      summaries.push({
        id: c.id,
        patient_id: c.patient_id,
        automation_state: c.automation_state,
        updated_at: c.updated_at,
        assignee_user_id: c.assignee_user_id,
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
  returns: v.object({
    patients: v.number(),
    conversations: v.number(),
    openFlags: v.number(),
    totalFlags: v.number(),
    autonomousReplies: v.number(),
    escalatedTurns: v.number(),
    remindersSent: v.number(),
  }),
  handler: async (ctx) => {
    const patients = await Patients.list(ctx);
    const conversations = await Conversations.list(ctx);
    const openEscalations = await Escalations.listByStatus(ctx, "open");
    const allEscalations = await Escalations.listByStatus(ctx);
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
  if (sorted.length === 0) {
    return 0;
  }
  const idx = Math.min(
    sorted.length - 1,
    Math.floor((p / 100) * sorted.length)
  );
  return sorted[idx] ?? 0;
}

/** AI observability: resolution rate, latency, tool usage, tokens, draft quality. */
export const aiPerformance = conciergeQuery({
  args: { since: v.string() },
  returns: v.object({
    totalTurns: v.number(),
    escalatedTurns: v.number(),
    autonomousTurns: v.number(),
    resolutionRate: v.number(),
    latency: v.object({
      p50: v.number(),
      p95: v.number(),
      avg: v.number(),
      count: v.number(),
    }),
    toolUsage: v.record(v.string(), v.number()),
    tokens: v.object({
      promptTokens: v.number(),
      completionTokens: v.number(),
      totalTokens: v.number(),
    }),
    trend: v.array(
      v.object({ day: v.string(), turns: v.number(), escalated: v.number() })
    ),
    drafts: v.object({
      escalations: v.number(),
      withDraft: v.number(),
      draftRate: v.number(),
    }),
    remindersSent: v.number(),
  }),
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
      0
    );
    const totalTokens = turns.reduce((s, t) => s + (t.total_tokens ?? 0), 0);

    // Per-day trend (by ISO date prefix).
    const byDay: Record<string, { turns: number; escalated: number }> = {};
    for (const t of turns) {
      const day = t.created_at.slice(0, 10);
      byDay[day] ??= { turns: 0, escalated: 0 };
      byDay[day].turns += 1;
      if (t.escalated) {
        byDay[day].escalated += 1;
      }
    }
    const trend = Object.entries(byDay)
      .map(([day, v2]) => ({ day, turns: v2.turns, escalated: v2.escalated }))
      .sort((a, b) => a.day.localeCompare(b.day));

    // Draft quality from escalations created in-window.
    const escalations = (await Escalations.listByStatus(ctx)).filter(
      (e) => e.created_at >= since
    );
    const withDraft = escalations.filter((e) => e.suggested_reply).length;

    const remindersSent = (await Activity.listAll(ctx, 1000)).filter(
      (a) => a.event === "reminder" && a.created_at >= since
    ).length;

    return {
      totalTurns,
      escalatedTurns,
      autonomousTurns: totalTurns - escalatedTurns,
      resolutionRate:
        totalTurns === 0 ? 0 : (totalTurns - escalatedTurns) / totalTurns,
      latency: {
        p50: percentile(latencies, 50),
        p95: percentile(latencies, 95),
        avg:
          latencies.length === 0
            ? 0
            : Math.round(
                latencies.reduce((s, n) => s + n, 0) / latencies.length
              ),
        count: latencies.length,
      },
      toolUsage,
      tokens: { promptTokens, completionTokens, totalTokens },
      trend,
      drafts: {
        escalations: escalations.length,
        withDraft,
        draftRate:
          escalations.length === 0 ? 0 : withDraft / escalations.length,
      },
      remindersSent,
    };
  },
});

/**
 * Concierge team performance. `now` is passed in (no `Date.now()` in queries).
 * Per-rep tallies are keyed on the stable `assignee_user_id` (Clerk id), joined
 * to the synced `users` table — not a fragile name-string match.
 */
export const teamPerformance = conciergeQuery({
  args: { now: v.string() },
  returns: v.object({
    members: v.array(
      v.object({
        clerkId: v.string(),
        name: v.string(),
        email: v.string(),
        role: v.string(),
        resolved: v.number(),
        takenOver: v.number(),
        avgResolutionMs: v.number(),
        avgFirstResponseMs: v.number(),
      })
    ),
    totals: v.object({
      open: v.number(),
      resolved: v.number(),
      avgResolutionMs: v.number(),
      avgFirstResponseMs: v.number(),
      oldestOpenMs: v.number(),
      unassignedOpen: v.number(),
    }),
  }),
  handler: async (ctx, { now }) => {
    const escalations = await Escalations.listByStatus(ctx);
    // Scope to the caller's own org (never a client-supplied value). Demo mode
    // (or no org on the identity) shows the whole seeded team.
    const orgId = ctx.concierge.orgId;
    const users =
      orgId && !process.env.ESSOS_DEMO_MODE
        ? await ctx.db
            .query("users")
            .withIndex("by_org", (q) => q.eq("orgId", orgId))
            .collect()
        : await ctx.db.query("users").collect();

    const nowMs = new Date(now).getTime();

    // Earliest "taken_over" activity per conversation = first human response.
    const firstResponseAt = new Map<string, number>();
    for (const a of await Activity.listAll(ctx, 2000)) {
      if (a.event !== "taken_over") {
        continue;
      }
      const ms = new Date(a.created_at).getTime();
      const prior = firstResponseAt.get(a.conversation_id);
      if (prior === undefined || ms < prior) {
        firstResponseAt.set(a.conversation_id, ms);
      }
    }

    interface Tally {
      firstResponseCount: number;
      resolved: number;
      takenOver: number;
      totalFirstResponseMs: number;
      totalResolutionMs: number;
    }
    const byUser = new Map<string, Tally>();
    const tallyFor = (key: string): Tally => {
      let t = byUser.get(key);
      if (!t) {
        t = {
          resolved: 0,
          takenOver: 0,
          totalResolutionMs: 0,
          totalFirstResponseMs: 0,
          firstResponseCount: 0,
        };
        byUser.set(key, t);
      }
      return t;
    };

    let resolvedCount = 0;
    let totalResolutionMs = 0;
    let totalFirstResponseMs = 0;
    let firstResponseCount = 0;
    let openCount = 0;
    let unassignedOpen = 0;
    let oldestOpenMs = 0;

    for (const e of escalations) {
      const createdMs = new Date(e.created_at).getTime();
      const key = e.assignee_user_id ?? "unassigned";
      const t = tallyFor(key);

      if (e.status === "resolved" && e.resolved_at) {
        const ms = new Date(e.resolved_at).getTime() - createdMs;
        t.resolved += 1;
        t.totalResolutionMs += ms;
        resolvedCount += 1;
        totalResolutionMs += ms;
      }
      if (e.status === "taken_over") {
        t.takenOver += 1;
      }
      if (e.status === "open") {
        openCount += 1;
        if (!e.assignee_user_id) {
          unassignedOpen += 1;
        }
        const age = nowMs - createdMs;
        if (age > oldestOpenMs) {
          oldestOpenMs = age;
        }
      }

      const responded = firstResponseAt.get(e.conversation_id);
      if (responded !== undefined && responded >= createdMs) {
        const ms = responded - createdMs;
        t.totalFirstResponseMs += ms;
        t.firstResponseCount += 1;
        totalFirstResponseMs += ms;
        firstResponseCount += 1;
      }
    }

    const members = users.map((u) => {
      const t = byUser.get(u.clerkId);
      return {
        clerkId: u.clerkId,
        name: u.name,
        email: u.email,
        role: u.role,
        resolved: t?.resolved ?? 0,
        takenOver: t?.takenOver ?? 0,
        avgResolutionMs:
          t && t.resolved > 0
            ? Math.round(t.totalResolutionMs / t.resolved)
            : 0,
        avgFirstResponseMs:
          t && t.firstResponseCount > 0
            ? Math.round(t.totalFirstResponseMs / t.firstResponseCount)
            : 0,
      };
    });

    return {
      members,
      totals: {
        open: openCount,
        resolved: resolvedCount,
        avgResolutionMs:
          resolvedCount === 0
            ? 0
            : Math.round(totalResolutionMs / resolvedCount),
        avgFirstResponseMs:
          firstResponseCount === 0
            ? 0
            : Math.round(totalFirstResponseMs / firstResponseCount),
        oldestOpenMs,
        unassignedOpen,
      },
    };
  },
});
