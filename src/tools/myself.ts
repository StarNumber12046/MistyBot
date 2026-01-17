import { tool } from "ai";
import { z } from "zod/v3";

/**
 * Tool for sending a picture of Misty to the chat.
 * Should only be used when explicitly asked about Misty's appearance.
 *
 * @returns A tool instance that can be used with AI SDK
 */
export function createMyselfTool() {
  return tool({
    description:
      'Used to send a picture of yourself to the chat. Only use this when the most recent output is asking for your appearance (e.g. "what do you look like?" or "send me a picture of yourself").',
    inputSchema: z.object({}),
    execute: async () => {
      return `{{MYSELF}}`;
    },
  });
}
