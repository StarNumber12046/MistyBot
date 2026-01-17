import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder, SlashCommandSubcommandBuilder } from "discord.js";
import { redis } from "./redis.js";

/**
 * Configuration for a Redis-backed user list manager
 */
export interface ListManagerConfig {
  /** Redis key prefix (e.g., "blacklist", "scrutiny") */
  prefix: string;
  /** Display name for the list (e.g., "blacklist", "scrutiny list") */
  displayName: string;
  /** Title for the list embed (e.g., "Blacklist", "Scrutinized users") */
  embedTitle: string;
}

/**
 * Creates a reusable list manager for Redis-backed user lists
 */
export function createListManager(config: ListManagerConfig) {
  const { prefix, displayName, embedTitle } = config;

  return {
    /**
     * Adds a user to the list
     */
    async add(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user");
      if (!user) {
        await interaction.reply({
          content: "Invalid user",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      await redis.set(`${prefix}:${user.id}`, "true");
      await interaction.reply({
        content: `Added ${user.tag} to the ${displayName}`,
        flags: MessageFlags.Ephemeral,
      });
    },

    /**
     * Removes a user from the list
     */
    async remove(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user");
      if (!user) {
        await interaction.reply({
          content: "Invalid user",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      await redis.del(`${prefix}:${user.id}`);
      await interaction.reply({
        content: `Removed ${user.tag} from the ${displayName}`,
        flags: MessageFlags.Ephemeral,
      });
    },

    /**
     * Lists all users in the list
     */
    async list(interaction: ChatInputCommandInteraction) {
      const users = await redis.keys(`${prefix}:*`);
      const userList = users.map((user) => "<@" + user.split(":")[1] + ">");
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(embedTitle)
            .setDescription(userList.length > 0 ? userList.join("\n") : "No users in this list"),
        ],
        flags: MessageFlags.Ephemeral,
      });
    },

    /**
     * Queries if a user is in the list
     */
    async query(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user");
      if (!user) {
        await interaction.reply({
          content: "Invalid user",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      const isInList = await redis.get(`${prefix}:${user.id}`);
      if (isInList) {
        await interaction.reply({
          content: `${user.tag} is on the ${displayName}`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      await interaction.reply({
        content: `${user.tag} is not on the ${displayName}`,
        flags: MessageFlags.Ephemeral,
      });
    },

    /**
     * Handles the interaction routing for all subcommands
     */
    async handleInteraction(interaction: ChatInputCommandInteraction) {
      switch (interaction.options.getSubcommand()) {
        case "add":
          await this.add(interaction);
          break;
        case "remove":
          await this.remove(interaction);
          break;
        case "list":
          await this.list(interaction);
          break;
        case "query":
          await this.query(interaction);
          break;
        default:
          await interaction.reply({
            content: "Invalid subcommand",
            flags: MessageFlags.Ephemeral,
          });
      }
    },
  };
}

/**
 * Helper to add standard list management subcommands to a slash command builder
 */
export function addListManagementSubcommands(
  builder: SlashCommandBuilder,
  listName: string
): SlashCommandBuilder {
  return builder
    .addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
      subcommand
        .setName("add")
        .setDescription(`Adds a user to the ${listName}`)
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The user to add")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
      subcommand
        .setName("remove")
        .setDescription(`Removes a user from the ${listName}`)
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The user to remove")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
      subcommand
        .setName("list")
        .setDescription(`Lists all users on the ${listName}`)
    )
    .addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
      subcommand
        .setName("query")
        .setDescription(`Gets info about a user on the ${listName}`)
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The user to query")
            .setRequired(true)
        )
    );
}
