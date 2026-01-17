import { generateText, Output } from "ai";
import { z } from "zod/v3";
import { MODERATION_MODEL, MODERATION_PROMPT } from "../config.js";
import { logger } from "./logger.js";

/**
 * Result of content moderation check
 */
export interface ModerationResult {
  /** Whether the content is safe to send */
  safe: boolean;
  /** Optional alternative message to send if content is unsafe */
  message?: string;
}

/**
 * Scrutinizes AI-generated text for safety and appropriateness using a moderation model.
 * Returns whether the message is safe to send and optionally provides an alternative message.
 *
 * @param aiText - The AI-generated text to scrutinize
 * @param userId - The ID of the user who triggered the AI generation
 * @returns An object indicating if the message is safe and an optional replacement message
 *
 * @example
 * const result = await scrutinizeMessage("Some AI generated text", "user123");
 * if (result.safe) {
 *   // Send the original message
 * } else {
 *   // Use result.message as an alternative
 * }
 */
export async function scrutinizeMessage(
  aiText: string,
  userId: string = "unknown"
): Promise<ModerationResult> {
  logger.logModerationStart(userId, aiText.length);

  try {
    const scrutinizedMessage = await generateText({
      model: MODERATION_MODEL,
      messages: [
        {
          role: "system",
          content: MODERATION_PROMPT,
        },
        {
          role: "user",
          content: aiText,
        },
      ],
      output: Output.object({
        schema: z.object({
          safe: z.boolean(),
          message: z.string().optional(),
        }),
      }),
    });

    const result = scrutinizedMessage.output;

    logger.logModerationComplete(userId, result.safe, {
      "moderation.has_alternative": !!result.message,
    });

    return result;
  } catch (error) {
    logger.logModerationError(userId, error as Error);
    throw error;
  }
}
