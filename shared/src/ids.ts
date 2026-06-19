import { randomUUID } from "node:crypto";

/** Short, prefixed, sortable-ish id, e.g. `msg_a1b2c3d4`. */
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
