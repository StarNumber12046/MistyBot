import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
  MessageFlags,
} from "discord.js";
import { redis } from "../../utils/redis.js";
import { DEFAULT_MODEL, MODELS } from "../../config.js";

export default {
  data: new SlashCommandBuilder()
    .setName("model")
    .addStringOption((option) =>
      option
        .setName("model")
        .setDescription("The model to use")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .setDescription("Pick your preferred chat model"),
  async autocomplete(interaction: AutocompleteInteraction) {
    const focusedValue = interaction.options.getFocused();
    const choices = Object.keys(MODELS).map((model) => ({
      name: model === DEFAULT_MODEL ? "* " + model : model,
      value: model,
    }));
    const filtered = choices.filter((choice) =>
      choice.name.toLowerCase().includes(focusedValue.toLowerCase())
    );
    await interaction.respond(filtered.slice(0, 25));
  },
  async execute(interaction: ChatInputCommandInteraction) {
    const preferredModel = interaction.options.getString("model");
    if (!preferredModel) {
      await interaction.reply({
        content: "Invalid model",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    // Check if the selected model is valid (in case they bypassed autocomplete)
    if (!Object.keys(MODELS).includes(preferredModel)) {
       await interaction.reply({
        content: "Invalid model selected.",
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
