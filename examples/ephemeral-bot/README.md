# grammY Ephemeral Bot Example

Demonstrates **Telegram Bot API 10.3** Ephemeral (Invisible) Messages in Groups, Two-Way Invisible Commands, In-Place Private Overlays, and Communities Integration.

## Features
- **Two-Way Invisible Commands (`/whisper`):** Invoked with `is_ephemeral: true`, hiding the user's prompt from other members.
- **Private In-Place Overlays (`replace_callback_query_message: true`):** Clicking an inline button on a public group hub replaces the card with an ephemeral private view for that member only.
- **In-Place Ephemeral Mutations:** Editing ephemeral text with `editEphemeralMessageText` and self-service closing via `deleteEphemeralMessage`.
- **Communities Integration:** Seamless greeting via `message:community_chat_joined`.

## Running the Offline Simulation Test

No Telegram Bot token or network needed:

```bash
node test-simulation.mjs
```

## Running Live with Telegram

1. Copy `.env.example` to `.env` and configure your `BOT_TOKEN`:
   ```bash
   cp .env.example .env
   ```
2. Start the bot:
   ```bash
   npm start
   ```
