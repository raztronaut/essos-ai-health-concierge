import { defineTool } from "eve/tools";
import { listMessages } from "@essos/shared";
import { z } from "zod";

/**
 * Read recent messages in the conversation for personalization and context
 * (e.g. a dietary restriction the patient mentioned earlier).
 */
export default defineTool({
  description:
    "Get recent messages from this conversation for context and personalization (for example, a dietary note or a previously mentioned constraint). Pass the conversation_id from the context block.",
  inputSchema: z.object({
    conversation_id: z
      .string()
      .min(1)
      .describe("The conversation_id from the context block."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("How many of the most recent messages to return (default 12)."),
  }),
  async execute({ conversation_id, limit }) {
    const all = listMessages(conversation_id);
    const take = limit ?? 12;
    const recent = all.slice(-take).map((message) => ({
      role: message.role,
      text: message.text,
      category: message.category,
      at: message.created_at,
    }));
    return { count: recent.length, messages: recent };
  },
});
