import {
  ChannelType,
  ChatInputCommandInteraction,
  GuildMember,
  SlashCommandBuilder,
} from "discord.js";
import { playAudio } from "../../utils/voice.js";

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

    let channel = interaction.options.getChannel("channel");
    const member = interaction.member as GuildMember;
    if (!channel) {
      // Check if user is in a voice channel
      if (!member?.voice?.channel) {
        await interaction.followUp(
          "You need to be in a voice channel or specify a channel!"
        );
        return;
      }
      channel = member.voice.channel;
    }

    if (channel.type !== ChannelType.GuildVoice) {
      await interaction.followUp("That's not a valid voice channel!");
      return;
    }
    await interaction.followUp(`Meowing on <#${channel.id}>!`);
    // @ts-expect-error inference is broken
    await playAudio(channel, "assets/meow.mp3");
    console.log("Audio played successfully!");
  },
};
