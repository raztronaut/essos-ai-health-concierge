/**
 * Shared stable empty array. Reuse this instead of inline `?? []` fallbacks
 * when the value feeds memoized children or hook dependency arrays — a fresh
 * `[]` literal every render gives a new reference that silently busts those
 * memos. The `never[]` type stays assignable to any concrete `T[]` prop.
 */
export const EMPTY_ARRAY: never[] = [];
