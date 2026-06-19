/**
 * Seed a demo concierge team and assign sample patients.
 *
 * Two modes, picked automatically:
 *
 * - With `CLERK_SECRET_KEY` set: creates (or finds) real Clerk test users using
 *   `+clerk_test` email addresses, an "Essos Concierge" organization, and org
 *   memberships with roles, then mirrors them into the Convex `users` table and
 *   assigns patients. Signing in as one of these users attributes work to them.
 * - Without Clerk: writes demo concierge rows straight into Convex `users` with
 *   synthetic ids and assigns patients, so the dashboard's ownership + team
 *   views are populated for a pure-local demo.
 *
 * Patient ownership is intentionally partial so the "unassigned queue" is
 * visible: Maya -> Ada, Diego -> Ben, Sofia left unassigned.
 *
 * Run with `pnpm seed:team`.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "..");

const TEAM = [
  {
    key: "lead",
    email: "lead+clerk_test@essos.dev",
    first: "Tess",
    last: "Lambert",
    role: "org:admin",
  },
  {
    key: "ada",
    email: "ada+clerk_test@essos.dev",
    first: "Ada",
    last: "Reyes",
    role: "org:member",
  },
  {
    key: "ben",
    email: "ben+clerk_test@essos.dev",
    first: "Ben",
    last: "Okafor",
    role: "org:member",
  },
] as const;

type TeamKey = (typeof TEAM)[number]["key"];

/** Patient -> team member key. Anything omitted stays in the unassigned queue. */
const ASSIGNMENTS: Record<string, TeamKey> = {
  pat_maya: "ada",
  pat_diego: "ben",
};

const ORG_NAME = "Essos Concierge";
const ORG_SLUG = "essos-concierge";
const DEMO_PASSWORD = "EssosDemo!2026aZ";

function loadEnvValue(key: string): string | undefined {
  if (process.env[key]) {
    return process.env[key];
  }
  for (const file of [".env.local", ".env"]) {
    const path = resolve(REPO_ROOT, file);
    if (!existsSync(path)) {
      continue;
    }
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = new RegExp(`^${key}=(.*)$`).exec(line.trim());
      if (m) {
        return m[1]?.trim();
      }
    }
  }
  return;
}

function machineBase(): string {
  return (
    loadEnvValue("CONVEX_SITE_URL")?.replace(/\/$/, "") ??
    "http://127.0.0.1:3211"
  );
}

async function machineCall(
  fn: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  const secret = loadEnvValue("CONVEX_SERVICE_SECRET");
  if (secret) {
    headers.authorization = `Bearer ${secret}`;
  }
  const res = await fetch(`${machineBase()}/machine`, {
    method: "POST",
    headers,
    body: JSON.stringify({ fn, args }),
  });
  if (!res.ok) {
    throw new Error(`machine ${fn} failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { ok: boolean; error?: string };
  if (!json.ok) {
    throw new Error(json.error ?? `machine ${fn} failed`);
  }
  return json;
}

// ---------------------------- Clerk BAPI ----------------------------

const CLERK_API = "https://api.clerk.com/v1";

async function clerkApi(
  secret: string,
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<unknown> {
  const res = await fetch(`${CLERK_API}${path}`, {
    method: init.method ?? "GET",
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(
      `Clerk ${init.method ?? "GET"} ${path} -> ${res.status} ${text}`
    );
  }
  return json;
}

async function findOrCreateUser(
  secret: string,
  member: (typeof TEAM)[number]
): Promise<string> {
  const found = (await clerkApi(
    secret,
    `/users?email_address=${encodeURIComponent(member.email)}`
  )) as Array<{ id: string }>;
  if (Array.isArray(found) && found.length > 0 && found[0]?.id) {
    return found[0].id;
  }
  const created = (await clerkApi(secret, "/users", {
    method: "POST",
    body: {
      email_address: [member.email],
      password: DEMO_PASSWORD,
      first_name: member.first,
      last_name: member.last,
      skip_password_checks: true,
    },
  })) as { id: string };
  return created.id;
}

async function findOrCreateOrg(
  secret: string,
  createdBy: string
): Promise<string> {
  const list = (await clerkApi(
    secret,
    `/organizations?query=${encodeURIComponent(ORG_SLUG)}`
  )) as { data?: Array<{ id: string; slug: string }> };
  const existing = list.data?.find((o) => o.slug === ORG_SLUG);
  if (existing) {
    return existing.id;
  }
  const created = (await clerkApi(secret, "/organizations", {
    method: "POST",
    body: { name: ORG_NAME, slug: ORG_SLUG, created_by: createdBy },
  })) as { id: string };
  return created.id;
}

async function ensureMembership(
  secret: string,
  orgId: string,
  userId: string,
  role: string
): Promise<void> {
  try {
    await clerkApi(secret, `/organizations/${orgId}/memberships`, {
      method: "POST",
      body: { user_id: userId, role },
    });
  } catch (err) {
    // Already a member (e.g. the creator is auto-admin) -> ignore.
    if (!String(err).includes("422")) {
      throw err;
    }
  }
}

async function seedWithClerk(secret: string): Promise<void> {
  const ids = new Map<TeamKey, string>();
  for (const member of TEAM) {
    const id = await findOrCreateUser(secret, member);
    ids.set(member.key, id);
    console.log(`  clerk user ${member.email} -> ${id}`);
  }

  const leadId = ids.get("lead");
  if (!leadId) {
    throw new Error("Lead user not created");
  }
  const orgId = await findOrCreateOrg(secret, leadId);
  console.log(`  org ${ORG_SLUG} -> ${orgId}`);

  for (const member of TEAM) {
    const userId = ids.get(member.key);
    if (!userId) {
      continue;
    }
    await ensureMembership(secret, orgId, userId, member.role);
    await machineCall("upsertClerkUser", {
      clerkId: userId,
      tokenIdentifier: `clerk:${userId}`,
      name: `${member.first} ${member.last}`,
      email: member.email,
      orgId,
      role: member.role,
    });
  }

  await assignPatients((key) => ids.get(key) ?? null);
}

async function seedWithoutClerk(): Promise<void> {
  console.log(
    "  CLERK_SECRET_KEY not set — writing demo concierge rows into Convex only."
  );
  const ids = new Map<TeamKey, string>();
  const orgId = "org_demo_essos";
  for (const member of TEAM) {
    const clerkId = `user_demo_${member.key}`;
    ids.set(member.key, clerkId);
    await machineCall("upsertClerkUser", {
      clerkId,
      tokenIdentifier: `clerk:${clerkId}`,
      name: `${member.first} ${member.last}`,
      email: member.email,
      orgId,
      role: member.role,
    });
  }
  await assignPatients((key) => ids.get(key) ?? null);
}

async function assignPatients(
  idFor: (key: TeamKey) => string | null
): Promise<void> {
  for (const [patientId, key] of Object.entries(ASSIGNMENTS)) {
    const assigneeUserId = idFor(key);
    if (!assigneeUserId) {
      continue;
    }
    await machineCall("assignPatient", { patientId, assigneeUserId });
    console.log(`  assigned ${patientId} -> ${key} (${assigneeUserId})`);
  }
}

async function main(): Promise<void> {
  const secret = loadEnvValue("CLERK_SECRET_KEY");
  console.log("Seeding demo concierge team…");
  if (secret) {
    await seedWithClerk(secret);
  } else {
    await seedWithoutClerk();
  }
  console.log("Done. Sign in as lead+clerk_test@essos.dev to view as a lead.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
