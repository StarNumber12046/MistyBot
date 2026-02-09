import { REST, Routes } from "discord.js";
import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { env } from "node:process";
import { fileURLToPath } from "node:url";

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config();
interface Command {
  data: {
    toJSON: () => unknown;
  };
  execute: (...args: unknown[]) => unknown;
}

const commands: unknown[] = [];

// Grab all the command folders from the commands directory
const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js") || file.endsWith(".ts") || file.endsWith(""));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);

    // Use dynamic import to load command module (ESM)
    const commandModule = await import(`file://${filePath}`);

    // Support default export or named export (common pattern)
    const command: Command = commandModule.default ?? commandModule;

    if ("data" in command && "execute" in command) {
      commands.push(command.data.toJSON());
    } else {
      console.warn(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(env.BOT_TOKEN ?? "");

// Deploy commands
(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    // Fully refresh all commands in the guild
    const data = await rest.put(
      Routes.applicationGuildCommands(
        env.BOT_CLIENT_ID ?? "",
        env.BOT_GUILD_ID ?? ""
      ),
      { body: commands }
    );
    const globalData = await rest.put(
      Routes.applicationCommands(env.BOT_CLIENT_ID ?? ""),
      { body: commands }
    );
    console.log(
      `Successfully reloaded ${
        (data as unknown[]).length
      } guild application (/) commands.`
    );
    console.log(
      `Successfully reloaded ${
        (globalData as unknown[]).length
      } global application (/) commands.`
    );
  } catch (error) {
    console.error(error);
  }
})();
