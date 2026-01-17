import { tool } from "ai";
import { z } from "zod/v3";
import { type Message } from "discord.js";
import NodeID3 from "node-id3";
import type { ClientType } from "../types.js";

/**
 * Tool for getting information about the currently playing song.
 * Reads ID3 tags from the audio file to get title and artist.
 *
 * @param latestMessage - The Discord message that triggered this tool
 * @param client - The Discord client with audio resource state
 * @returns A tool instance that can be used with AI SDK
 */
export function createWhatSongTool(latestMessage: Message, client: ClientType) {
  return tool({
    description:
      "Tells you what song Misty is currently playing. Use this tool when asked to tell you what song Misty is playing.",
    inputSchema: z.object({}),
    execute: async () => {
      const resource = client.audioResources.get(latestMessage.guildId ?? "");

      if (!resource) {
        return "I'm not singing!";
      }

      const filename = (resource.metadata as { filename: string })
        ?.filename as string;
      const resourceTags = NodeID3.read(filename);

      return `I'm currently playing ${resourceTags.title ?? "Unknown"} by ${
        resourceTags.artist ?? "Unknown"
      }`;
    },
  });
}
