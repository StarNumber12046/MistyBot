import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  type TextChannel,
} from "discord.js";
import {
  posthogClient,
  eventTypes,
  buildUserMetadata,
} from "../../analytics.js";
import type { ClientType } from "~/types.js";
export default {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pauses music"),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const client = interaction.client as ClientType;
    const guild = interaction.guild;
    if (!guild) return;
    const player = client.players.get(interaction.guild.id);
    if (!player) return await interaction.followUp("No music playing!");
    player.pause();
    posthogClient.capture({
      event: eventTypes.songStop,
      distinctId: interaction.user.id,
      properties: {
        $set: buildUserMetadata(interaction.user),
        channel: (interaction.channel as TextChannel | undefined)?.name,
      },
    });
    await interaction.followUp("Music paused!");
  },
};
