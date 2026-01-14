import { withTracing } from "@posthog/ai";
import {
  generateText,
  Output,
  tool,
  // type FilePart,
  // type ImagePart,
  type TextPart,
} from "ai";
import { type GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import {
  basePrompt,
  DEFAULT_MODEL,
  emojis,
  MODELS,
  MODERATION_MODEL,
  MODERATION_PROMPT,
} from "./config.js";
import { User, VoiceChannel, type Message } from "discord.js";
import { z } from "zod/v3";
import type { ClientType } from "./types.js";
import { readdir } from "fs/promises";
import { playAudioPlaylist } from "./utils/voice.js";
import { getVoiceConnection } from "@discordjs/voice";
import NodeID3 from "node-id3";
import { posthogClient, eventTypes } from "./analytics.js";
import { redis } from "./utils/redis.js";

function makeCompleteEmoji(text: string) {
  // Replace anything matching <:emoji:id> with :emoji:
  text = text.replaceAll(/<a?:(\w+):(\d+)>/g, (match, emoji) => {
    return `:${emoji}:`;
  });
  Object.keys(emojis).forEach((emoji) => {
    text = text.replaceAll(":" + emoji + ":", emojis[emoji].completeEmoji);
  });
  console.log(text);
  return text;
}

async function scrutinizeMessage(aiText: string) {
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
  return scrutinizedMessage.output;
}

const toolsPrompt = `
### **5. Special Commands & Input Structure**

On EVERY request you MUST use a tool. Not using a tool will lead to a request failure.`;

const systemPrompt = basePrompt + toolsPrompt;

console.log(systemPrompt);

function getMessageContentOrParts(message: Message) {
  if (message.author.bot) {
    return {
      content: message.cleanContent,
      role: "assistant" as const,
    };
  }
  return {
    role: "user" as const,
    content: [
      {
        type: "text",
        text: JSON.stringify({
          author: {
            username: message.author.username,
            displayName: message.author.displayName,
            id: message.author.id,
          },
          content: message.cleanContent,
          id: message.id,
        }),
      } as TextPart,

      // ...(message.attachments.map((attachment) => {
      // const isImage = attachment.contentType?.startsWith("image");
      // if (isImage) {
      // return {
      // type: "image",
      // image: attachment.url,
      // mimeType: attachment.contentType,
      // };
      // }
      // return {
      // type: isImage ? "image" : "file",
      // data: attachment.url,
      // mimeType: attachment.contentType,
      // };
      // }) as ImagePart[]),
    ],
  };
}

async function getUserPreferredModel(user: User) {
  const userModel: string =
    (await redis.get(`user:${user.id}:model`)) ?? DEFAULT_MODEL;
  if (userModel && userModel in MODELS) {
    return MODELS[userModel as keyof typeof MODELS];
  }
  return MODELS[DEFAULT_MODEL];
}

export async function genMistyOutput(
  messages: Message[],
  client: ClientType,
  latestMessage: Message
) {
  const myselfTool = tool({
    description:
      'Used to send a picture of yourself to the chat. Only use this when the most recent output is asking for your appearance (e.g. "what do you look like?" or "send me a picture of yourself").',
    inputSchema: z.object({}),
    execute: async () => {
      return `{{MYSELF}}`;
    },
  });

  const sendMessageTool = tool({
    description:
      "Sends a message to the chat. Use this tool during conversations. Use this tool if you don't have any other tools available. ONLY include the message contents!",
    inputSchema: z.object({
      message: z.string(),
    }),
    execute: async ({ message }) => {
      return message;
    },
  });

  const playMusicTool = tool({
    description:
      "Plays music from the 24h stream. Use this tool when asked to play music or sing.",
    inputSchema: z.object({}),
    execute: async () => {
      if (!latestMessage.member?.voice?.channel) {
        return "I don't know where to sing!";
      }
      await playAudioPlaylist(
        latestMessage.member.voice.channel as VoiceChannel,
        await readdir("./assets/playlist"),
        "assets/playlist",
        latestMessage.member.user
      );
      return "I'm now singing music from the 24h stream!";
    },
  });

  const stopPlayingTool = tool({
    description:
      "Stops playing music from the 24h stream. Use this tool when asked to stop playing music or sing.",
    inputSchema: z.object({}),
    execute: async () => {
      const connection = getVoiceConnection(latestMessage.guildId ?? "");
      if (!connection) {
        return "I'm not singing!";
      }
      client.players.delete(latestMessage.guildId ?? "");
      connection.destroy();
      return "I'm no longer singing!";
    },
  });

  const whatSongTool = tool({
    description:
      "Tells you what song Misty is currently playing. Use this tool when asked to tell you what song Misty is playing.",
    inputSchema: z.object({}),
    execute: async () => {
      const resource = client.audioResources.get(latestMessage.guildId ?? "");

      if (!resource) {
        return "I'm not singing!";
      }

      const filename = (resource.metadata as { filename: string })
        ?.filename as string;
      const resourceTags = NodeID3.read(filename);
      return `I'm currently playing ${resourceTags.title ?? "Unknown"} by ${
        resourceTags.artist ?? "Unknown"
      }`;
    },
  });

  try {
    const response = await generateText({
      model: withTracing(
        await getUserPreferredModel(latestMessage.author),
        posthogClient,
        {
          posthogDistinctId: latestMessage.author.id,
          posthogProperties: {
            discordMessageId: latestMessage.id,
            $set: {
              name: latestMessage.author.username,
              displayName: latestMessage.author.displayName,
              avatar: latestMessage.author.avatarURL(),
              userId: latestMessage.author.id,
            },
          },
        }
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
      "I'm not a dog$1"
    );

    const userUnderScrutiny = await redis.get(
      `scrutiny:${latestMessage.author.id}`
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
        $set: {
          name: user.username,
          displayName: user.displayName,
          avatar: user.avatarURL(),
          userId: user.id,
        },
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
    response.text.replace("{__USER__}", `<@${user.id}>`)
  );
}
