import type { Message } from "@essos/shared";
import { Card } from "@/components/ui";
import { MessageBubble } from "./message-bubble";

export function MessageThread({ messages }: { messages: Message[] }) {
  return (
    <section className="space-y-3">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {messages.length === 0 ? (
        <Card>
          <p className="text-muted text-sm">No messages yet.</p>
        </Card>
      ) : null}
    </section>
  );
}
