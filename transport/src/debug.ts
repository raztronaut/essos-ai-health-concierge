/** Shared debug logging for the transport, gated on `ESSOS_DEBUG=1`. */
export const DEBUG = process.env.ESSOS_DEBUG === "1";

export function debug(scope: string, ...args: unknown[]): void {
  if (DEBUG) {
    console.error(`[${scope}]`, ...args);
  }
}
