import { Effect } from "effect";
import { Message, type OmitPartialGroupDMChannel } from "discord.js";
import type { ClientType } from "../types.js";
import { genMistyOutput } from "../lib.js";
import { ratelimit, redis } from "../utils/redis.js";
import { IMAGES_URL } from "../config.js";
import { logger } from "../utils/logger.js";

async function recursivelyFetchMessage(
  message: Message,
  limit: number,
): Promise<Message[]> {
  const messages: Message[] = [message];
  let currentMessage = message;
  let count = 0;

  while (currentMessage.reference?.messageId && count < limit) {
    const nextMessage = await currentMessage.channel.messages.fetch(
      currentMessage.reference.messageId,
    );
    if (
      nextMessage.content.length === 0 &&
      nextMessage.attachments.size >= 1 &&
      nextMessage.author.id == process.env.BOT_CLIENT_ID
    )
      nextMessage.content =
        "{{MYSELF}} - Already responded. You do NOT need to send {{MYSELF}} again.";

    messages.push(nextMessage);
    currentMessage = nextMessage;
    count++;
  }

  return messages;
}

async function handleAircraftGuess(message: Message, client: ClientType) {
  const guessGame = client.guessGames.get(message.channel.id ?? "");
  console.log(guessGame);
  if (!guessGame) return;
  if (message.content.length > 4) return;
  const guess = message.content.trim();
  console.log(guess);
  if (guess.length === 0) return;
  guessGame.guesses.push(message);
  if (guess.toUpperCase() === guessGame.icaoCode.toUpperCase()) {
    await guessGame.originalMessage.reply(
      `<@${message.author.id}> guessed the aircraft after ${guessGame.guesses.length} guesses!\nThe aircraft was ${guessGame.icaoCode}\n-# By the way, the registration was ${guessGame.registration}`,
    );
    client.guessGames.delete(message.channel.id);
    await message.channel.delete();
    return;
  }
  await message.reply("Nope!");
}

export default {
  eventType: "messageCreate",
  async execute(
    client: ClientType,
    message: OmitPartialGroupDMChannel<Message<boolean>>,
  ) {
    const startTime = Date.now();

    logger.logMessageReceived(message);

    if (message.author.bot) {
      logger.logMessageIgnored(message, "author is bot");
      return;
    }

    if (
      client.guessGames.has(message.channel.id) &&
      !message.content.includes(client.user?.id ?? "")
    ) {
      logger.logMessageIgnored(message, "message is for guess game");
      await handleAircraftGuess(message, client);
      return;
    }

    const completeMessageReference = message.reference?.messageId
      ? await message.channel.messages.fetch(message.reference?.messageId)
      : null;

    if (
      !message.content.includes(`<@${client.user?.id}>`) &&
      completeMessageReference?.author.id !== client.user?.id
    ) {
      logger.logMessageIgnored(
        message,
        "bot not mentioned and not a reply to bot",
      );
      return;
    }

    const isUserBlacklisted = await redis.get(`blacklist:${message.author.id}`);
    if (isUserBlacklisted) {
      logger.logMessageIgnored(message, "user is blacklisted");
      await message.reply("I don't wanna talk to you D:<");
      return;
    }

    const { success, reset, remaining, limit } = await ratelimit.limit(
      message.author.id,
    );

    logger.logRateLimitCheck(message.author.id, remaining ?? 0, limit);

    if (!success) {
      logger.logRateLimitExceeded(message.author.id, limit);
      return await message.reply(
        `You ran out of messages! Retry <t:${Math.floor(reset / 1000)}:R>`,
      );
    }

    try {
      await message.channel.sendTyping();
    } catch {
      console.log("Failed to send typing bruh");
    }

    try {
      const messages = await recursivelyFetchMessage(message, 10);

      const output = await Effect.runPromise(genMistyOutput(messages, client, message));

      if (output?.includes("{{MYSELF}}")) {
        const imageResponse = await fetch(IMAGES_URL);
        const imageData = Buffer.from(await imageResponse.arrayBuffer());
        await message.reply({ files: [imageData] });
        logger.logMessageResponseSent(message, Date.now() - startTime, {
          "message.response.type": "image",
        });
        return;
      }
      if (!output) return;
      try {
        const loadedJson = JSON.parse(output);
        if (loadedJson.content) {
          await message.reply(loadedJson.content);
          logger.logMessageResponseSent(message, Date.now() - startTime, {
            "message.response.type": "text",
          });
          return;
        }
        if (loadedJson.cleanContent) {
          await message.reply(loadedJson.cleanContent);
          logger.logMessageResponseSent(message, Date.now() - startTime, {
            "message.response.type": "text",
          });
          return;
        }
        await message.reply(output);
        logger.logMessageResponseSent(message, Date.now() - startTime, {
          "message.response.type": "text",
        });
        return;
      } catch {
        if (output.includes('"avatar')) {
          // Temp fix?
          const formattedText = output.split('"avatar')[0];
          if (!formattedText) return;
          await message.reply(formattedText);
          logger.logMessageResponseSent(message, Date.now() - startTime, {
            "message.response.type": "text_partial",
          });
          return;
        }
      }
      await message.reply(output);
      logger.logMessageResponseSent(message, Date.now() - startTime, {
        "message.response.type": "text",
      });
    } catch (error) {
      logger.logMessageError(message, error as Error);
      throw error;
    }
  },
};
