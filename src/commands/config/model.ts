import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { redis } from "../../utils/redis.js";
import { MODELS } from "../../config.js";

export default {
  data: new SlashCommandBuilder()
    .setName("model")
    .addStringOption((option) =>
      option
        .setName("model")
        .setDescription("The model to use")
        .setRequired(true)
        .setChoices(
          Object.keys(MODELS).map((model) => ({ name: model, value: model }))
        )
    )
    .setDescription("Pick your preferred chat model"),
  async execute(interaction: ChatInputCommandInteraction) {
    const preferredModel = interaction.options.getString("model");
    if (!preferredModel) {
      await interaction.reply({
        content: "Invalid model",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    redis.set(`user:${interaction.user.id}:model`, preferredModel);
    await interaction.reply({
      content: `Set your preferred model to ${preferredModel}`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
