import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { normalizeHandle } from "./handles.js";

// Repo root is two levels up from transport/src.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Load environment from the repo root so all packages share one .env.
config({ path: resolve(REPO_ROOT, ".env"), quiet: true });
config({ path: resolve(REPO_ROOT, ".env.local"), override: true, quiet: true });

export const EVE_BASE_URL =
  process.env.EVE_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:3000";

/**
 * Shared secret presented to Eve's session API as `Authorization: Bearer …`.
 * Optional for loopback dev (Eve's `localDev()` admits localhost); required for
 * a non-loopback/deployed agent. Must match `ESSOS_TRANSPORT_SECRET` on Eve.
 */
export const TRANSPORT_SECRET =
  process.env.ESSOS_TRANSPORT_SECRET?.trim() || null;

export const DEMO_PATIENT = process.env.ESSOS_DEMO_PATIENT ?? "pat_maya";

/**
 * Guest mode: an unknown iMessage sender is auto-provisioned a demo patient
 * (cloned from `ESSOS_GUEST_TEMPLATE`, default pat_maya) so anyone can text the
 * line and start chatting with Eve. Off by default; enable for the public demo.
 */
export const GUEST_MODE = Boolean(process.env.ESSOS_GUEST_MODE);
export const GUEST_TEMPLATE = process.env.ESSOS_GUEST_TEMPLATE || undefined;

/** Concierge handles, normalized so detection survives formatting differences. */
export const CONCIERGE_HANDLES = (process.env.ESSOS_CONCIERGE_HANDLES ?? "")
  .split(",")
  .map((s) => normalizeHandle(s))
  .filter((handle): handle is string => handle != null);
