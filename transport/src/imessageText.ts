/**
 * iMessage has no rich-text rendering: markdown like `**bold**`, `# headers`,
 * `- bullets`, and `[label](url)` arrive as literal characters. Eve (and any
 * AI-drafted concierge reply) can still emit markdown, so every outbound
 * iMessage send is normalized to clean plaintext here. This is the reliable
 * fix; the agent instructions also ask for plaintext as belt-and-suspenders.
 */

/** Tapbacks Eve may request via the `[[react: ...]]` control token. */
export type TapbackName =
  | "like"
  | "love"
  | "laugh"
  | "emphasize"
  | "question"
  | "dislike";

const TAPBACK_NAMES: readonly TapbackName[] = [
  "like",
  "love",
  "laugh",
  "emphasize",
  "question",
  "dislike",
];

/**
 * Control token an LLM reply may carry to request a tapback, e.g.
 * `[[react: like]]`. Matched case-insensitively and stripped from the text.
 */
const REACT_TOKEN = /\[\[\s*react\s*:\s*([a-z]+)\s*\]\]/gi;

export interface NormalizedMessage {
  /** A requested tapback, if the reply carried a valid `[[react: ...]]`. */
  react: TapbackName | null;
  /** Markdown-stripped plaintext, safe to send over iMessage. */
  text: string;
}

function isTapbackName(value: string): value is TapbackName {
  return (TAPBACK_NAMES as readonly string[]).includes(value);
}

/** Pull the first valid `[[react: ...]]` token out and strip all of them. */
function extractReact(raw: string): {
  text: string;
  react: TapbackName | null;
} {
  let react: TapbackName | null = null;
  const text = raw.replace(REACT_TOKEN, (_match, name: string) => {
    const lowered = name.toLowerCase();
    if (react === null && isTapbackName(lowered)) {
      react = lowered;
    }
    return "";
  });
  return { text, react };
}

/** Strip fenced ```code``` blocks down to their inner lines (no backticks). */
function stripCodeFences(text: string): string {
  return text.replace(/```[^\n]*\n?([\s\S]*?)```/g, (_match, inner: string) =>
    inner.replace(/\n$/, "")
  );
}

/** Convert inline markdown that lives within a single line. */
function stripInline(line: string): string {
  return (
    line
      // Images and links: ![alt](url) / [label](url) -> "label (url)".
      .replace(
        /!?\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
        (_m, label: string, url: string) => (label ? `${label} (${url})` : url)
      )
      // Autolinks: <https://example.com> -> https://example.com
      .replace(/<((?:https?|mailto):[^>\s]+)>/g, "$1")
      // Bold/italic. Order matters: doubles before singles.
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/\*([^*\n]+)\*/g, "$1")
      // Single-underscore italics only when word-bounded (spare snake_case/URLs).
      .replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?;:]|$)/g, "$1$2")
      // Inline code: `text` -> text
      .replace(/`([^`]+)`/g, "$1")
      // Strikethrough: ~~text~~ -> text
      .replace(/~~([^~]+)~~/g, "$1")
  );
}

/** Apply line-level block transforms (headers, bullets, quotes, rules). */
function stripBlock(line: string): string | null {
  // Horizontal rules: ---, ***, ___ (drop the line entirely).
  if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
    return null;
  }
  let out = line;
  // ATX headers: "## Title" -> "Title".
  out = out.replace(/^\s{0,3}#{1,6}\s+/, "");
  // Blockquotes: "> quote" -> "quote".
  out = out.replace(/^\s*>\s?/, "");
  // Unordered list markers: "- item" / "* item" / "+ item" -> "• item".
  out = out.replace(/^(\s*)[-*+]\s+/, "$1• ");
  return out;
}

/**
 * Normalize an outbound message to iMessage-safe plaintext and extract any
 * requested tapback. Plain text with no markdown passes through unchanged
 * (aside from a trailing-whitespace trim).
 */
export function toImessageText(raw: string): NormalizedMessage {
  const { text: withoutReact, react } = extractReact(raw);

  const defenced = stripCodeFences(withoutReact);

  const lines: string[] = [];
  for (const line of defenced.split("\n")) {
    const block = stripBlock(line);
    if (block === null) {
      continue;
    }
    lines.push(stripInline(block).replace(/[ \t]+$/, ""));
  }

  const text = lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { text, react };
}
