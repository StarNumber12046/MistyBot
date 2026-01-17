import {
  ChannelType,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { playAudio, getVoiceChannelFromInteraction } from "../../utils/voice.js";

export default {
  data: new SlashCommandBuilder()
    .setName("meow")
    .setDescription("Joins a voice chat and meows")
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
    await interaction.followUp(`Meowing on <#${channel.id}>!`);
    await playAudio(channel, "assets/meow.mp3");
    console.log("Audio played successfully!");
  },
};
