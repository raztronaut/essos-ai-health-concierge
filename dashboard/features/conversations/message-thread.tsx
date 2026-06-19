import type { Message } from "@essos/shared";
import { Card } from "@/components/ui";
import { MessageBubble } from "./message-bubble";

export function MessageThread({ messages }: { messages: Message[] }) {
  if (messages.length === 0) {
    return (
      <Card>
        <p className="text-muted text-sm">No messages yet.</p>
      </Card>
    );
  }

  return (
    <section className="flex flex-col gap-1">
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
    </section>
  );
}
