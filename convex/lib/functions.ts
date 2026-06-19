import {
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { nowIso } from "./util.js";

/**
 * Resolved concierge identity attached to every dashboard query/mutation.
 *
 * - `label` is the stable string written to `assignee`/`actor` (real name/email,
 *   or "dashboard" in the dev fallback).
 * - `orgId` scopes team views to the active Clerk Organization when present.
 *
 * Auth posture: when `ESSOS_REQUIRE_AUTH` is set on the deployment, a missing
 * Clerk identity throws. Otherwise (local demo) it falls back to a dev concierge
 * so the dashboard runs without Clerk keys configured.
 */
export interface Concierge {
  clerkId: string | null;
  /** Team lead (Clerk org:admin): sees all patients and can assign anyone. */
  isLead: boolean;
  label: string;
  orgId: string | null;
  role: string;
}

/**
 * In the dev fallback (no Clerk identity, `ESSOS_REQUIRE_AUTH` unset) the local
 * operator is treated as a lead so the full demo dataset is visible.
 */
async function resolveConcierge(
  ctx: QueryCtx | MutationCtx
): Promise<Concierge> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    if (process.env.ESSOS_REQUIRE_AUTH) {
      throw new Error("Not authenticated");
    }
    return {
      label: "dashboard",
      clerkId: null,
      orgId: null,
      role: "org:admin",
      isLead: true,
    };
  }
  const label =
    identity.name ?? identity.nickname ?? identity.email ?? identity.subject;
  const orgId =
    (identity.orgId as string | undefined) ??
    (identity.org_id as string | undefined) ??
    null;
  const role =
    (identity.orgRole as string | undefined) ??
    (identity.org_role as string | undefined) ??
    "org:member";
  // In demo mode, a signed-in user who hasn't joined an org yet is treated as a
  // lead so a reviewer who just created an account lands on a populated, full
  // dashboard (and can use the "view as" switcher to explore each role).
  const demoLead = Boolean(process.env.ESSOS_DEMO_MODE) && !orgId;
  return {
    label,
    clerkId: identity.subject,
    orgId,
    role,
    isLead: role === "org:admin" || demoLead,
  };
}

/** A concierge identity narrowed to what ownership scoping + attribution need. */
export interface Scope {
  clerkId: string | null;
  isLead: boolean;
  /** Display label stamped on assignee/actor for writes. */
  label: string;
}

/**
 * The scope a read/write should run under. Normally the signed-in concierge,
 * but in demo mode (`ESSOS_DEMO_MODE`) an optional `viewAsUserId` lets the
 * dashboard preview (and act) as another concierge — role + name are looked up
 * from the synced `users` table. Ignored entirely when demo mode is off, so it
 * can never be used to bypass authorization in production.
 */
export async function effectiveScope(
  ctx: QueryCtx | MutationCtx,
  concierge: Concierge,
  viewAsUserId?: string | null
): Promise<Scope> {
  if (process.env.ESSOS_DEMO_MODE && viewAsUserId) {
    const target = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", viewAsUserId))
      .unique();
    return {
      clerkId: viewAsUserId,
      isLead: target?.role === "org:admin",
      label: target?.name ?? viewAsUserId,
    };
  }
  return {
    clerkId: concierge.clerkId,
    isLead: concierge.isLead,
    label: concierge.label,
  };
}

/** Upsert the signed-in Clerk user into the `users` table (no-op in dev fallback). */
async function syncConciergeUser(ctx: MutationCtx): Promise<void> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return;
  }
  const existing = await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique();
  const orgId =
    (identity.orgId as string | undefined) ??
    (identity.org_id as string | undefined) ??
    null;
  const role =
    (identity.orgRole as string | undefined) ??
    (identity.org_role as string | undefined) ??
    "org:member";
  if (existing) {
    await ctx.db.patch(existing._id, {
      name: identity.name ?? existing.name,
      email: identity.email ?? existing.email,
      pictureUrl:
        (identity.pictureUrl as string | undefined) ?? existing.pictureUrl,
      orgId,
      role,
      updatedAt: nowIso(),
    });
    return;
  }
  await ctx.db.insert("users", {
    tokenIdentifier: identity.tokenIdentifier,
    clerkId: identity.subject,
    name: identity.name ?? "Concierge",
    email: identity.email ?? "",
    pictureUrl: (identity.pictureUrl as string | undefined) ?? null,
    orgId,
    role,
    createdAt: nowIso(),
    updatedAt: null,
  });
}

/** Dashboard read: Clerk-gated (or dev fallback). Exposes `ctx.concierge`. */
export const conciergeQuery = customQuery(
  query,
  customCtx(async (ctx) => ({ concierge: await resolveConcierge(ctx) }))
);

/** Dashboard write: resolves + syncs the concierge and stamps actor/assignee. */
export const conciergeMutation = customMutation(
  mutation,
  customCtx(async (ctx) => {
    await syncConciergeUser(ctx);
    return { concierge: await resolveConcierge(ctx) };
  })
);
