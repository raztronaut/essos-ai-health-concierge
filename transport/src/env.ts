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

export const PATIENT_MINIAPP_BASE_URL =
  process.env.ESSOS_PATIENT_MINIAPP_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:8081";

export type MiniappDeliveryMode =
  | "link"
  | "spectrum_app"
  | "customized_miniapp";

function miniappDeliveryMode(): MiniappDeliveryMode {
  const raw = process.env.ESSOS_MINIAPP_DELIVERY?.trim();
  if (raw === "link" || raw === "spectrum_app") {
    return raw;
  }
  // Backward-compatible alias for the first App Clip spike.
  if (raw === "spectrum_card" || raw === "customized_miniapp") {
    return "customized_miniapp";
  }
  // Reviewer default: use Spectrum's Apple-approved Mini App launcher card.
  return "spectrum_app";
}

export const MINIAPP_DELIVERY = miniappDeliveryMode();

export const APPLE_TEAM_ID = process.env.ESSOS_APPLE_TEAM_ID?.trim() || null;

export const IMESSAGE_EXTENSION_BUNDLE_ID =
  process.env.ESSOS_IMESSAGE_EXTENSION_BUNDLE_ID?.trim() ||
  "com.essos.raziworktrial.MessagesExtension";

export const APP_STORE_ID = process.env.ESSOS_APP_STORE_ID
  ? Number.parseInt(process.env.ESSOS_APP_STORE_ID, 10)
  : null;

export const PATIENT_CARD_TTL_MINUTES = intEnv(
  "ESSOS_PATIENT_CARD_TTL_MINUTES",
  60
);

/** Concierge handles, normalized so detection survives formatting differences. */
export const CONCIERGE_HANDLES = (process.env.ESSOS_CONCIERGE_HANDLES ?? "")
  .split(",")
  .map((s) => normalizeHandle(s))
  .filter((handle): handle is string => handle != null);

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/** Pipeline tunables (see ADR 020). */
/** How long to wait for a burst to settle before generating one reply. */
export const DEBOUNCE_MS = intEnv("ESSOS_DEBOUNCE_MS", 5000);
/** Delay between reply bubbles so a multi-part answer reads naturally. */
export const SEND_PACING_MS = intEnv("ESSOS_SEND_PACING_MS", 800);
/** Days to retain `job_failures` rows before the periodic sweep deletes them. */
export const JOB_FAILURE_RETENTION_DAYS = intEnv(
  "ESSOS_JOB_FAILURE_RETENTION_DAYS",
  30
);
