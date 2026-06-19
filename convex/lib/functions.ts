import {
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { mutation, query } from "../_generated/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";
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
  label: string;
  clerkId: string | null;
  orgId: string | null;
}

async function resolveConcierge(ctx: QueryCtx | MutationCtx): Promise<Concierge> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    if (process.env.ESSOS_REQUIRE_AUTH) {
      throw new Error("Not authenticated");
    }
    return { label: "dashboard", clerkId: null, orgId: null };
  }
  const label =
    identity.name ??
    identity.nickname ??
    identity.email ??
    identity.subject;
  const orgId =
    (identity.orgId as string | undefined) ??
    (identity.org_id as string | undefined) ??
    null;
  return { label, clerkId: identity.subject, orgId };
}

/** Upsert the signed-in Clerk user into the `users` table (no-op in dev fallback). */
async function syncConciergeUser(ctx: MutationCtx): Promise<void> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return;
  const existing = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
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
      pictureUrl: (identity.pictureUrl as string | undefined) ?? existing.pictureUrl,
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
  customCtx(async (ctx) => ({ concierge: await resolveConcierge(ctx) })),
);

/** Dashboard write: resolves + syncs the concierge and stamps actor/assignee. */
export const conciergeMutation = customMutation(
  mutation,
  customCtx(async (ctx) => {
    await syncConciergeUser(ctx);
    return { concierge: await resolveConcierge(ctx) };
  }),
);
