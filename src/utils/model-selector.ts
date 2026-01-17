import { User } from "discord.js";
import { DEFAULT_MODEL, MODELS } from "../config.js";
import { redis } from "./redis.js";

/**
 * Retrieves the user's preferred AI model from Redis cache.
 * Falls back to the default model if no preference is set or if the stored model is invalid.
 *
 * @param user - The Discord user whose model preference to retrieve
 * @returns The user's preferred model configuration from MODELS
 *
 * @example
 * const model = await getUserPreferredModel(user);
 * // Returns: google('gemini-2.0-flash-exp') or configured model
 */
export async function getUserPreferredModel(user: User) {
  const userModel: string =
    (await redis.get(`user:${user.id}:model`)) ?? DEFAULT_MODEL;

  if (userModel && userModel in MODELS) {
    return MODELS[userModel as keyof typeof MODELS];
  }

  return MODELS[DEFAULT_MODEL];
}
