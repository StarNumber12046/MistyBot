# MistyBot

MistyBot is a Discord bot inspired by a cat named Misty. It features AI-powered conversations, voice capabilities (playing music/sounds), image generation, and more.

## Features

*   **AI Chat:** Conversational abilities powered by multiple LLM providers (Groq, Cerebras, Google Vertex AI, Amazon Bedrock).
*   **Persona:** Adopts the persona of Misty, a British Shorthair cat.
*   **Voice:** Can join voice channels, play music (from a playlist), and "meow".
*   **Image Generation:** capable of handling image-related tasks.
*   **Analytics:** Integration with PostHog and Axiom for tracking usage and errors.
*   **Moderation:** Automated message scrutiny.
*   **Games:** Aircraft guessing game using local datasets.

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

Create a `.env` file in the root directory with the following variables.

### Discord Configuration
*   `BOT_TOKEN`: Your Discord bot token.
*   `BOT_CLIENT_ID`: The application ID of the bot.
*   `BOT_GUILD_ID`: The main guild ID (used for registering guild-specific commands).
*   `OWNER_ID`: The user ID of the bot owner.
*   `LUXPLANES_ID`: Specific user ID for the bot's "owner" persona interactions.
*   `MAIN_GUILD_ID`: The ID of the primary server.
*   `SUGGESTIONS_CHANNEL_ID`: Channel ID for suggestions.

### AI Providers
*   `GROQ_API_KEY`: API key for Groq.
*   `CEREBRAS_API_KEY`: API key for Cerebras.
*   `VERTEX_API_KEY`: API key for Google Vertex AI.
*   `BEDROCK_API_KEY`: API key for Amazon Bedrock.
*   `AWS_REGION`: AWS Region for Bedrock (e.g., `us-east-1`).

### Analytics & Logging
*   `POSTHOG_API_KEY`: API key for PostHog analytics.
*   `AXIOM_TOKEN`: API token for Axiom logging.
*   `AXIOM_DOMAIN`: Axiom domain (e.g., `api.axiom.co`).
*   `AXIOM_DATASET`: Axiom dataset name.

### Data & Storage
*   `UPSTASH_REDIS_REST_URL`: URL for Upstash Redis.
*   `UPSTASH_REDIS_REST_TOKEN`: Token for Upstash Redis.
*   `UPLOADTHING_TOKEN`: Token for UploadThing (image hosting).
*   `DB_FILE_NAME`: Database filename (if using local SQLite/LibSQL).
*   `DATASETS_PATH`: Local path to datasets (used for the aircraft guessing game).
*   `GITHUB_TOKEN`: GitHub Personal Access Token (for PR utilities).

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

## Project Structure

*   `src/commands`: Command handlers (config, game, image, voice, etc.).
*   `src/events`: Event handlers (message, interaction, etc.).
*   `src/tools`: AI tools/functions.
*   `src/utils`: Utilities for Redis, analytics, logging, and more.
