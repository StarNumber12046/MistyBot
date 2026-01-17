import { tool } from "ai";
import { z } from "zod/v3";
import { VoiceChannel, type Message } from "discord.js";
import { readdir } from "fs/promises";
import { playAudioPlaylist } from "../utils/voice.js";

/**
 * Tool for playing music from the 24h stream in a voice channel.
 * Requires the user to be in a voice channel.
 *
 * @param latestMessage - The Discord message that triggered this tool (used to find voice channel)
 * @returns A tool instance that can be used with AI SDK
 */
export function createPlayMusicTool(latestMessage: Message) {
  return tool({
    description:
      "Plays music from the 24h stream. Use this tool when asked to play music or sing.",
    inputSchema: z.object({}),
    execute: async () => {
      if (!latestMessage.member?.voice?.channel) {
        return "I don't know where to sing!";
      }

      await playAudioPlaylist(
        latestMessage.member.voice.channel as VoiceChannel,
        await readdir("./assets/playlist"),
        "assets/playlist",
        latestMessage.member.user
      );

      return "I'm now singing music from the 24h stream!";
    },
  });
}
