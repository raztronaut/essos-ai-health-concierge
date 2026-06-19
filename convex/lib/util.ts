/** Short, prefixed id, e.g. `msg_a1b2c3d4`. Mirrors the previous shared/ids.ts. */
export function newId(prefix: string): string {
  // crypto.randomUUID is available in the Convex runtime.
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

/** ISO-8601 timestamp. Sortable lexicographically, matches the legacy store. */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Edit distance normalized to 0..1 by the longer string (0 = identical,
 * 1 = completely different). Mirrors `normalizedEditDistance` in `@essos/shared`
 * — duplicated here because Convex functions do not depend on that package.
 * Used as a draft-quality signal: how much a concierge changed Eve's draft.
 */
export function normalizedEditDistance(a: string, b: string): number {
  const longest = Math.max(a.length, b.length);
  if (longest === 0) {
    return 0;
  }
  if (a === b) {
    return 0;
  }
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        (curr[j - 1] ?? 0) + 1,
        (prev[j] ?? 0) + 1,
        (prev[j - 1] ?? 0) + cost
      );
    }
    [prev, curr] = [curr, prev];
  }
  return (prev[b.length] ?? 0) / longest;
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
