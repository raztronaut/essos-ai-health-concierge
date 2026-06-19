/**
 * Canonicalize an iMessage handle so patient binding and concierge detection
 * match regardless of formatting. iMessage senders arrive as either an E.164
 * phone (`+1 (310) 555-0172` vs `+13105550172`) or an Apple ID email (which is
 * case-insensitive). Emails lowercase; phones keep a leading `+` and strip all
 * other non-digits. Seed handles are already in this canonical form.
 */
export function normalizeHandle(raw: string | null | undefined): string | null {
  if (raw == null) {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }
  const phone = trimmed.replace(/[^\d+]/g, "");
  return phone || trimmed.toLowerCase();
}
