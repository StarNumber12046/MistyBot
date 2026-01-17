import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { createListManager, addListManagementSubcommands } from "../../utils/list-manager.js";
import { isOwner } from "../../utils/permissions.js";

const scrutinyManager = createListManager({
  prefix: "scrutiny",
  displayName: "scrutiny list",
  embedTitle: "Scrutinized users",
});

export default {
  data: addListManagementSubcommands(
    new SlashCommandBuilder()
      .setName("scrutiny")
      .setDescription("Commands to manage the scrutiny list"),
    "scrutiny list"
  ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!isOwner(interaction)) return;
    await scrutinyManager.handleInteraction(interaction);
  },
};
