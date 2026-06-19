import { config } from "dotenv";
import { resolve } from "node:path";
import { REPO_ROOT } from "@essos/shared";
import { normalizeHandle } from "./handles.js";

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
export const TRANSPORT_SECRET = process.env.ESSOS_TRANSPORT_SECRET?.trim() || null;

export const DEMO_PATIENT = process.env.ESSOS_DEMO_PATIENT ?? "pat_maya";

/** Concierge handles, normalized so detection survives formatting differences. */
export const CONCIERGE_HANDLES = (process.env.ESSOS_CONCIERGE_HANDLES ?? "")
  .split(",")
  .map((s) => normalizeHandle(s))
  .filter((handle): handle is string => handle != null);
