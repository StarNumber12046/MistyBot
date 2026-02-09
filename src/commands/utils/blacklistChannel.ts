import { SlashCommandBuilder, type ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags } from "discord.js";
import { createListManager, addListManagementSubcommands } from "../../utils/list-manager.js";

const blacklistManager = createListManager({
  prefix: "channel_blacklist",
  displayName: "channel blacklist",
  embedTitle: "Channel Blacklist",
  itemType: "channel",
});

export default {
  data: addListManagementSubcommands(
    new SlashCommandBuilder()
      .setName("blacklistchannel")
      .setDescription("Commands to manage channel blacklist"),
    "channel blacklist",
    "channel"
  ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
            content: "You do not have the Manage Server permission.",
            flags: MessageFlags.Ephemeral
        });
        return;
    }
    await blacklistManager.handleInteraction(interaction);
  },
};
