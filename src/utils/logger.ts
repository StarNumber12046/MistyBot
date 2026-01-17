import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import type {
  ChatInputCommandInteraction,
  Message,
  User,
  Guild,
  AutocompleteInteraction,
  MessageContextMenuCommandInteraction,
  ModalSubmitInteraction,
} from "discord.js";
import { env } from "process";

// ============================================================================
// Attribute Interfaces
// ============================================================================

export interface UserAttributes {
  "discord.user.id": string;
  "discord.user.username"?: string;
  "discord.user.bot"?: boolean;
}

export interface GuildAttributes {
  "discord.guild.id": string;
  "discord.guild.name"?: string;
}

export interface CommandAttributes {
  "discord.command.name": string;
  "discord.command.type": string;
  "discord.interaction.id": string;
  "discord.command.options"?: string;
}

export interface MessageAttributes {
  "discord.message.id": string;
  "discord.message.content_length": number;
  "discord.message.has_attachments": boolean;
  "discord.message.is_reply": boolean;
  "discord.message.mentions_bot": boolean;
}

export interface AIAttributes {
  "ai.model.name"?: string;
  "ai.generation.duration_ms"?: number;
  "ai.response.tokens.input"?: number;
  "ai.response.tokens.output"?: number;
  "ai.tools.used"?: string[];
  "ai.tools.count"?: number;
  "ai.stop_reason"?: string;
}

export interface VoiceAttributes {
  "discord.voice.channel_id"?: string;
  "discord.voice.channel_name"?: string;
  "discord.voice.guild_id"?: string;
  "audio.file"?: string;
  "audio.playlist_length"?: number;
}

export interface ErrorAttributes {
  "error.type": string;
  "error.message": string;
  "error.stack"?: string;
  "error.handled": boolean;
}

export interface RateLimitAttributes {
  "ratelimit.user_id": string;
  "ratelimit.remaining": number;
  "ratelimit.limit": number;
  "ratelimit.exceeded": boolean;
}

// ============================================================================
// MistyLogger Class
// ============================================================================

export class MistyLogger {
  private logger;

  constructor() {
    const loggerProvider = logs.getLoggerProvider();
    this.logger = loggerProvider.getLogger("mistybot", "1.0.0");
  }

  // --------------------------------------------------------------------------
  // Core Logging Method
  // --------------------------------------------------------------------------

  private log(
    eventType: string,
    severity: SeverityNumber,
    body: string,
    attributes: Record<string, any> = {},
  ) {
    this.logger.emit({
      severityNumber: severity,
      severityText: this.getSeverityText(severity),
      body,
      attributes: {
        "misty.event.type": eventType,
        "misty.event.timestamp": Date.now(),
        ...attributes,
      },
    });
  }

  private getSeverityText(severity: SeverityNumber): string {
    switch (severity) {
      case SeverityNumber.DEBUG:
      case SeverityNumber.DEBUG2:
      case SeverityNumber.DEBUG3:
      case SeverityNumber.DEBUG4:
        return "DEBUG";
      case SeverityNumber.INFO:
      case SeverityNumber.INFO2:
      case SeverityNumber.INFO3:
      case SeverityNumber.INFO4:
        return "INFO";
      case SeverityNumber.WARN:
      case SeverityNumber.WARN2:
      case SeverityNumber.WARN3:
      case SeverityNumber.WARN4:
        return "WARN";
      case SeverityNumber.ERROR:
      case SeverityNumber.ERROR2:
      case SeverityNumber.ERROR3:
      case SeverityNumber.ERROR4:
        return "ERROR";
      case SeverityNumber.FATAL:
      case SeverityNumber.FATAL2:
      case SeverityNumber.FATAL3:
      case SeverityNumber.FATAL4:
        return "FATAL";
      default:
        return "UNSPECIFIED";
    }
  }

  // --------------------------------------------------------------------------
  // Helper Methods to Extract Attributes
  // --------------------------------------------------------------------------

  extractUserAttributes(user: User): UserAttributes {
    return {
      "discord.user.id": user.id,
      "discord.user.username": user.username,
      "discord.user.bot": user.bot,
    };
  }

  extractGuildAttributes(guild: Guild | null): GuildAttributes | {} {
    if (!guild) return {};
    return {
      "discord.guild.id": guild.id,
      "discord.guild.name": guild.name,
    };
  }

  extractCommandAttributes(
    interaction:
      | ChatInputCommandInteraction
      | MessageContextMenuCommandInteraction
      | AutocompleteInteraction
      | ModalSubmitInteraction,
  ): Partial<CommandAttributes> {
    const attrs: Partial<CommandAttributes> = {
      "discord.interaction.id": interaction.id,
    };

    if (interaction.isChatInputCommand()) {
      attrs["discord.command.name"] = interaction.commandName;
      attrs["discord.command.type"] = "chat_input";
      const options = interaction.options.data
        .map((opt) => opt.name)
        .join(", ");
      if (options) attrs["discord.command.options"] = options;
    } else if (interaction.isMessageContextMenuCommand()) {
      attrs["discord.command.name"] = interaction.commandName;
      attrs["discord.command.type"] = "message_context_menu";
    } else if (interaction.isAutocomplete()) {
      attrs["discord.command.name"] = interaction.commandName;
      attrs["discord.command.type"] = "autocomplete";
    } else if (interaction.isModalSubmit()) {
      attrs["discord.command.type"] = "modal_submit";
    }

    return attrs;
  }

  extractMessageAttributes(message: Message): MessageAttributes {
    return {
      "discord.message.id": message.id,
      "discord.message.content_length": message.content.length,
      "discord.message.has_attachments": message.attachments.size > 0,
      "discord.message.is_reply": message.reference !== null,
      "discord.message.mentions_bot": message.client.user
        ? message.mentions.has(message.client.user.id)
        : false,
    };
  }

  extractErrorAttributes(
    error: Error,
    handled: boolean = true,
  ): ErrorAttributes {
    return {
      "error.type": error.name,
      "error.message": error.message,
      "error.stack": error.stack,
      "error.handled": handled,
    };
  }

  // --------------------------------------------------------------------------
  // System Events
  // --------------------------------------------------------------------------

  logSystemStartup(attributes: Record<string, any> = {}) {
    this.log(
      "system.startup",
      SeverityNumber.INFO,
      "MistyBot is starting up",
      attributes,
    );
  }

  logSystemReady(attributes: Record<string, any> = {}) {
    this.log(
      "system.ready",
      SeverityNumber.INFO,
      "MistyBot is ready and connected to Discord",
      attributes,
    );
  }

  logSystemShutdown(attributes: Record<string, any> = {}) {
    this.log(
      "system.shutdown",
      SeverityNumber.INFO,
      "MistyBot is shutting down",
      attributes,
    );
  }

  logSystemError(error: Error, attributes: Record<string, any> = {}) {
    this.log(
      "system.error",
      SeverityNumber.FATAL,
      `System error: ${error.message}`,
      {
        ...this.extractErrorAttributes(error, false),
        ...attributes,
      },
    );
  }

  // --------------------------------------------------------------------------
  // Command Events
  // --------------------------------------------------------------------------

  logCommandStart(
    interaction:
      | ChatInputCommandInteraction
      | MessageContextMenuCommandInteraction
      | AutocompleteInteraction
      | ModalSubmitInteraction,
    additionalAttributes: Record<string, any> = {},
  ) {
    const commandName =
      "commandName" in interaction ? interaction.commandName : "unknown";
    this.log(
      "command.start",
      SeverityNumber.INFO,
      `Command started: ${commandName}`,
      {
        ...this.extractUserAttributes(interaction.user),
        ...this.extractGuildAttributes(interaction.guild),
        ...this.extractCommandAttributes(interaction),
        ...additionalAttributes,
      },
    );
  }

  logCommandSuccess(
    interaction:
      | ChatInputCommandInteraction
      | MessageContextMenuCommandInteraction
      | AutocompleteInteraction
      | ModalSubmitInteraction,
    durationMs: number,
    additionalAttributes: Record<string, any> = {},
  ) {
    const commandName =
      "commandName" in interaction ? interaction.commandName : "unknown";
    this.log(
      "command.success",
      SeverityNumber.INFO,
      `Command completed: ${commandName}`,
      {
        ...this.extractUserAttributes(interaction.user),
        ...this.extractGuildAttributes(interaction.guild),
        ...this.extractCommandAttributes(interaction),
        "command.duration_ms": durationMs,
        ...additionalAttributes,
      },
    );
  }

  logCommandError(
    interaction:
      | ChatInputCommandInteraction
      | MessageContextMenuCommandInteraction
      | AutocompleteInteraction
      | ModalSubmitInteraction,
    error: Error,
    durationMs: number,
    additionalAttributes: Record<string, any> = {},
  ) {
    const commandName =
      "commandName" in interaction ? interaction.commandName : "unknown";
    this.log(
      "command.error",
      SeverityNumber.ERROR,
      `Command failed: ${commandName} - ${error.message}`,
      {
        ...this.extractUserAttributes(interaction.user),
        ...this.extractGuildAttributes(interaction.guild),
        ...this.extractCommandAttributes(interaction),
        ...this.extractErrorAttributes(error),
        "command.duration_ms": durationMs,
        ...additionalAttributes,
      },
    );
  }

  // --------------------------------------------------------------------------
  // Message Events
  // --------------------------------------------------------------------------

  logMessageReceived(
    message: Message,
    additionalAttributes: Record<string, any> = {},
  ) {
    this.log(
      "message.received",
      SeverityNumber.DEBUG,
      `Message received from ${message.author.username}`,
      {
        ...this.extractUserAttributes(message.author),
        ...this.extractGuildAttributes(message.guild),
        ...this.extractMessageAttributes(message),
        ...additionalAttributes,
      },
    );
  }

  logMessageIgnored(
    message: Message,
    reason: string,
    additionalAttributes: Record<string, any> = {},
  ) {
    if (!env.LOG_MESSAGE_IGNORED) return;
    this.log(
      "message.ignored",
      SeverityNumber.DEBUG,
      `Message ignored: ${reason}`,
      {
        ...this.extractUserAttributes(message.author),
        ...this.extractGuildAttributes(message.guild),
        ...this.extractMessageAttributes(message),
        "message.ignore_reason": reason,
        ...additionalAttributes,
      },
    );
  }

  logMessageResponseSent(
    message: Message,
    durationMs: number,
    additionalAttributes: Record<string, any> = {},
  ) {
    this.log(
      "message.response.sent",
      SeverityNumber.INFO,
      `Message response sent to ${message.author.username}`,
      {
        ...this.extractUserAttributes(message.author),
        ...this.extractGuildAttributes(message.guild),
        ...this.extractMessageAttributes(message),
        "message.response.duration_ms": durationMs,
        ...additionalAttributes,
      },
    );
  }

  logMessageError(
    message: Message,
    error: Error,
    additionalAttributes: Record<string, any> = {},
  ) {
    this.log(
      "message.error",
      SeverityNumber.ERROR,
      `Message handling error: ${error.message}`,
      {
        ...this.extractUserAttributes(message.author),
        ...this.extractGuildAttributes(message.guild),
        ...this.extractMessageAttributes(message),
        ...this.extractErrorAttributes(error),
        ...additionalAttributes,
      },
    );
  }

  // --------------------------------------------------------------------------
  // AI Generation Events
  // --------------------------------------------------------------------------

  logAIGenerationStart(
    userId: string,
    model: string,
    additionalAttributes: Record<string, any> = {},
  ) {
    this.log(
      "ai.generation.start",
      SeverityNumber.INFO,
      `AI generation started with model: ${model}`,
      {
        "discord.user.id": userId,
        "ai.model.name": model,
        ...additionalAttributes,
      },
    );
  }

  logAIGenerationSuccess(
    userId: string,
    model: string,
    aiAttributes: Partial<AIAttributes>,
    additionalAttributes: Record<string, any> = {},
  ) {
    this.log(
      "ai.generation.success",
      SeverityNumber.INFO,
      `AI generation completed with model: ${model}`,
      {
        "discord.user.id": userId,
        "ai.model.name": model,
        ...aiAttributes,
        ...additionalAttributes,
      },
    );
  }

  logAIGenerationError(
    userId: string,
    model: string,
    error: Error,
    additionalAttributes: Record<string, any> = {},
  ) {
    this.log(
      "ai.generation.error",
      SeverityNumber.ERROR,
      `AI generation failed: ${error.message}`,
      {
        "discord.user.id": userId,
        "ai.model.name": model,
        ...this.extractErrorAttributes(error),
        ...additionalAttributes,
      },
    );
  }

  logAIToolInvoked(
    userId: string,
    toolName: string,
    additionalAttributes: Record<string, any> = {},
  ) {
    this.log(
      "ai.tool.invoked",
      SeverityNumber.DEBUG,
      `AI tool invoked: ${toolName}`,
      {
        "discord.user.id": userId,
        "ai.tool.name": toolName,
        ...additionalAttributes,
      },
    );
  }

  // --------------------------------------------------------------------------
  // Moderation Events
  // --------------------------------------------------------------------------

  logModerationStart(
    userId: string,
    contentLength: number,
    additionalAttributes: Record<string, any> = {},
  ) {
    this.log(
      "ai.moderation.start",
      SeverityNumber.INFO,
      "AI moderation check started",
      {
        "discord.user.id": userId,
        "moderation.content_length": contentLength,
        ...additionalAttributes,
      },
    );
  }

  logModerationComplete(
    userId: string,
    isSafe: boolean,
    additionalAttributes: Record<string, any> = {},
  ) {
    this.log(
      "ai.moderation.complete",
      SeverityNumber.INFO,
      `AI moderation check completed: ${isSafe ? "safe" : "unsafe"}`,
      {
        "discord.user.id": userId,
        "moderation.is_safe": isSafe,
        ...additionalAttributes,
      },
    );
  }

  logModerationError(
    userId: string,
    error: Error,
    additionalAttributes: Record<string, any> = {},
  ) {
    this.log(
      "ai.moderation.error",
      SeverityNumber.ERROR,
      `AI moderation check failed: ${error.message}`,
      {
        "discord.user.id": userId,
        ...this.extractErrorAttributes(error),
        ...additionalAttributes,
      },
    );
  }

  // --------------------------------------------------------------------------
  // Voice Events
  // --------------------------------------------------------------------------

  logVoicePlay(
    guildId: string,
    channelId: string,
    audioFile: string,
    additionalAttributes: Record<string, any> = {},
  ) {
    this.log(
      "voice.play",
      SeverityNumber.INFO,
      `Voice playback started: ${audioFile}`,
      {
        "discord.voice.guild_id": guildId,
        "discord.voice.channel_id": channelId,
        "audio.file": audioFile,
        ...additionalAttributes,
      },
    );
  }

  logVoicePlayComplete(
    guildId: string,
    channelId: string,
    audioFile: string,
    additionalAttributes: Record<string, any> = {},
  ) {
    this.log(
      "voice.play.complete",
      SeverityNumber.DEBUG,
      `Voice playback completed: ${audioFile}`,
      {
        "discord.voice.guild_id": guildId,
        "discord.voice.channel_id": channelId,
        "audio.file": audioFile,
        ...additionalAttributes,
      },
    );
  }

  logVoiceError(
    guildId: string,
    channelId: string,
    error: Error,
    additionalAttributes: Record<string, any> = {},
  ) {
    this.log(
      "voice.error",
      SeverityNumber.ERROR,
      `Voice error: ${error.message}`,
      {
        "discord.voice.guild_id": guildId,
        "discord.voice.channel_id": channelId,
        ...this.extractErrorAttributes(error),
        ...additionalAttributes,
      },
    );
  }

  // --------------------------------------------------------------------------
  // Rate Limit Events
  // --------------------------------------------------------------------------

  logRateLimitCheck(
    userId: string,
    remaining: number,
    limit: number,
    additionalAttributes: Record<string, any> = {},
  ) {
    const exceeded = remaining <= 0;
    this.log(
      "ratelimit.check",
      exceeded ? SeverityNumber.WARN : SeverityNumber.DEBUG,
      `Rate limit check: ${remaining}/${limit} remaining`,
      {
        "ratelimit.user_id": userId,
        "ratelimit.remaining": remaining,
        "ratelimit.limit": limit,
        "ratelimit.exceeded": exceeded,
        ...additionalAttributes,
      },
    );
  }

  logRateLimitExceeded(
    userId: string,
    limit: number,
    additionalAttributes: Record<string, any> = {},
  ) {
    this.log(
      "ratelimit.exceeded",
      SeverityNumber.WARN,
      `Rate limit exceeded for user ${userId}`,
      {
        "ratelimit.user_id": userId,
        "ratelimit.limit": limit,
        "ratelimit.exceeded": true,
        ...additionalAttributes,
      },
    );
  }

  // --------------------------------------------------------------------------
  // Generic Log Methods (for custom events)
  // --------------------------------------------------------------------------

  debug(eventType: string, body: string, attributes: Record<string, any> = {}) {
    this.log(eventType, SeverityNumber.DEBUG, body, attributes);
  }

  info(eventType: string, body: string, attributes: Record<string, any> = {}) {
    this.log(eventType, SeverityNumber.INFO, body, attributes);
  }

  warn(eventType: string, body: string, attributes: Record<string, any> = {}) {
    this.log(eventType, SeverityNumber.WARN, body, attributes);
  }

  error(eventType: string, body: string, attributes: Record<string, any> = {}) {
    this.log(eventType, SeverityNumber.ERROR, body, attributes);
  }

  fatal(eventType: string, body: string, attributes: Record<string, any> = {}) {
    this.log(eventType, SeverityNumber.FATAL, body, attributes);
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const logger = new MistyLogger();
