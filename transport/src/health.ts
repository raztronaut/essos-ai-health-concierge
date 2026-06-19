import { createServer, type Server } from "node:http";
import { debug } from "./debug.js";

/**
 * Stream liveness for the iMessage transport.
 *
 * Spectrum Cloud exposes no public stream-health event: on a non-retryable
 * connection failure it keeps retrying internally and the `app.messages`
 * async iterator simply stops yielding — no throw, no end. A process in that
 * state stays "up" while silently delivering nothing, so a supervisor that
 * only restarts on exit never recovers it (this is the exact failure we hit).
 *
 * The fix is to derive health from the two observable signals we do have —
 * Spectrum's own `[spectrum.stream]` console logs and inbound message activity
 * — and to crash loudly (exit non-zero) when the stream is stale long enough,
 * so the supervisor restarts us into a clean connection.
 */
export interface StreamHealthOptions {
  /** How often the watchdog checks staleness. */
  checkIntervalMs?: number;
  /** Optional port for a `GET /healthz` liveness probe (Railway healthcheck). */
  healthPort?: number;
  /** Injectable for tests; defaults to logging + `process.exit(1)`. */
  onStale?: (reason: string) => void;
  /** Exit once the stream has been continuously unhealthy for this long. */
  staleAfterMs?: number;
}

export interface StreamHealth {
  /** Healthy iff the Spectrum stream is live AND Eve is reachable. */
  isHealthy(): boolean;
  /** Record a healthy signal (stream recovered, or a message was received). */
  markHealthy(): void;
  /** Record an unhealthy signal (stream persistently failing). */
  markUnhealthy(reason: string): void;
  /**
   * Record whether Eve's HTTP API is reachable. Unlike a stale stream this does
   * not trigger a process exit (a restart wouldn't bring Eve back, and inbound
   * still degrades to a holding message + escalation); it only surfaces the
   * condition via `/healthz` and a one-time loud log on transition.
   */
  setEveReachable(reachable: boolean, detail?: string): void;
  stop(): void;
}

const DEFAULT_STALE_AFTER_MS = 120_000;
const DEFAULT_CHECK_INTERVAL_MS = 15_000;

export function startStreamHealth(
  opts: StreamHealthOptions = {}
): StreamHealth {
  const staleAfterMs = opts.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;
  const checkIntervalMs = opts.checkIntervalMs ?? DEFAULT_CHECK_INTERVAL_MS;
  const onStale =
    opts.onStale ??
    ((reason: string) => {
      console.error(
        `[transport.health] stream stale for >${Math.round(staleAfterMs / 1000)}s ` +
          `(${reason}); exiting so the supervisor can restart with a fresh connection.`
      );
      process.exit(1);
    });

  let unhealthySince: number | null = null;
  let lastReason = "";
  let eveReachable = true;
  let eveDetail = "";

  const markHealthy = (): void => {
    if (unhealthySince !== null) {
      debug("transport.health", "stream recovered");
    }
    unhealthySince = null;
  };
  const markUnhealthy = (reason: string): void => {
    lastReason = reason;
    if (unhealthySince === null) {
      unhealthySince = Date.now();
      debug("transport.health", "stream unhealthy:", reason);
    }
  };
  const setEveReachable = (reachable: boolean, detail = ""): void => {
    if (reachable === eveReachable) {
      return; // only act on transitions
    }
    eveReachable = reachable;
    eveDetail = detail;
    if (reachable) {
      console.error("[transport.health] Eve reachable again.");
    } else {
      console.error(
        `[transport.health] Eve UNREACHABLE (${detail}). Replies will degrade ` +
          "to a holding message + human escalation until Eve is back."
      );
    }
  };
  const streamHealthy = (): boolean => unhealthySince === null;
  const isHealthy = (): boolean => streamHealthy() && eveReachable;

  const timer = setInterval(() => {
    if (
      unhealthySince !== null &&
      Date.now() - unhealthySince >= staleAfterMs
    ) {
      onStale(lastReason || "no stream activity");
    }
  }, checkIntervalMs);
  timer.unref?.();

  let server: Server | null = null;
  if (opts.healthPort) {
    server = createServer((req, res) => {
      if (req.url === "/healthz") {
        const healthy = isHealthy();
        res.writeHead(healthy ? 200 : 503, { "content-type": "text/plain" });
        if (healthy) {
          res.end("ok");
        } else {
          const parts = [
            streamHealthy() ? null : `stream: ${lastReason}`,
            eveReachable ? null : `eve: ${eveDetail}`,
          ].filter(Boolean);
          res.end(parts.join("; ") || "unhealthy");
        }
        return;
      }
      res.writeHead(404).end();
    });
    // A health-probe bind failure must never take down the transport itself —
    // log it and carry on without the probe.
    server.on("error", (err) => {
      console.error(
        `[transport.health] liveness probe failed to bind :${opts.healthPort} (${String(err)}); continuing without it.`
      );
    });
    server.listen(opts.healthPort, () => {
      debug("transport.health", `liveness probe on :${opts.healthPort}`);
    });
    server.unref?.();
  }

  return {
    markHealthy,
    markUnhealthy,
    setEveReachable,
    isHealthy,
    stop: () => {
      clearInterval(timer);
      server?.close();
    },
  };
}

/**
 * Bridge Spectrum's internal `[spectrum.stream]` console logs into a
 * {@link StreamHealth} tracker by wrapping `console.error`/`console.warn`.
 * `persistently failing` is the signal that the connection is genuinely down
 * (transient `interrupted`/`recovered` churn is normal and ignored). Returns a
 * restore function. We tap console because the SDK exposes no health event.
 */
export function monitorSpectrumStreamLogs(health: StreamHealth): () => void {
  const originals = {
    error: console.error.bind(console),
    warn: console.warn.bind(console),
    log: console.log.bind(console),
  };
  const scan = (args: unknown[]): void => {
    const line = args.map((a) => (typeof a === "string" ? a : "")).join(" ");
    if (!line.includes("[spectrum.stream]")) {
      return;
    }
    if (line.includes("persistently failing")) {
      health.markUnhealthy("spectrum stream persistently failing");
    } else if (line.includes("recovered")) {
      health.markHealthy();
    }
  };
  console.error = (...args: unknown[]) => {
    scan(args);
    originals.error(...args);
  };
  console.warn = (...args: unknown[]) => {
    scan(args);
    originals.warn(...args);
  };
  console.log = (...args: unknown[]) => {
    scan(args);
    originals.log(...args);
  };
  return () => {
    console.error = originals.error;
    console.warn = originals.warn;
    console.log = originals.log;
  };
}
