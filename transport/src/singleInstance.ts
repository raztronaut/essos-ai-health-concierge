import {
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Acquire a host-local single-instance lock via a pidfile.
 *
 * Spectrum Cloud allows only one live consumer per project; two transports on
 * one machine fight over the stream and churn endlessly (the original wedge).
 * In dev this stops a stray second `pnpm transport:imessage` from starting; in
 * prod each container has its own tmpdir, so it's a harmless safety net.
 *
 * Throws if another live process already holds the lock. A stale pidfile (the
 * recorded pid is gone) is reclaimed. The lock is released on normal exit.
 */
export function acquireSingleInstanceLock(name: string): void {
  const pidfile = join(tmpdir(), `essos-${name}.pid`);

  if (existsSync(pidfile)) {
    const existing = Number.parseInt(readFileSync(pidfile, "utf8").trim(), 10);
    if (Number.isInteger(existing) && existing !== process.pid && isAlive(existing)) {
      throw new Error(
        `Another ${name} transport is already running (pid ${existing}). ` +
          `Stop it first, or remove ${pidfile} if it's stale.`
      );
    }
  }

  writeFileSync(pidfile, String(process.pid), "utf8");

  const release = (): void => {
    try {
      if (
        existsSync(pidfile) &&
        readFileSync(pidfile, "utf8").trim() === String(process.pid)
      ) {
        unlinkSync(pidfile);
      }
    } catch {
      // Best-effort cleanup; never block shutdown on it.
    }
  };
  process.once("exit", release);
}

/** Whether a pid is a live process (signal 0 probes without delivering). */
function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM means the process exists but is owned by another user.
    return (err as NodeJS.ErrnoException).code === "EPERM";
  }
}
