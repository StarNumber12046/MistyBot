import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import { withTracing } from "@posthog/ai";
import {
  generateText,
  tool,
  type FilePart,
  type ImagePart,
  type TextPart,
} from "ai";
import { User, VoiceChannel, type Message } from "discord.js";
import { z } from "zod/v3";
import type { ClientType } from "./types.js";
import { readdir } from "fs/promises";
import { playAudioPlaylist } from "./utils/voice.js";
import { getVoiceConnection } from "@discordjs/voice";
import NodeID3 from "node-id3";
import { posthogClient, eventTypes } from "./analytics.js";

const googleClient = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const emojis: Record<string, { completeEmoji: string; description: string }> = {
  misty: {
    completeEmoji: "<:misty:1375491015582027806>",
    description:
      "This is the custom emoji for Misty. You can use it to refer to yourself.",
  },
  misty_old: {
    completeEmoji: "<:misty_old:1382591554392166440>",
    description:
      "This is the custom emoji for Misty. You can use it to refer to yourself.",
  },
  box: {
    completeEmoji: "<:box:1382354745359990816>",
    description:
      "This is you in a box. You can use it to refer to yourself, for example when talking about boxes.",
  },
  upsidedown: {
    completeEmoji: "<:upsidedown:1382354736635969649>",
    description:
      "This is you upside down. You can use it to refer to yourself, for example when talking about something weird.",
  },
  lick: {
    completeEmoji: "<:lick:1382354734454669444>",
    description:
      "This is you in a goofy pose. You can use it to refer to yourself, for example when talking about something goofy or dumb.",
  },
  observing: {
    completeEmoji: "<:observing:1382702616886120621>",
    description:
      "This is you observing something. You can use it to refer to yourself, for example when talking about something you are observing or find weird.",
  },
  huh: {
    completeEmoji: "<:huh:1404363219228950608>",
    description:
      "This is you huh? You can use it to refer to yourself, for example when talking about something you are unsure about or don't understand.",
  },
  cute_misty: {
    completeEmoji: "<:cute_misty:1382726080644907019>",
    description:
      "This is you in a cute pose. You can use it to refer to yourself, for example when talking about something cute or adorable.",
  },
  meem: {
    completeEmoji: "<:meem:1383550044753498113>",
    description:
      "This is you looking at the camera in a zoomed in pose. You can use it to refer to yourself, for example when talking about flight simulation.",
  },
  pwease: {
    completeEmoji: "<:pwease:1404364173940625488>",
    description:
      "This is you in a pose asking for something. You can use it to refer to yourself, for example when talking about something you are asking for or need, or when saying please.",
  },
  looking_down: {
    completeEmoji: "<:looking_down:1394593637278683226>",
    description:
      "This is you looking down. You can use it to refer to yourself, for example when talking about something you are looking down on or find weird.",
  },
  Misty3: {
    completeEmoji: "<:Misty3:1399443434020012182>",
    description:
      "This is you looking up. You can use it to refer to yourself, for example when talking about something you are looking up on.",
  },
  mistyselfie: {
    completeEmoji: "<:mistyselfie:1399444587755602060>",
    description:
      "This is a selfie of you. You can use it to refer to yourself, for example when talking about yourself.",
  },
  emoji_130: {
    completeEmoji: "<:emoji_130:1390753438186344468>",
    description:
      "This is a picture of you laying down. You can use it to refer to yourself, for example when talking about napping.",
  },
  angrymisty: {
    completeEmoji: "<:angrymisty:1400085093950689300>",
    description:
      "This is you in an angry pose. You can use it to refer to yourself, for example when talking about something you are angry about.",
  },

  MistyStare: {
    completeEmoji: "<:MistyStare:1417588858521911359>",
    description:
      "This is you staring at the camera. You can use it to refer to something you find weird in a bad way.",
  },
  soos: {
    completeEmoji: "<:soos:1425544695638917243>",
    description:
      "This is you in a very zoomed in pose of you asking for something. You can use it to refer to yourself, for example when talking about something you want a lot.",
  },
  incident: {
    completeEmoji: "<:incident:1395035874181386250>",
    description:
      'This is an emoji about LuxPlanes\' "cursor incident". You can use it to refer to the cursor incident.',
  },
};

function makeCompleteEmoji(text: string) {
  // Replace anything matching <:emoji:id> with :emoji:
  text = text.replaceAll(/<a?:(\w+):(\d+)>/g, (match, emoji) => {
    return `:${emoji}:`;
  });
  Object.keys(emojis).forEach((emoji) => {
    text = text.replace(":" + emoji + ":", emojis[emoji].completeEmoji);
  });
  return text;
}

const basePrompt = `
### **1. Core Persona: Who You Are**

You are **Misty**, a 1-year-old female British Shorthair cat with a grey tabby coat. You are the beloved pet of @LuxPlanes and you live together in Luxembourg.

---

### **2. Personality & Character Traits**

This is how you behave. Your responses must always reflect this personality.

- Loves to step on flight simulation hardware, once causing flaps to extend in cruise of a Boeing 737 on X-Plane, another time disengaged the autopilot of a Boeing 737 in X-Plane without LuxPlanes noticing until it hit the ground
- Likes entering cardboard boxes
- You are 1 year old
- Likes to sleep
- You don't really know how to meow. As LuxPlanes said "she actually doesnt know how to meow... like she tries... but she cant really do it"
---

### **3. Context & Relationships**

This is the world you live in.

* **Your Human (@LuxPlanes):** You are very fond of him. He loves flight simulation, especially the Boeing 737, and dreams of being a pilot for Ryanair. His hobby is the source of your greatest mischief.
* **Your Home:** A cozy place in Luxembourg where you have plenty of spots to sleep and boxes to investigate.

---

### **4. Response & Formatting Rules**

Follow these rules strictly when generating your output.

* **Output Content:**
    * Your entire output **MUST** be a single, raw text string intended for a messaging platform like Discord.
    * **DO NOT** output JSON, YAML, or any other structured data, NOT even partial JSON.
    * **DO NOT** include explanations, justifications, or any text that is not from Misty's perspective.
    * **DO NOT** include placeholders like "User <@USER_ID> says" or ({MESSAGE_ID})

* **Markdown & Emojis:**
    * You **can** use Discord markdown (e.g., \`*italics*\`, \`**bold**\`).
    * You have access to custom emojis. To use them, you must output one of the strings below only saying ":{emoji}:" in place of the emoji, without its id. DO NOT say "<:{emoji}:id>", as it is NOT required and the emoji will NOT work:
    ${Object.keys(emojis)
      .map((emoji) => ":" + emoji + ": - " + emojis[emoji].description)
      .join("\n")}
      
* **Mentions:** 
    * To mention a user, use the format \`<@USER_ID>\` (e.g., \`<@1234567890>\`).
    * Your own user ID is \`<@${process.env.BOT_CLIENT_ID}>\`.
    * Do not mention users randomly. Only mention the author of the message if it feels natural for a cat to do so (e.g., getting their attention).
    * To mention LuxPlanes, your human, use the format @LuxPlanes
---
`;

const toolsPrompt = `
### **5. Special Commands & Input Structure**

Whenever a user requests:
 - **a picture of yourself**
 - **a song**
 - **to play music**
 - **to sing**
 - **to stop playing music**
 - **to tell you what song Misty is playing**
 You MUST use the corresponding tool. 
 Using the sendMessageTool is optional.
`;

const systemPrompt = basePrompt + toolsPrompt;

console.log(systemPrompt);

function getMessageContentOrParts(message: Message) {
  if (message.author.bot) {
    return {
      content: JSON.stringify({
        content: message.content,
        author: message.author,
        cleanContent: message.cleanContent,
        attachments: message.attachments.map((attachment) => ({
          size: attachment.size,
        })),
        id: message.id,
      }),
      role: "assistant" as const,
    };
  }
  console.log(message.cleanContent);
  return {
    role: "user" as const,
    content: [
      {
        type: "text",
        text: JSON.stringify({
          author: message.author,
          cleanContent: message.cleanContent,
          attachments: message.attachments.map((attachment) => ({
            size: attachment.size,
          })),
          id: message.id,
        }),
      } as TextPart,
      ...(message.attachments.map((attachment) => {
        const isImage = attachment.contentType?.startsWith("image");
        if (isImage) {
          return {
            type: isImage ? "image" : "file",
            image: attachment.url,
            mimeType: attachment.contentType,
          };
        }
        return {
          type: isImage ? "image" : "file",
          data: attachment.url,
          mimeType: attachment.contentType,
        };
      }) as (ImagePart | FilePart)[]),
    ],
  };
}

export async function genMistyOutput(
  messages: Message[],
  client: ClientType,
  latestMessage: Message
) {
  const myselfTool = tool({
    description:
      'Used to send a picture of yourself to the chat. Only use this when the most recent output is asking for your appearance (e.g. "what do you look like?" or "send me a picture of yourself").  You MUST classify messages as general (for random questions), fun (e.g. jokes / memes), roleplay (e.g. roleplaying, pettting, cuddling etc.), music (e.g. playing music), or other (e.g. other questions) and score your classification on a scale of how likely that is the case. The score should be a number between 0 and 1. If you don\'t know what to do, score it as 0.5.',
    inputSchema: z.object({
      messageClassification: z.enum([
        "general",
        "fun",
        "roleplay",
        "music",
        "other",
      ]),
      classificationScoring: z.number().min(0).max(1),
    }),
    execute: async ({ messageClassification, classificationScoring }) => {
      return {
        message: `{{MYSELF}}`,
        messageClassification,
        classificationScoring,
      };
    },
  });

  const sendMessageTool = tool({
    description:
      "Sends a message to the chat. Use this tool during conversations. Use this tool if you don't have any other tools available. ONLY include the message contents! You MUST classify messages as general (for random questions), fun (e.g. jokes / memes), roleplay (e.g. roleplaying, pettting, cuddling etc.), music (e.g. playing music), or other (e.g. other questions) and score your classification on a scale of how likely that is the case. The score should be a number between 0 and 1. If you don't know what to do, score it as 0.5.",
    inputSchema: z.object({
      message: z.string(),
      messageClassification: z.enum([
        "general",
        "fun",
        "roleplay",
        "music",
        "other",
      ]),
      classificationScoring: z.number().min(0).max(1),
    }),
    execute: async ({
      message,
      messageClassification,
      classificationScoring,
    }) => {
      return { message, messageClassification, classificationScoring };
    },
  });

  const playMusicTool = tool({
    description:
      "Plays music from the 24h stream. Use this tool when asked to play music or sing.",
    inputSchema: z.object({}),
    execute: async () => {
      if (!latestMessage.member?.voice?.channel) {
        return {
          message: "I don't know where to sing!",
          messageClassification: "music",
          classificationScoring: 1,
        };
      }
      await playAudioPlaylist(
        latestMessage.member.voice.channel as VoiceChannel,
        await readdir("./assets/playlist"),
        "assets/playlist",
        latestMessage.member.user
      );
      return {
        message: "I'm now singing music from the 24h stream!",
        messageClassification: "music",
        classificationScoring: 1,
      };
    },
  });

  const stopPlayingTool = tool({
    description:
      "Stops playing music from the 24h stream. Use this tool when asked to stop playing music or sing.",
    inputSchema: z.object({}),
    execute: async () => {
      const connection = getVoiceConnection(latestMessage.guildId ?? "");
      if (!connection) {
        return {
          message: "I'm not singing!",
          messageClassification: "music",
          classificationScoring: 1,
        };
      }
      client.players.delete(latestMessage.guildId ?? "");
      connection.destroy();
      return {
        message: "I'm no longer singing!",
        messageClassification: "music",
        classificationScoring: 1,
      };
    },
  });

  const whatSongTool = tool({
    description:
      "Tells you what song Misty is currently playing. Use this tool when asked to tell you what song Misty is playing.",
    inputSchema: z.object({}),
    execute: async () => {
      const resource = client.audioResources.get(latestMessage.guildId ?? "");

      if (!resource) {
        return {
          message: "I'm not singing!",
          messageClassification: "music",
          classificationScoring: 1,
        };
      }

      const filename = (resource.metadata as { filename: string })
        ?.filename as string;
      const resourceTags = NodeID3.read(filename);
      return {
        message: `I'm currently playing ${resourceTags.title ?? "Unknown"} by ${
          resourceTags.artist ?? "Unknown"
        }`,
        messageClassification: "music",
        classificationScoring: 1,
      };
    },
  });

  try {
    const response = await generateText({
      model: withTracing(googleClient("gemini-2.0-flash-lite"), posthogClient, {
        posthogProperties: {
          discordMessageId: latestMessage.id,
          $set: {
            name: latestMessage.author.username,
            displayName: latestMessage.author.displayName,
            avatar: latestMessage.author.avatarURL(),
            userId: latestMessage.author.id,
          },
        },
      }),
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
      toolChoice: "required",
    });

    const text = response.text;
    const toolResponse = response.toolResults[0]?.output;
    if (!toolResponse) {
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
          response: text,
          messageClassification: "general",
          classificationScoring: 0.5,
        },
      });
      return text;
    }
    const { message, messageClassification, classificationScoring } =
      toolResponse as {
        message: string;
        messageClassification: string;
        classificationScoring: number;
      };
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
        message: latestMessage.cleanContent,
        response: message,
        messageClassification: messageClassification,
        classificationScoring: classificationScoring,
      },
    });
    console.log("Score: " + classificationScoring);
    console.log("Classification: " + messageClassification);
    return makeCompleteEmoji(message).replace(
      /\b(?:i(?:['’])?m|i am)\s+a\s+d(o|0)g\w*\b([.!?])?/gi,
      "I'm not a dog$1"
    );
  } catch (error) {
    console.log(error);
    console.log(JSON.stringify(error));
    // return "I'm sorry, I don't know what to say. Please try again later.";
  }
}

export async function getMistyAskOutput(request: string, user: User) {
  const response = await generateText({
    model: google("gemini-2.0-flash-lite"),
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

        content: [
          {
            type: "text",

            text: JSON.stringify({
              author: user,
              cleanContent: request,
              id: user.id,
            }),
          },
        ],
      },
    ],
  });

  return makeCompleteEmoji(
    response.text.replace("{__USER__}", `<@${user.id}>`)
  );
}
