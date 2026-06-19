import type { Content } from "spectrum-ts";

/** Extract plain text from an inbound Spectrum content value. */
export function contentToText(content: Content): string | null {
  if (content.type === "text") return content.text;
  if (content.type === "markdown") return content.markdown;
  return null;
}
