# MistyBot

MistyBot is a Discord bot inspired by a cat named Misty. It features AI-powered conversations, voice capabilities (playing music/sounds), image generation, and more.

## Features

*   **AI Chat:** Conversational abilities powered by multiple LLM providers (Groq, Cerebras, Google Vertex AI, Amazon Bedrock).
*   **Persona:** Adopts the persona of Misty, a British Shorthair cat.
*   **Voice:** Can join voice channels, play music (from a playlist), and "meow".
*   **Image Generation:** capable of handling image-related tasks.
*   **Analytics:** Integration with PostHog for tracking usage and errors.
*   **Moderation:** Automated message scrutiny.

## Prerequisites

*   Node.js (v20+ recommended)
*   [pnpm](https://pnpm.io/)
*   Redis database (Upstash recommended)

## Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/StarNumber12046/MistyBot.git
    cd MistyBot
    ```

2.  Install dependencies:
    ```bash
    pnpm install
    ```

## Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Discord
BOT_TOKEN=your_discord_bot_token

# AI Providers
GROQ_API_KEY=your_groq_api_key
CEREBRAS_API_KEY=your_cerebras_api_key
VERTEX_API_KEY=your_vertex_api_key
BEDROCK_API_KEY=your_bedrock_api_key

# Analytics
POSTHOG_API_KEY=your_posthog_api_key

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
```

## Usage

### Development

To run the bot in development mode with hot-reloading:

```bash
pnpm dev
```

### Production

To start the bot in production mode:

```bash
pnpm start
```
*(Note: Ensure you have built the project if `dist/` is not present, though the current scripts assume `node dist/main.js` works)*

## Project Structure

*   `src/commands`: Command handlers (config, game, image, voice, etc.).
*   `src/events`: Event handlers (message, interaction, etc.).
*   `src/tools`: AI tools/functions.
*   `src/utils`: Utilities for Redis, analytics, logging, and more.
