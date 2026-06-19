import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";

/**
 * Clerk -> Convex user/org sync. Verified with the svix signing secret, then
 * forwarded to the Convex machine endpoint (service secret). Backs up the
 * on-sign-in `storeUser` path so the `users`/membership tables stay current
 * even for offline members. See clerk-webhooks + ADR 013.
 */
async function machine(
  fn: string,
  args: Record<string, unknown>
): Promise<void> {
  const base =
    process.env.CONVEX_SITE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:3211";
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  const secret = process.env.CONVEX_SERVICE_SECRET;
  if (secret) {
    headers.authorization = `Bearer ${secret}`;
  }
  await fetch(`${base}/machine`, {
    method: "POST",
    headers,
    body: JSON.stringify({ fn, args }),
  });
}

export async function POST(req: NextRequest): Promise<Response> {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    console.error("Clerk webhook verification failed:", err);
    return new Response("Verification failed", { status: 400 });
  }

  if (evt.type === "user.created" || evt.type === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    const email = email_addresses?.[0]?.email_address ?? "";
    const name = `${first_name ?? ""} ${last_name ?? ""}`.trim() || "Concierge";
    await machine("upsertClerkUser", {
      clerkId: id,
      tokenIdentifier: `clerk:${id}`,
      name,
      email,
      pictureUrl: image_url ?? null,
    });
  } else if (evt.type === "user.deleted") {
    if (evt.data.id) {
      await machine("deleteClerkUser", { clerkId: evt.data.id });
    }
  } else if (
    evt.type === "organizationMembership.created" ||
    evt.type === "organizationMembership.updated"
  ) {
    const { organization, public_user_data, role } = evt.data;
    await machine("setClerkMembership", {
      clerkId: public_user_data.user_id,
      orgId: organization.id,
      role,
    });
  } else if (evt.type === "organizationMembership.deleted") {
    const { public_user_data } = evt.data;
    await machine("setClerkMembership", {
      clerkId: public_user_data.user_id,
      orgId: null,
      role: "org:member",
    });
  }

  return new Response("OK", { status: 200 });
}
