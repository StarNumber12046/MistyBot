import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  MessageFlags,
} from "discord.js";
import fs from "fs";
import path from "path";

import dotenv from "dotenv";
import type { ClientType, EventType, CommandType, ModalType } from "./types.js";
import { fileURLToPath } from "url";
import { getVoiceChannels, hasMembers, playAudio } from "./utils/voice.js";
import { eventTypes, posthogClient } from "./analytics.js";
import { ratelimit } from "./utils/redis.js";
// import { askLimit } from "./utils/redis.js";

console.log("Starting up Misty");

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const client = new Client({
  intents: [
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
  ],
}) as ClientType;

client.commands = new Collection();
client.events = new Collection();
client.players = new Collection();
client.audioResources = new Collection();
client.guessGames = new Collection();
client.modals = new Collection();
client.modalsMessageState = new Collection();
const commandsFoldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(commandsFoldersPath);
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsPath);
// const modalsPath = path.join(__dirname, "modals");
// const modalFiles = fs.readdirSync(modalsPath);

ratelimit.resetUsedTokens("1174713902454554688");

for (const folder of commandFolders) {
  const commandsPath = path.join(commandsFoldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js") || file.endsWith(""));
  for (const file of commandFiles) {
    const filePath = new URL("file://" + path.join(commandsPath, file));
    const command = (await import(filePath.toString())).default as CommandType;
    // Set a new item in the Collection with the key as the command name and the value as the exported module

    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

for (const file of eventFiles) {
  const filePath = new URL("file://" + path.join(eventsPath, file));
  const event = (await import(filePath.toString())).default as EventType;
  client.on(event.eventType, (...args: unknown[]) => {
    console.log(args);
    event.execute(client, ...args);
  });
  client.events.set(event.eventType, event);
}
/*
for (const modal of modalFiles) {
  const filePath = new URL("file://" + path.join(modalsPath, modal));
  const modalModule = (await import(filePath.toString())).default as ModalType;
  client.modals.set(modalModule.modalId, modalModule);
}
*/
async function playMeowOnGuilds() {
  const guilds = client.guilds.cache.filter(
    (guild) => guild.members.cache.filter((member) => member.user.bot).size > 0
  );
  guilds.forEach(async (guild) => {
    getVoiceChannels(guild).forEach(async (channel) => {
      console.log("Got channel " + channel.name);
      if (hasMembers(channel)) {
        console.log("Has members");
        const randomValue = Math.random();
        console.log(randomValue);
        if (channel.name === "121.5") {
          console.log("Meowing on guard!");
        }
        if (randomValue < 0.10 || channel.name === "121.5") {
          posthogClient.capture({
            event: eventTypes.meow,
            distinctId: channel.id,
            properties: {
              channel: channel.name,
            },
          });
          await playAudio(channel, "assets/meow.mp3");
          console.log("Meowed successfully!");
        }
      }
    });
  });
}

client.once(Events.ClientReady, () => {
  console.log("Ready!");
  setTimeout(playMeowOnGuilds, 1000 * 60 * 15);
  playMeowOnGuilds();
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`
      );
      return;
    }
    posthogClient.capture({
      event: eventTypes.commandExecute,
      distinctId: interaction.user.id,
      properties: {
        command: interaction.commandName,
        $set: {
          name: interaction.user.username,
          displayName: interaction.user.displayName,
          avatar: interaction.user.avatarURL(),
          userId: interaction.user.id,
        },
      },
    });
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        try {
          await interaction.reply({
            content: "There was an error while executing this command!",
            flags: MessageFlags.Ephemeral,
          });
        } catch (error) {
          posthogClient.capture({
            event: eventTypes.interactionError,
            distinctId: interaction.user.id,
            properties: {
              type: "command",
              error: (error as Error).message,
              $set: {
                name: interaction.user.username,
                displayName: interaction.user.displayName,
                avatar: interaction.user.avatarURL(),
                userId: interaction.user.id,
              },
            },
          });
          console.error(error);
        }
      }
    }
  }
  if (interaction.isMessageContextMenuCommand()) {
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`
      );
      return;
    }
    posthogClient.capture({
      event: eventTypes.commandExecute,
      distinctId: interaction.user.id,
      properties: {
        command: interaction.commandName,
        $set: {
          name: interaction.user.username,
          displayName: interaction.user.displayName,
          avatar: interaction.user.avatarURL(),
          userId: interaction.user.id,
        },
      },
    });
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        try {
          await interaction.reply({
            content: "There was an error while executing this command!",
            flags: MessageFlags.Ephemeral,
          });
        } catch (error) {
          console.error(error);
        }
      }
    }
  }
  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`
      );
      return;
    }

    try {
      await command.autocomplete(interaction);
    } catch (error) {
      posthogClient.capture({
        event: eventTypes.interactionError,
        distinctId: interaction.user.id,
        properties: {
          type: "contextMenu",
          error: (error as Error).message,
          $set: {
            name: interaction.user.username,
            displayName: interaction.user.displayName,
            avatar: interaction.user.avatarURL(),
            userId: interaction.user.id,
          },
        },
      });
      console.error(error);
    }
  }

  if (interaction.isModalSubmit()) {
    console.log(interaction.customId);
    const modalModule = client.modals.get(interaction.customId);
    if (!modalModule) {
      console.error(`No modal matching ${interaction.customId} was found.`);
      return;
    }
    posthogClient.capture({
      event: eventTypes.modalOpen,
      distinctId: interaction.user.id,
      properties: {
        modalId: interaction.customId,
        $set: {
          name: interaction.user.username,
          displayName: interaction.user.displayName,
          avatar: interaction.user.avatarURL(),
          userId: interaction.user.id,
        },
      },
    });
    try {
      modalModule.execute(client, interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        try {
          await interaction.reply({
            content: "There was an error while executing this command!",
            flags: MessageFlags.Ephemeral,
          });
        } catch (error) {
          posthogClient.capture({
            event: eventTypes.interactionError,
            distinctId: interaction.user.id,
            properties: {
              type: "modal",
              error: (error as Error).message,
              $set: {
                name: interaction.user.username,
                displayName: interaction.user.displayName,
                avatar: interaction.user.avatarURL(),
                userId: interaction.user.id,
              },
            },
          });
          console.error(error);
        }
      }
    }
  }
});

client.login(process.env.BOT_TOKEN);
