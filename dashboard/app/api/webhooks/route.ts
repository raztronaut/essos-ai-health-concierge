import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";

/**
 * Clerk -> Convex user/org sync. Verified with the svix signing secret, then
 * forwarded to the Convex machine endpoint (service secret). Backs up the
 * on-sign-in `storeUser` path so the `users`/membership tables stay current
 * even for offline members. See clerk-webhooks + ADR 013.
 */
const isProduction = process.env.NODE_ENV === "production";

/** Convex machine endpoint base URL; refuses the localhost fallback in prod. */
function machineBase(): string {
  const configured = process.env.CONVEX_SITE_URL?.replace(/\/$/, "");
  if (configured) {
    return configured;
  }
  if (isProduction) {
    throw new Error(
      "CONVEX_SITE_URL is not set; refusing localhost fallback in production"
    );
  }
  return "http://127.0.0.1:3211";
}

async function machine(
  fn: string,
  args: Record<string, unknown>
): Promise<void> {
  const secret = process.env.CONVEX_SERVICE_SECRET;
  if (!secret && isProduction) {
    throw new Error(
      "CONVEX_SERVICE_SECRET is not set; cannot authenticate machine sync in production"
    );
  }
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (secret) {
    headers.authorization = `Bearer ${secret}`;
  }
  const res = await fetch(`${machineBase()}/machine`, {
    method: "POST",
    headers,
    body: JSON.stringify({ fn, args }),
  });
  // Surface downstream failures so the POST handler returns non-2xx and Clerk
  // retries the delivery, instead of silently dropping the sync.
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Convex machine sync "${fn}" failed (${res.status}): ${detail.slice(0, 200)}`
    );
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    console.error("Clerk webhook verification failed:", err);
    return new Response("Verification failed", { status: 400 });
  }

  try {
    if (evt.type === "user.created" || evt.type === "user.updated") {
      const { id, email_addresses, first_name, last_name, image_url } =
        evt.data;
      const email = email_addresses?.[0]?.email_address ?? "";
      const name =
        `${first_name ?? ""} ${last_name ?? ""}`.trim() || "Concierge";
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
  } catch (err) {
    // Return 5xx so Clerk retries; do not ack a sync that didn't land.
    console.error("Clerk webhook sync failed:", err);
    return new Response("Sync failed", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
