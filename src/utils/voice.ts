import { ChannelType, ChatInputCommandInteraction, Guild, GuildMember, User, VoiceChannel } from "discord.js";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  StreamType,
} from "@discordjs/voice";
import { join } from "path";
import type { ClientType } from "~/types.js";
import { posthogClient, eventTypes, buildUserMetadata } from "../analytics.js";
import { logger } from "./logger.js";

/**
 * Gets all voice channels in a guild
 */
export function getVoiceChannels(guild: Guild): VoiceChannel[] {
  return guild.channels.cache
    .filter((channel) => channel.type === ChannelType.GuildVoice)
    .map((channel) => channel as VoiceChannel);
}

/**
 * Gets a voice channel from an interaction, either from the channel option
 * or from the user's current voice channel. Returns an error object if validation fails.
 */
export function getVoiceChannelFromInteraction(
  interaction: ChatInputCommandInteraction
): { channel: VoiceChannel } | { error: string } {
  let channel = interaction.options.getChannel("channel");
  const member = interaction.member as GuildMember;

  if (!channel) {
    if (!member?.voice?.channel) {
      return { error: "You need to be in a voice channel or specify a channel!" };
    }
    channel = member.voice.channel;
  }

  if (channel.type !== ChannelType.GuildVoice) {
    return { error: "That's not a valid voice channel!" };
  }

  return { channel: channel as VoiceChannel };
}

/**
 * Checks if a voice channel has any members in it
 */
export function hasMembers(channel: VoiceChannel): boolean {
  return channel.members.size > 0;
}

/**
 * Joins a voice channel
 */
export function joinChannel(channel: VoiceChannel) {
  return joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
  });
}

/**
 * Plays an MP3 file in a voice channel
 */
export async function playAudio(channel: VoiceChannel, filename: string) {
  logger.logVoicePlay(channel.guild.id, channel.id, filename, {
    "discord.voice.channel_name": channel.name,
  });

  try {
    const connection = joinChannel(channel);
    const player = createAudioPlayer();
    const resource = createAudioResource(join(process.cwd(), filename));

    connection.subscribe(player);
    console.log("Subscribed to player");
    player.play(resource);
    console.log("Playing audio");

    return new Promise((resolve) => {
      player.on(AudioPlayerStatus.Idle, () => {
        console.log("Idle");
        logger.logVoicePlayComplete(channel.guild.id, channel.id, filename, {
          "discord.voice.channel_name": channel.name,
        });
        connection.destroy();
        resolve(true);
      });
    });
  } catch (error) {
    logger.logVoiceError(channel.guild.id, channel.id, error as Error, {
      "audio.file": filename,
      "discord.voice.channel_name": channel.name,
    });
    throw error;
  }
}

export async function playAudioPlaylist(
  channel: VoiceChannel,
  filenames: string[],
  playlistPath: string,
  user: User,
  startingSong?: string
) {
  if (filenames.length === 0) return;

  logger.logVoicePlay(channel.guild.id, channel.id, startingSong || "random", {
    "discord.voice.channel_name": channel.name,
    "audio.playlist_length": filenames.length,
    "discord.user.id": user.id,
  });

  const connection = joinChannel(channel);
  const player = createAudioPlayer();
  (channel.client as ClientType).players.set(channel.guild.id, player);
  console.log("Player created");
  console.log((channel.client as ClientType).players.get(channel.guild.id));
  connection.subscribe(player);

  function playRandomSong() {
    const filename = filenames[Math.floor(Math.random() * filenames.length)];
    posthogClient.capture({
      event: eventTypes.songPlay,
      distinctId: user.id,
      properties: {
        $set: buildUserMetadata(user),
        channel: channel.name,
        song: filename,
      },
    });
    const filePath = join(process.cwd(), playlistPath, filename ?? "");
    console.log(`Playing ${filename}`);
    console.log(filePath);

    // Create a fresh audio resource each time
    const resource = createAudioResource(filePath, {
      inputType: StreamType.Arbitrary,
      metadata: {
        filename: filePath,
      },
    });
    (channel.client as ClientType).audioResources.set(
      channel.guild.id,
      resource
    );

    player.play(resource);
  }

  // Set up event listeners
  player.on(AudioPlayerStatus.Playing, () => {
    console.log("Audio started playing");
  });

  player.on(AudioPlayerStatus.Idle, () => {
    console.log("Audio finished, moving to next");

    // Small delay before playing next song
    setTimeout(() => {
      playRandomSong();
    }, 500);
  });

  // Handle errors
  player.on("error", (error) => {
    console.error("Audio player error:", error);
    logger.logVoiceError(channel.guild.id, channel.id, error, {
      "discord.voice.channel_name": channel.name,
      "discord.user.id": user.id,
    });

    setTimeout(() => {
      playRandomSong();
    }, 500);
  });

  // Start playing the first song
  if (startingSong) {
    const filename = startingSong;
    const filePath = join(process.cwd(), playlistPath, filename ?? "");
    console.log(`Playing ${filename}`);
    console.log(filePath);
    const resource = createAudioResource(filePath, {
      inputType: StreamType.Arbitrary,
      metadata: {
        filename: filePath,
      },
    });
    (channel.client as ClientType).audioResources.set(
      channel.guild.id,
      resource
    );
    posthogClient.capture({
      event: eventTypes.songPlay,
      distinctId: user.id,
      properties: {
        $set: buildUserMetadata(user),
        channel: channel.name,
        song: filename,
      },
    });
    player.play(resource);
  } else {
    playRandomSong();
  }

  return player; // Return player so you can control it externally if needed
}
