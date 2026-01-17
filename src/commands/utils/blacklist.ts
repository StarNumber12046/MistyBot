import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { createListManager, addListManagementSubcommands } from "../../utils/list-manager.js";
import { isOwner } from "../../utils/permissions.js";

const blacklistManager = createListManager({
  prefix: "blacklist",
  displayName: "blacklist",
  embedTitle: "Blacklist",
});

export default {
  data: addListManagementSubcommands(
    new SlashCommandBuilder()
      .setName("blacklist")
      .setDescription("Commands to manage blacklist"),
    "blacklist"
  ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!isOwner(interaction)) return;
    await blacklistManager.handleInteraction(interaction);
  },
};
  