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
import { Effect } from "effect";

const systemPrompt = basePrompt;

export const genMistyOutput = (
  messages: Message[],
  client: ClientType,
  latestMessage: Message,
) =>
  Effect.gen(function* () {
    const userModel = yield* Effect.promise(() =>
      getUserPreferredModel(latestMessage.author),
    );
    const modelName = userModel.modelId;

    yield* Effect.annotateCurrentSpan({
      "discord.message.id": latestMessage.id,
      "ai.messages.count": messages.length,
      "ai.model.name": modelName,
      "discord.user.id": latestMessage.author.id,
    });

    // Create tools with injected dependencies
    const myselfTool = createMyselfTool();
    const sendMessageTool = createSendMessageTool();
    const playMusicTool = createPlayMusicTool(latestMessage);
    const stopPlayingTool = createStopPlayingTool(latestMessage, client);
    const whatSongTool = createWhatSongTool(latestMessage, client);

    const response = yield* Effect.promise(() =>
      generateText({
        model: withTracing(userModel, posthogClient, {
          posthogDistinctId: latestMessage.author.id,
          posthogProperties: {
            discordMessageId: latestMessage.id,
            $set: buildUserMetadata(latestMessage.author),
          },
        }),
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
      }),
    );

    const text = response.text;
    const toolResponse = response.toolResults[0]?.output as string | undefined;
    const message = toolResponse || text;

    // Log tool invocations via Effect logs if needed, or just let span attributes capture usage
    if (response.toolCalls && response.toolCalls.length > 0) {
      for (const toolCall of response.toolCalls) {
        yield* Effect.logDebug("AI tool invoked", {
          "ai.tool.name": toolCall.toolName,
          "ai.tool.call_id": toolCall.toolCallId,
        });
      }
    }

    const usage = response.usage as any;
    yield* Effect.annotateCurrentSpan({
      "ai.response.tokens.input": usage?.promptTokens ?? usage?.inputTokens,
      "ai.response.tokens.output":
        usage?.completionTokens ?? usage?.outputTokens,
      "ai.tools.count": response.toolCalls?.length ?? 0,
      "ai.stop_reason": response.finishReason,
    });
    
    const toolsUsed = response.toolCalls?.map((tc) => tc.toolName) ?? [];
    if (toolsUsed.length > 0) {
       // Effect.annotateCurrentSpan doesn't support arrays directly for all backends, 
       // but we can join them or assume the exporter handles it. 
       // For safety in typical OTEL, strings are best.
       yield* Effect.annotateCurrentSpan("ai.tools.used", toolsUsed.join(","));
    }

    yield* Effect.sync(() =>
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
      }),
    );

    const outputText = makeCompleteEmoji(message).replace(
      /\b(?:i(?:[''])?m|i am)\s+a\s+d(o|0)g\w*\b([.!?])?/gi,
      "I'm not a dog$2",
    );

    const userUnderScrutiny = yield* Effect.promise(() =>
      redis.get(`scrutiny:${latestMessage.author.id}`),
    );

    if (userUnderScrutiny) {
      const scrutinyResponse = yield* Effect.promise(() =>
        scrutinizeMessage(outputText, latestMessage.author.id),
      );
      if (scrutinyResponse.safe) {
        return outputText;
      }

      return scrutinyResponse.message;
    }
    return outputText;
  }).pipe(
    Effect.withSpan("ai.generation"),
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError("AI generation failed", error as Error);
        return undefined;
      })
    )
  );

export const getMistyAskOutput = (request: string, user: User) =>
  Effect.gen(function* () {
    const userModel = yield* Effect.promise(() => getUserPreferredModel(user));
    const modelName = userModel.modelId;

    yield* Effect.annotateCurrentSpan({
      "ai.generation.type": "ask_command",
      "ai.model.name": modelName,
      "discord.user.id": user.id,
    });

    const response = yield* Effect.promise(() =>
      generateText({
        model: withTracing(userModel, posthogClient, {
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
      }),
    );

    const usage = response.usage as any;
    yield* Effect.annotateCurrentSpan({
      "ai.response.tokens.input": usage?.promptTokens ?? usage?.inputTokens,
      "ai.response.tokens.output":
        usage?.completionTokens ?? usage?.outputTokens,
      "ai.stop_reason": response.finishReason,
    });

    return makeCompleteEmoji(
      response.text.replace("{__USER__}", `<@${user.id}>`),
    );
  }).pipe(
    Effect.withSpan("ai.ask_command"),
    Effect.catchAll((error) =>
        Effect.gen(function* () {
            yield* Effect.logError("Ask command generation failed", error as Error);
            return yield* Effect.fail(error);
        })
    )
  );
