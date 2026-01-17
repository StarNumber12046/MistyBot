import {
  AutocompleteInteraction,
  ChannelType,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  VoiceChannel,
} from "discord.js";
import { playAudioPlaylist, getVoiceChannelFromInteraction } from "../../utils/voice.js";
import { readdir } from "fs/promises";
import NodeID3 from "node-id3";
export default {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Plays the music from the 24 hour stream")
    .addStringOption((option) =>
      option
        .setDescription("The song to play first")
        .setName("song")
        .setAutocomplete(true)
        .setRequired(false)
    )
    .addChannelOption((option) =>
      option
        .addChannelTypes(ChannelType.GuildVoice)
        .setDescription("The voice channel to join")
        .setRequired(false)
        .setName("channel")
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const result = getVoiceChannelFromInteraction(interaction);
    if ("error" in result) {
      await interaction.followUp(result.error);
      return;
    }

    const { channel } = result;
    const startingSong = interaction.options.getString("song");
    await interaction.followUp(`Playing music on <#${channel.id}>!`);
    if (startingSong) {
      console.log("starting song: ", startingSong);
      playAudioPlaylist(
        channel,
        await readdir("./assets/playlist"),
        "assets/playlist",
        interaction.user,
        startingSong
      );
    } else {
      playAudioPlaylist(
        channel,
        await readdir("./assets/playlist"),
        "assets/playlist",
        interaction.user
      );
    }

    console.log("Audio played successfully!");
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    const songs = (await readdir("assets/playlist")).map((item) => {
      return {
        fileName: item,
        name: NodeID3.read("assets/playlist/" + item).title,
      };
    });
    const filtered = songs.filter((choice) =>
      (choice.name ?? choice.fileName)
        .toLowerCase()
        .includes(interaction.options.getFocused().toLowerCase())
    );
    await interaction.respond(
      filtered.map((choice) => ({
        name: choice.name ?? choice.fileName,
        value: choice.fileName,
      }))
    );
  },
};
