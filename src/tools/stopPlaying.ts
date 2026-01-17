import { tool } from "ai";
import { z } from "zod/v3";
import { type Message } from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";
import type { ClientType } from "../types.js";

/**
 * Tool for stopping music playback in a voice channel.
 * Destroys the voice connection and cleans up player resources.
 *
 * @param latestMessage - The Discord message that triggered this tool
 * @param client - The Discord client with player state
 * @returns A tool instance that can be used with AI SDK
 */
export function createStopPlayingTool(
  latestMessage: Message,
  client: ClientType
) {
  return tool({
    description:
      "Stops playing music from the 24h stream. Use this tool when asked to stop playing music or sing.",
    inputSchema: z.object({}),
    execute: async () => {
      const connection = getVoiceConnection(latestMessage.guildId ?? "");

      if (!connection) {
        return "I'm not singing!";
      }

      client.players.delete(latestMessage.guildId ?? "");
      client.audioResources.delete(latestMessage.guildId ?? "");
      connection.destroy();

      return "I'm no longer singing!";
    },
  });
}
