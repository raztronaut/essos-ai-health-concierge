import { config } from "dotenv";
import { resolve } from "node:path";
import { REPO_ROOT } from "@essos/shared";

// Load environment from the repo root so all packages share one .env.
config({ path: resolve(REPO_ROOT, ".env"), quiet: true });
config({ path: resolve(REPO_ROOT, ".env.local"), override: true, quiet: true });

export const EVE_BASE_URL =
  process.env.EVE_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:3000";

export const DEMO_PATIENT = process.env.ESSOS_DEMO_PATIENT ?? "pat_maya";

export const CONCIERGE_HANDLES = (process.env.ESSOS_CONCIERGE_HANDLES ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
