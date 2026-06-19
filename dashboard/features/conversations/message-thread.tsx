import type { Message } from "@essos/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui";
import { MessageBubble } from "./message-bubble";

export function MessageThread({ messages }: { messages: Message[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Scroll to bottom helper
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior,
      });
    }
  }, []);

  // Scroll to bottom on mount and when messages change
  useEffect(() => {
    scrollToBottom("instant");
    // Reference messages so Biome knows it is a valid dependency
    const _ = messages.length;
  }, [messages, scrollToBottom]);

  // Monitor scroll to show/hide the "Scroll to bottom" button
  const handleScroll = () => {
    if (!containerRef.current) {
      return;
    }
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    // Show button if user has scrolled up more than 300px from the bottom
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 300;
    setShowScrollButton(isFarFromBottom);
  };

  if (messages.length === 0) {
    return (
      <Card className="flex h-full items-center justify-center p-6">
        <p className="text-muted text-sm">No messages yet.</p>
      </Card>
    );
  }

  return (
    <div className="relative h-full min-h-0 flex-1">
      <div
        className="h-full overflow-y-auto scroll-smooth rounded-card bg-card p-4 shadow-border md:p-6"
        onScroll={handleScroll}
        ref={containerRef}
      >
        <div className="flex flex-col gap-1">
          {messages.map((message, index) => {
            const prev = messages[index - 1];
            const next = messages[index + 1];
            // Consecutive messages from the same sender are visually grouped: the
            // header is shown only on the first of a run and the gap tightens so a
            // burst reads as one thought rather than a stack of separate cards.
            const groupedWithPrev = prev?.role === message.role;
            const groupedWithNext = next?.role === message.role;
            return (
              <MessageBubble
                groupedWithNext={groupedWithNext}
                groupedWithPrev={groupedWithPrev}
                key={message.id}
                message={message}
              />
            );
          })}
        </div>
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollButton && (
        <button
          className="focus-ring absolute right-4 bottom-4 flex cursor-pointer items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 font-semibold text-pearl text-xs shadow-lg transition-all duration-base ease-out hover:opacity-90 active:scale-95"
          onClick={() => scrollToBottom("smooth")}
          type="button"
        >
          <svg
            aria-hidden="true"
            className="size-3.5 animate-bounce"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Recent messages</span>
        </button>
      )}
    </div>
  );
}
