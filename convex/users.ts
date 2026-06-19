import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { conciergeQuery } from "./lib/functions.js";
import { nowIso } from "./lib/util.js";

/** List concierge profiles (optionally scoped to an org) for team views. */
export const listConcierges = conciergeQuery({
  args: { orgId: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, { orgId }) => {
    if (orgId) {
      return await ctx.db
        .query("users")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect();
    }
    return await ctx.db.query("users").collect();
  },
});

/** Upsert a Clerk user (called by the Clerk webhook via the machine path). */
export const upsertClerkUser = internalMutation({
  args: {
    clerkId: v.string(),
    tokenIdentifier: v.string(),
    name: v.string(),
    email: v.string(),
    pictureUrl: v.optional(v.union(v.string(), v.null())),
    orgId: v.optional(v.union(v.string(), v.null())),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        tokenIdentifier: args.tokenIdentifier,
        name: args.name,
        email: args.email,
        pictureUrl: args.pictureUrl ?? existing.pictureUrl,
        orgId: args.orgId ?? existing.orgId,
        role: args.role ?? existing.role,
        updatedAt: nowIso(),
      });
      return;
    }
    await ctx.db.insert("users", {
      tokenIdentifier: args.tokenIdentifier,
      clerkId: args.clerkId,
      name: args.name,
      email: args.email,
      pictureUrl: args.pictureUrl ?? null,
      orgId: args.orgId ?? null,
      role: args.role ?? "org:member",
      createdAt: nowIso(),
      updatedAt: null,
    });
  },
});

/** Update a user's org membership/role (organizationMembership.* webhook). */
export const setClerkMembership = internalMutation({
  args: { clerkId: v.string(), orgId: v.union(v.string(), v.null()), role: v.string() },
  handler: async (ctx, { clerkId, orgId, role }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (!existing) return;
    await ctx.db.patch(existing._id, { orgId, role, updatedAt: nowIso() });
  },
});

export const deleteClerkUser = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});
