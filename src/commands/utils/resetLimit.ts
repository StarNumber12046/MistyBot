import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { ratelimit } from "../../utils/redis.js";
import { isOwner } from "../../utils/permissions.js";

export default {
  data: new SlashCommandBuilder()
    .setName("reset")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to reset")
        .setRequired(true)
    )
    .setDescription("Command to reset a user's ratelimit"),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!isOwner(interaction)) return;
    const user = interaction.options.getUser("user");
    if (!user) {
      await interaction.reply({
        content: "Invalid user",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await ratelimit.resetUsedTokens(user.id);
    await interaction.reply({
      content: `Reset ${user.tag}'s ratelimit`,
      flags: MessageFlags.Ephemeral,
    });
    await user.send(`Your ratelimit has been reset by ${interaction.user.tag}`);
  },
};
