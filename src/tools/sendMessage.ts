import { tool } from "ai";
import { z } from "zod/v3";

/**
 * Tool for sending a basic text message to the chat.
 * This is the default tool for conversational responses.
 *
 * @returns A tool instance that can be used with AI SDK
 */
export function createSendMessageTool() {
  return tool({
    description:
      "Sends a message to the chat. Use this tool during conversations. Use this tool if you don't have any other tools available. ONLY include the message contents!",
    inputSchema: z.object({
      message: z.string(),
    }),
    execute: async ({ message }) => {
      return message;
    },
  });
}
