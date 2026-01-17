import type { ChatInputCommandInteraction, MessageContextMenuCommandInteraction } from "discord.js";
import { env } from "process";

/**
 * Checks if the interaction user is the bot owner
 * @param interaction - The interaction to check
 * @returns true if the user is the owner, false otherwise
 */
export function isOwner(
  interaction: ChatInputCommandInteraction | MessageContextMenuCommandInteraction
): boolean {
  return interaction.user.id === env.OWNER_ID;
}

/**
 * Checks if the interaction user is the bot owner and sends an ephemeral response if not
 * @param interaction - The interaction to check
 * @returns true if the user is the owner, false otherwise (and sends a response)
 */
export async function requireOwner(
  interaction: ChatInputCommandInteraction | MessageContextMenuCommandInteraction
): Promise<boolean> {
  if (!isOwner(interaction)) {
    await interaction.followUp({
      content: "You are not the owner of this bot",
      ephemeral: true,
    });
    return false;
  }
  return true;
}
