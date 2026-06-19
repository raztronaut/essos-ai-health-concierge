/**
 * Pre-flight for `pnpm dev`. Catches the two failure modes that silently break
 * the dashboard (a missing Convex URL, or Convex never having been initialized)
 * and prints one-line guidance instead of letting the UI hang on a dead socket.
 * Warnings are non-fatal so the dev orchestrator still starts.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "..");

function hasKey(file: string, key: string): boolean {
  const path = resolve(REPO_ROOT, file);
  if (!existsSync(path)) {
    return false;
  }
  return readFileSync(path, "utf8")
    .split("\n")
    .some((l) => l.trim().startsWith(`${key}=`) && l.trim() !== `${key}=`);
}

const warnings: string[] = [];

if (!existsSync(resolve(REPO_ROOT, ".env.local"))) {
  warnings.push(
    "No .env.local at repo root — run `npx convex dev` once to initialize the deployment."
  );
} else if (!hasKey(".env.local", "CONVEX_URL")) {
  warnings.push(
    "CONVEX_URL missing from .env.local — `npx convex dev` writes it; the agent/transport need it."
  );
}

if (!hasKey("dashboard/.env.local", "NEXT_PUBLIC_CONVEX_URL")) {
  warnings.push(
    "NEXT_PUBLIC_CONVEX_URL missing from dashboard/.env.local — the dashboard can't reach Convex without it."
  );
}

if (warnings.length === 0) {
  console.log("✓ Pre-flight OK — starting Convex, Eve, and the dashboard.");
} else {
  console.warn("\n⚠ Essos dev pre-flight warnings:");
  for (const w of warnings) {
    console.warn(`  • ${w}`);
  }
  console.warn(
    "\nStarting anyway. The Convex dev server must stay running alongside the dashboard.\n"
  );
}
