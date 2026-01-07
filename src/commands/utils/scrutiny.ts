import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  MessageFlags,
  EmbedBuilder,
} from "discord.js";
import { env } from "process";
import { redis } from "../../utils/redis.js";

export default {
  data: new SlashCommandBuilder()
    .setName("scrutiny")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Adds a user to the scrutiny list")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The user to add")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Removes a user from the scrutiny list")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The user to remove")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("list")
        .setDescription("Lists all users on the scrutiny list")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("query")
        .setDescription("Gets info about a user on the scrutiny list")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The user to query")
            .setRequired(true)
        )
    )
    .setDescription("Commands to manage the scrutiny list"),
  async execute(interaction: ChatInputCommandInteraction) {
    if (interaction.user.id !== env.OWNER_ID) return;
    switch (interaction.options.getSubcommand()) {
      case "add": {
        const user = interaction.options.getUser("user");
        if (!user) {
          await interaction.reply({
            content: "Invalid user",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        redis.set(`scrutiny:${user.id}`, "true");
        await interaction.reply({
          content: `Added ${user.tag} to the scrutiny list`,
          flags: MessageFlags.Ephemeral,
        });
        break;
      }
      case "remove": {
        const user = interaction.options.getUser("user");
        if (!user) {
          await interaction.reply({
            content: "Invalid user",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        redis.del(`scrutiny:${user.id}`);
        await interaction.reply({
          content: `Removed ${user.tag} from the scrutiny list`,
          flags: MessageFlags.Ephemeral,
        });
        break;
      }
      case "list": {
        const users = await redis.keys("scrutiny:*");
        const userList = users.map((user) => "<@" + user.split(":")[1] + ">");
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Scrutinized users")
              .setDescription(userList.join("\n")),
          ],
          flags: MessageFlags.Ephemeral,
        });
        break;
      }
      case "query": {
        const user = interaction.options.getUser("user");
        if (!user) {
          await interaction.reply({
            content: "Invalid user",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        const scrutinized = await redis.get(`scrutiny:${user.id}`);
        if (scrutinized) {
          await interaction.reply({
            content: `${user.tag} is under scrutiny`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        await interaction.reply({
          content: `${user.tag} is not under scrutiny`,
          flags: MessageFlags.Ephemeral,
        });
        break;
      }
      default: {
        await interaction.reply({
          content: "Invalid subcommand",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
