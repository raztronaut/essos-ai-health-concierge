import { fileURLToPath } from "node:url";
import { dirname, isAbsolute, parse, resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Find the monorepo root by walking up from a starting directory looking for
 * the root `package.json` (name `essos-concierge`). This is robust whether the
 * shared package is consumed from source, a symlinked workspace dep, or a
 * `file:` copy inside an isolated sub-project (e.g. the Eve agent).
 */
function findRepoRoot(start: string): string | null {
  let dir = start;
  const { root } = parse(dir);
  while (true) {
    const pkgPath = resolve(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
          name?: string;
        };
        if (pkg.name === "essos-concierge") return dir;
      } catch {
        // ignore malformed package.json and keep walking up
      }
    }
    if (dir === root) return null;
    dir = dirname(dir);
  }
}

/** Workspace root. Prefers the marker search; falls back to path math. */
export const REPO_ROOT =
  findRepoRoot(process.cwd()) ??
  findRepoRoot(here) ??
  resolve(here, "..", "..");

/** Absolute path to the local SQLite store, configurable via ESSOS_DB_PATH. */
export function resolveDbPath(): string {
  const fromEnv = process.env.ESSOS_DB_PATH;
  if (fromEnv && fromEnv.trim().length > 0) {
    return isAbsolute(fromEnv) ? fromEnv : resolve(REPO_ROOT, fromEnv);
  }
  return resolve(REPO_ROOT, ".data", "essos.db");
}

export const EVE_BASE_URL =
  process.env.EVE_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:3000";
