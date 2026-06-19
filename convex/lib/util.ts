/** Short, prefixed id, e.g. `msg_a1b2c3d4`. Mirrors the previous shared/ids.ts. */
export function newId(prefix: string): string {
  // crypto.randomUUID is available in the Convex runtime.
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

/** ISO-8601 timestamp. Sortable lexicographically, matches the legacy store. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** Parse the JSON array stored in escalations.suggested_reply_sources. */
export function parseSuggestedReplySources(
  raw: string | null | undefined
): string[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === "string");
    }
    return [];
  } catch {
    return [];
  }
}
