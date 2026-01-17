import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { ratelimit, redis } from "../../utils/redis.js";
import { isOwner } from "../../utils/permissions.js";

export default {
  data: new SlashCommandBuilder()
    .setName("user")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to see info about")
        .setRequired(true)
    )
    .setDescription("Command to see info about a user"),
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
    const { remaining, reset } = await ratelimit.getRemaining(user.id);
    const blacklisted = await redis.get(`blacklist:${user.id}`);
    const preferredModel = await redis.get(`user:${user.id}:model`);
    await interaction.reply({
      content: `${
        user.tag
      }'s profile:\nRemaining messages: ${remaining}\nResets in: <t:${Math.floor(
        reset / 1000
      )}:R>\nIs blacklisted: ${
        blacklisted ? " true" : " false"
      }\nPreferred model: ${preferredModel ?? "default"}`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
