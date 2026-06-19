/**
 * Small, dependency-free text utilities.
 */

/** Levenshtein edit distance between two strings. */
export function levenshtein(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  if (a.length === 0) {
    return b.length;
  }
  if (b.length === 0) {
    return a.length;
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
  return prev[b.length] ?? 0;
}

/**
 * Edit distance normalized to 0..1 by the longer string: 0 means the strings
 * are identical, 1 means completely different. Used as a draft-quality signal —
 * how much a concierge changed Eve's suggested reply before sending (ADR 022).
 */
export function normalizedEditDistance(a: string, b: string): number {
  const longest = Math.max(a.length, b.length);
  if (longest === 0) {
    return 0;
  }
  return levenshtein(a, b) / longest;
}
