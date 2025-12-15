import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { IMAGES_URL } from "../../config.js";

export default {
  data: new SlashCommandBuilder()
    .setName("misty")
    .setDescription("Sends a random image of misty"),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const imageResponse = await fetch(IMAGES_URL);
    const imageData = Buffer.from(await imageResponse.arrayBuffer());
    console.log(imageData.length);
    await interaction.followUp({ files: [imageData] });
  },
};
