import type { AudioPlayer, AudioResource } from "@discordjs/voice";
import {
  Client,
  Collection,
  Message,
  SlashCommandBuilder,
  type Interaction,
} from "discord.js";

// Types

export interface CommandType {
  data: SlashCommandBuilder;
  execute: (interaction: Interaction) => void;
  autocomplete?: (interaction: Interaction) => void;
}

export interface GuessGame {
  imageUrl: string;
  registration: string;
  guesses: Message[];
  icaoCode: string;
  originalMessage: Message;
}

export type ClientType = Client<boolean> & {
  commands: Collection<string, CommandType>;
  events: Collection<string, EventType>;
  players: Collection<string, AudioPlayer>;
  audioResources: Collection<string, AudioResource>;
  guessGames: Collection<string, GuessGame>;
  modals: Collection<string, ModalType>;
  modalsMessageState: Collection<string, Message>;
};

export interface EventType {
  eventType: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: (client: ClientType, ...args: any[]) => unknown;
}

export interface ModalType {
  modalId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: (client: ClientType, ...args: any[]) => unknown;
}
