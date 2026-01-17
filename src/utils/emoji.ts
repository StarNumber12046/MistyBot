import { emojis } from "../config.js";

/**
 * Transforms emoji shortcodes into their complete emoji representations.
 * Handles both Discord custom emoji format (<:emoji:id>) and configured emoji replacements.
 *
 * @param text - The text containing emoji shortcodes to transform
 * @returns The text with all emoji shortcodes replaced with actual emojis
 *
 * @example
 * makeCompleteEmoji("Hello <:wave:123456>") // "Hello :wave:"
 * makeCompleteEmoji("I'm happy :happy:") // "I'm happy 😊" (if configured)
 */
export function makeCompleteEmoji(text: string): string {
  // Replace Discord custom emoji format <:emoji:id> or <a:emoji:id> with :emoji:
  text = text.replaceAll(/<a?:(\w+):(\d+)>/g, (match, emoji) => {
    return `:${emoji}:`;
  });

  // Replace configured emoji shortcodes with their complete emoji
  Object.keys(emojis).forEach((emoji) => {
    text = text.replaceAll(":" + emoji + ":", emojis[emoji].completeEmoji);
  });

  return text;
}
