import type { Message } from "discord.js";
import type { TextPart } from "ai";

/**
 * Message content with role, used for AI message history.
 * Bot messages use simple string content, while user messages include structured metadata.
 */
export type MessageContent =
  | {
      content: string;
      role: "assistant";
    }
  | {
      role: "user";
      content: TextPart[];
    };

/**
 * Transforms a Discord message into the format expected by the AI SDK.
 * Bot messages are simplified to their text content, while user messages
 * are structured with author metadata for context.
 *
 * @param message - The Discord message to transform
 * @returns A formatted message object with role and content
 *
 * @example
 * // Bot message
 * getMessageContentOrParts(botMessage)
 * // Returns: { content: "Hello!", role: "assistant" }
 *
 * // User message
 * getMessageContentOrParts(userMessage)
 * // Returns: { role: "user", content: [{ type: "text", text: "{...}" }] }
 */
export function getMessageContentOrParts(message: Message): MessageContent {
  if (message.author.bot) {
    return {
      content: message.cleanContent,
      role: "assistant" as const,
    };
  }

  return {
    role: "user" as const,
    content: [
      {
        type: "text",
        text: JSON.stringify({
          author: {
            username: message.author.username,
            displayName: message.author.displayName,
            id: message.author.id,
          },
          content: message.cleanContent,
          id: message.id,
        }),
      } as TextPart,
    ],
  };
}
