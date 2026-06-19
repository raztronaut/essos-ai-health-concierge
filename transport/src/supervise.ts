import { type ChildProcess, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * Restart-on-crash supervisor for the iMessage transport (dev convenience).
 *
 * The transport now exits non-zero on a dead Spectrum stream (see `health.ts`)
 * so a supervisor can recover it. In prod, Railway is that supervisor; locally
 * this script plays the same role: respawn the worker with capped exponential
 * backoff, and forward signals so Ctrl-C shuts down cleanly.
 */
const entry = fileURLToPath(new URL("./imessage.ts", import.meta.url));

const MIN_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;
/** Treat a run that lasted this long as "healthy" and reset backoff. */
const HEALTHY_RUN_MS = 60_000;

let backoffMs = MIN_BACKOFF_MS;
let child: ChildProcess | null = null;
let shuttingDown = false;

function start(): void {
  const startedAt = Date.now();
  child = spawn("tsx", [entry], { stdio: "inherit" });

  child.on("exit", (code, signal) => {
    child = null;
    if (shuttingDown) {
      return;
    }
    const ranFor = Date.now() - startedAt;
    if (ranFor >= HEALTHY_RUN_MS) {
      backoffMs = MIN_BACKOFF_MS;
    }
    console.error(
      `[transport.supervisor] worker exited (code=${code}, signal=${signal}); ` +
        `restarting in ${Math.round(backoffMs / 1000)}s`
    );
    setTimeout(start, backoffMs);
    backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
  });
}

function shutdown(signal: NodeJS.Signals): void {
  shuttingDown = true;
  child?.kill(signal);
  // Give the worker a moment to release its single-instance lock, then exit.
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start();
