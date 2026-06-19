/** Format an ISO-ish timestamp (the seed stores `YYYY-MM-DDTHH:mm[:ss]`). */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Compact "time ago" label for SLA/waiting signals ("3m ago", "2h ago"). */
export function formatRelativeTime(
  value: string | null | undefined,
  now: number = Date.now()
): string {
  if (!value) {
    return "—";
  }
  const ms = new Date(value).getTime();
  if (Number.isNaN(ms)) {
    return value;
  }
  const sec = Math.max(0, Math.round((now - ms) / 1000));
  if (sec < 60) {
    return "just now";
  }
  const min = Math.round(sec / 60);
  if (min < 60) {
    return `${min}m ago`;
  }
  const hr = Math.round(min / 60);
  if (hr < 24) {
    return `${hr}h ago`;
  }
  return `${Math.round(hr / 24)}d ago`;
}

/** Turn a snake_case enum into a human label ("travel_logistics" -> "Travel logistics"). */
export function humanize(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  const spaced = value.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Format a duration in milliseconds into a human-readable string ("45m", "2h 15m"). */
export function formatDuration(ms: number): string {
  if (ms <= 0) {
    return "—";
  }
  const min = Math.round(ms / 60_000);
  if (min < 60) {
    return `${min}m`;
  }
  const hr = Math.floor(min / 60);
  const remainingMin = min % 60;
  return remainingMin > 0 ? `${hr}h ${remainingMin}m` : `${hr}h`;
}

/** Pluralize a word based on a count. */
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) {
    return `${count} ${singular}`;
  }
  return `${count} ${plural ?? `${singular}s`}`;
}

/** Strip the "org:" prefix from a Clerk role string. */
export function stripOrgPrefix(role: string | null | undefined): string {
  if (!role) {
    return "Member";
  }
  return humanize(role.replace(/^org:/, ""));
}

/** Build a standardized concierge message signature. */
export function buildSignature(name?: string | null): string {
  const trimmed = name?.trim();
  return trimmed ? `— ${trimmed}, Essos Care Team` : "— Essos Care Team";
}

export const UNASSIGNED_LABEL = "Unassigned";

/** Minutes a flag must wait before it counts as breaching its (demo) SLA, by level. */
const SLA_MINUTES: Record<string, number> = { High: 15, Med: 60 };

/** Whether an open escalation has waited past its level's SLA threshold. */
export function isSlaBreached(
  level: string,
  createdAt: string | null | undefined,
  now: number = Date.now()
) {
  if (!createdAt) {
    return false;
  }
  const ms = new Date(createdAt).getTime();
  if (Number.isNaN(ms)) {
    return false;
  }
  const limit = SLA_MINUTES[level] ?? 60;
  return now - ms > limit * 60_000;
}

/** Sort escalations most-urgent-first: High before Med, then longest-waiting first. */
export function sortEscalationsByUrgency<
  T extends { level: string; created_at: string },
>(escalations: T[]): T[] {
  const rank = (level: string): number => (level === "High" ? 0 : 1);
  return [...escalations].sort((a, b) => {
    const byLevel = rank(a.level) - rank(b.level);
    if (byLevel !== 0) {
      return byLevel;
    }
    return a.created_at.localeCompare(b.created_at); // oldest first
  });
}
