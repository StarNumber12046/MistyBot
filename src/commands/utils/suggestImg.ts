import {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  EmbedBuilder,
  MessageContextMenuCommandInteraction,
  TextChannel,
} from "discord.js";
import { uploadUrl } from "../../utils/ut.js";

export default {
  data: new ContextMenuCommandBuilder()
    .setName("Suggest Misty Image")
    .setType(ApplicationCommandType.Message),
  async execute(interaction: MessageContextMenuCommandInteraction) {
    const {
      attachments,
      author: originalAuthor,
      id: messageId,
      guildId: originalGuildId,
      channelId: originalChannelId,
    } = interaction.targetMessage;
    await interaction.deferReply();

    if (attachments.size === 0) {
      return interaction.followUp({
        content: "No image found in the message",
        ephemeral: true,
      });
    }
    const attachmentUtUrls = await Promise.all(
      attachments.map(async (attachment) => {
        const url = attachment.url;
        const ufsUrl = await uploadUrl(url);
        return ufsUrl;
      })
    );
    const attachmentUrls = attachmentUtUrls.filter(Boolean);
    if (attachmentUrls.length === 0) {
      return interaction.followUp({
        content: "No valid images",
        ephemeral: true,
      });
    }
    const embed = new EmbedBuilder()
      .setTitle(`${interaction.user.tag} suggested the following images:`)
      .setDescription(
        `There ${
          attachmentUrls.length == 1
            ? "is 1 image"
            : "are " + attachmentUtUrls.length + "images"
        }.\n Original message: https://discord.com/channels/${originalGuildId}/${originalChannelId}/${messageId}`
      )
      .setImage(attachmentUrls[0] as string)
      .setFooter({
        text: `Original message: ${originalChannelId}/${messageId}`,
      });
    const suggestionsGuild = await interaction.client.guilds.fetch(
      process.env.MAIN_GUILD_ID ?? ""
    );
    const suggestionsChannel = (await suggestionsGuild.channels.fetch(
      process.env.SUGGESTIONS_CHANNEL_ID ?? ""
    )) as TextChannel | null;
    if (!suggestionsChannel) {
      return interaction.followUp({
        content: "Suggestions channel not found",
        ephemeral: true,
      });
    }
    await suggestionsChannel.send({
      embeds: [embed],
      content:
        originalAuthor.id === process.env.LUXPLANES_ID
          ? "<@" + process.env.OWNER_ID + ">"
          : "",
    });
    await interaction.followUp({
      content: "Suggestion sent",
      ephemeral: true,
    });
  },
};
