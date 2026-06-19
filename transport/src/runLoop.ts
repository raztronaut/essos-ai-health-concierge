import type { Channel } from "@essos/shared";
import type { Message, Space } from "spectrum-ts";
import { contentToText } from "./contentText.js";
import { handleInbound, type InboundResult } from "./core.js";
import { debug } from "./debug.js";

/** Per-inbound author resolution; return `null` to skip the message entirely. */
export interface ResolvedAuthor {
  authorHandle: string | null;
  isConcierge: boolean;
  /** Patient to bind a brand-new conversation to (terminal demo / fallback). */
  patientId?: string;
  /** The message text to send to Eve (after any provider-specific cleanup). */
  text: string;
}

export interface MessageLoopOptions {
  app: { messages: AsyncIterable<[Space, Message]> };
  channel: Channel;
  onResult: (
    space: Space,
    message: Message,
    result: InboundResult
  ) => Promise<void>;
  resolveAuthor: (
    space: Space,
    message: Message,
    text: string
  ) => ResolvedAuthor | null;
  /** When true, drive a typing indicator while Eve composes (iMessage only). */
  showTyping?: boolean;
  /** Prefix combined with `space.id` to form the conversation's space id. */
  spaceIdPrefix: string;
}

/**
 * The shared inbound loop for both transports. It handles the parts that are
 * identical across providers — skipping outbound/empty/non-text messages,
 * dispatching to `handleInbound`, and wiring the typing indicator — and defers
 * the provider-specific bits (author resolution, reply vs. narration) to the
 * caller.
 */
export async function runMessageLoop(opts: MessageLoopOptions): Promise<void> {
  for await (const [space, message] of opts.app.messages) {
    if (message.direction === "outbound") {
      continue;
    }

    const text = contentToText(message.content);
    if (!text) {
      debug(
        "transport",
        "ignored non-text inbound content:",
        message.content.type
      );
      continue;
    }

    const resolved = opts.resolveAuthor(space, message, text);
    if (!resolved) {
      continue;
    }

    const result = await handleInbound({
      spaceId: `${opts.spaceIdPrefix}${space.id}`,
      channel: opts.channel,
      authorHandle: resolved.authorHandle,
      text: resolved.text,
      isConcierge: resolved.isConcierge,
      patientId: resolved.patientId,
      typing: opts.showTyping
        ? { start: () => space.startTyping(), stop: () => space.stopTyping() }
        : undefined,
    });

    await opts.onResult(space, message, result);
  }
}
