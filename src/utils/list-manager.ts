import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  User,
  Channel,
  ChannelType,
} from "discord.js";
import { redis } from "./redis.js";

/**
 * Configuration for a Redis-backed list manager
 */
export interface ListManagerConfig {
  /** Redis key prefix (e.g., "blacklist", "scrutiny") */
  prefix: string;
  /** Display name for the list (e.g., "blacklist", "scrutiny list") */
  displayName: string;
  /** Title for the list embed (e.g., "Blacklist", "Scrutinized users") */
  embedTitle: string;
  /** Type of item to manage (user or channel) */
  itemType?: "user" | "channel";
}

/**
 * Creates a reusable list manager for Redis-backed lists
 */
export function createListManager(config: ListManagerConfig) {
  const { prefix, displayName, embedTitle, itemType = "user" } = config;

  const getItem = (interaction: ChatInputCommandInteraction) => {
    if (itemType === "channel") {
      return interaction.options.getChannel("channel");
    }
    return interaction.options.getUser("user");
  };

  const getItemId = (item: any) => item.id;
  
  const getItemName = (item: any) => {
    if (itemType === "channel") return item.name || item.id;
    return item.tag; // User
  };

  return {
    /**
     * Adds an item to the list
     */
    async add(interaction: ChatInputCommandInteraction) {
      const item = getItem(interaction);
      if (!item) {
        await interaction.reply({
          content: `Invalid ${itemType}`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      await redis.set(`${prefix}:${getItemId(item)}`, "true");
      await interaction.reply({
        content: `Added ${getItemName(item)} to the ${displayName}`,
        flags: MessageFlags.Ephemeral,
      });
    },

    /**
     * Removes an item from the list
     */
    async remove(interaction: ChatInputCommandInteraction) {
      const item = getItem(interaction);
      if (!item) {
        await interaction.reply({
          content: `Invalid ${itemType}`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      await redis.del(`${prefix}:${getItemId(item)}`);
      await interaction.reply({
        content: `Removed ${getItemName(item)} from the ${displayName}`,
        flags: MessageFlags.Ephemeral,
      });
    },

    /**
     * Lists all items in the list
     */
    async list(interaction: ChatInputCommandInteraction) {
      const keys = await redis.keys(`${prefix}:*`);
      const itemList = keys.map((key) => {
          const id = key.split(":")[1];
          return itemType === "channel" ? `<#${id}>` : `<@${id}>`;
      });
      
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(embedTitle)
            .setDescription(
              itemList.length > 0
                ? itemList.join("\n")
                : `No ${itemType}s in this list`,
            ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    },

    /**
     * Queries if an item is in the list
     */
    async query(interaction: ChatInputCommandInteraction) {
      const item = getItem(interaction);
      if (!item) {
        await interaction.reply({
          content: `Invalid ${itemType}`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      const isInList = await redis.get(`${prefix}:${getItemId(item)}`);
      if (isInList) {
        await interaction.reply({
          content: `${getItemName(item)} is on the ${displayName}`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      await interaction.reply({
        content: `${getItemName(item)} is not on the ${displayName}`,
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
  listName: string,
  itemType: "user" | "channel" = "user"
) {
  const addOption = (subcommand: SlashCommandSubcommandBuilder, description: string) => {
    if (itemType === "channel") {
      return subcommand.addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription(description)
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice)
      );
    }
    return subcommand.addUserOption((option) =>
      option
        .setName("user")
        .setDescription(description)
        .setRequired(true)
    );
  };

  return builder
    .addSubcommand((subcommand: SlashCommandSubcommandBuilder) => {
      subcommand.setName("add").setDescription(`Adds a ${itemType} to the ${listName}`);
      return addOption(subcommand, `The ${itemType} to add`);
    })
    .addSubcommand((subcommand: SlashCommandSubcommandBuilder) => {
      subcommand.setName("remove").setDescription(`Removes a ${itemType} from the ${listName}`);
      return addOption(subcommand, `The ${itemType} to remove`);
    })
    .addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
      subcommand
        .setName("list")
        .setDescription(`Lists all ${itemType}s on the ${listName}`),
    )
    .addSubcommand((subcommand: SlashCommandSubcommandBuilder) => {
      subcommand.setName("query").setDescription(`Gets info about a ${itemType} on the ${listName}`);
      return addOption(subcommand, `The ${itemType} to query`);
    });
}
