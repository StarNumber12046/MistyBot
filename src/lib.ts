import { withTracing } from "@posthog/ai";
import { generateText } from "ai";
import { type GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { basePrompt } from "./config.js";
import { User, type Message } from "discord.js";
import type { ClientType } from "./types.js";
import { posthogClient, eventTypes, buildUserMetadata } from "./analytics.js";
import { redis } from "./utils/redis.js";
import { makeCompleteEmoji } from "./utils/emoji.js";
import { scrutinizeMessage } from "./utils/moderation.js";
import { getMessageContentOrParts } from "./utils/message-transformer.js";
import { getUserPreferredModel } from "./utils/model-selector.js";
import {
  createMyselfTool,
  createSendMessageTool,
  createPlayMusicTool,
  createStopPlayingTool,
  createWhatSongTool,
} from "./tools/index.js";

const systemPrompt = basePrompt;

export async function genMistyOutput(
  messages: Message[],
  client: ClientType,
  latestMessage: Message,
) {
  // Create tools with injected dependencies
  const myselfTool = createMyselfTool();
  const sendMessageTool = createSendMessageTool();
  const playMusicTool = createPlayMusicTool(latestMessage);
  const stopPlayingTool = createStopPlayingTool(latestMessage, client);
  const whatSongTool = createWhatSongTool(latestMessage, client);

  try {
    const response = await generateText({
      model: withTracing(
        await getUserPreferredModel(latestMessage.author),
        posthogClient,
        {
          posthogDistinctId: latestMessage.author.id,
          posthogProperties: {
            discordMessageId: latestMessage.id,
            $set: buildUserMetadata(latestMessage.author),
          },
        },
      ),
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingBudget: 2048,
          },
        } satisfies GoogleGenerativeAIProviderOptions,
        anthropic: {
          thinkingConfig: {
            thinkingBudget: 2048,
          },
        },
        bedrock: {
          reasoningConfig: { type: "enabled", budgetTokens: 2048 },
        },
      },
      system: systemPrompt,
      messages: messages
        .reverse()
        .map((message) => getMessageContentOrParts(message)),
      tools: {
        playMusic: playMusicTool,
        myself: myselfTool,
        sendMessage: sendMessageTool,
        stopPlaying: stopPlayingTool,
        whatSong: whatSongTool,
      },
      toolChoice: "auto",
    });

    const text = response.text;
    const toolResponse = response.toolResults[0]?.output as string | undefined;
    const message = toolResponse || text;

    posthogClient.capture({
      event: eventTypes.aiMessage,
      distinctId: latestMessage.author.id,
      properties: {
        $set: {
          name: latestMessage.author.username,
          displayName: latestMessage.author.displayName,
          avatar: latestMessage.author.avatarURL(),
          userId: latestMessage.author.id,
        },
        distinct_id: latestMessage.author.id,
        message: latestMessage.cleanContent,
        response: message,
      },
    });

    const outputText = makeCompleteEmoji(message).replace(
      /\b(?:i(?:[''])?m|i am)\s+a\s+d(o|0)g\w*\b([.!?])?/gi,
      "I'm not a dog$2",
    );

    const userUnderScrutiny = await redis.get(
      `scrutiny:${latestMessage.author.id}`,
    );
    if (userUnderScrutiny) {
      const scrutinyResponse = await scrutinizeMessage(outputText);
      if (scrutinyResponse.safe) {
        return outputText;
      }

      return scrutinyResponse.message;
    }
    return outputText;
  } catch (error) {
    console.log(error);
    console.log(JSON.stringify(error));
    // return "I'm sorry, I don't know what to say. Please try again later.";
  }
}

export async function getMistyAskOutput(request: string, user: User) {
  const response = await generateText({
    model: withTracing(await getUserPreferredModel(user), posthogClient, {
      posthogDistinctId: user.id,
      posthogProperties: {
        $set: buildUserMetadata(user),
      },
    }),
    system: basePrompt,
    messages: [
      {
        role: "system",

        content:
          basePrompt +
          "\n You MUST output text transforming what the user says into a request for LuxPlanes, your owner to fulfull. You can use emojis, especially :pwease:. You MUST format the text starting by saying who made the request, replaicing their name with {__USER__}. ALWAYS include {__USER__} in the output. If you are referring to LuxPlanes, refer to him as you, not as @LuxPlanes. If someone gives a reason for the request, please keep it but turn it into a Misty-style response, while still keeping the original meaning.",
      },
      {
        role: "user",

        content: JSON.stringify({
          author: user,
          cleanContent: request,
          id: user.id,
        }),
      },
    ],
  });

  return makeCompleteEmoji(
    response.text.replace("{__USER__}", `<@${user.id}>`),
  );
}
