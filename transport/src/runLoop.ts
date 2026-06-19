import type { Channel } from "@essos/shared";
import type { Message, Space } from "spectrum-ts";
import { contentToText } from "./contentText.js";
import { debug } from "./debug.js";
import { type ConversationIO, enqueue } from "./pipeline.js";

/** Per-inbound author resolution; return `null` to skip the message entirely. */
export interface ResolvedAuthor {
  /** When true, an unknown handle is auto-provisioned a guest demo patient. */
  allowGuest?: boolean;
  authorHandle: string | null;
  /** Display name to seed a new guest patient with. */
  guestName?: string | null;
  isConcierge: boolean;
  /** Patient to bind a brand-new conversation to (terminal demo / fallback). */
  patientId?: string;
  /** The message text to send to Eve (after any provider-specific cleanup). */
  text: string;
}

export interface MessageLoopOptions {
  app: { messages: AsyncIterable<[Space, Message]> };
  /** Build the provider-specific delivery for a message's conversation. */
  buildIO: (space: Space, message: Message) => ConversationIO;
  channel: Channel;
  /** Called for every delivered stream event — a positive liveness signal. */
  onActivity?: () => void;
  resolveAuthor: (
    space: Space,
    message: Message,
    text: string
  ) => ResolvedAuthor | null;
  /** Prefix combined with `space.id` to form the conversation's space id. */
  spaceIdPrefix: string;
}

/**
 * The shared inbound loop for both transports. It skips outbound/empty/non-text
 * messages, resolves the author (provider-specific), and hands each message to
 * the durable pipeline ({@link enqueue}), which owns debouncing, generation,
 * and paced sending. Replies are delivered through the provider's
 * {@link ConversationIO}, not from this loop.
 */
export async function runMessageLoop(opts: MessageLoopOptions): Promise<void> {
  for await (const [space, message] of opts.app.messages) {
    // Any delivered event proves the stream is live; feed the health watchdog.
    opts.onActivity?.();
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

    const io = opts.buildIO(space, message);
    if (!resolved.isConcierge) {
      await Promise.allSettled([io.markRead?.(), io.startTyping?.()]);
    }

    await enqueue({
      spaceId: `${opts.spaceIdPrefix}${space.id}`,
      channel: opts.channel,
      authorHandle: resolved.authorHandle,
      isConcierge: resolved.isConcierge,
      patientId: resolved.patientId,
      allowGuest: resolved.allowGuest,
      guestName: resolved.guestName,
      text: resolved.text,
      io,
    });
  }
}
