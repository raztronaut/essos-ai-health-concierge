import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

// Repo root is two levels up from slack/src.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Load environment from the repo root so all packages share one .env.
config({ path: resolve(REPO_ROOT, ".env"), quiet: true });
config({ path: resolve(REPO_ROOT, ".env.local"), override: true, quiet: true });

/** App-level token (xapp-…) — enables Socket Mode. */
export const SLACK_APP_TOKEN = process.env.SLACK_APP_TOKEN?.trim() || null;

/** Bot token (xoxb-…) from OAuth install — used for all Web API calls. */
export const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN?.trim() || null;

/** Channel id (e.g. C0123…) where escalation cards are posted. */
export const SLACK_ESCALATION_CHANNEL_ID =
  process.env.SLACK_ESCALATION_CHANNEL_ID?.trim() || null;

/** Optional channel id for a compact operational activity feed. */
export const SLACK_ACTIVITY_CHANNEL_ID =
  process.env.SLACK_ACTIVITY_CHANNEL_ID?.trim() || null;

/** Base URL for "Open in dashboard" deep links. */
export const DASHBOARD_URL = (
  process.env.ESSOS_DASHBOARD_URL ?? "http://localhost:4000"
).replace(/\/$/, "");

/** Slash command name (without the leading slash configured in Slack). */
export const SLASH_COMMAND = process.env.SLACK_SLASH_COMMAND ?? "/essos";
