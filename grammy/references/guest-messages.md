# grammY Guest Messages & Bot API 10.x Guest Mode Reference

> **Verified Version:** grammY `v1.46.0` (with `@grammyjs/types` `v5.0.0`)  
> **Bot API Version:** Telegram Bot API `10.0` – `10.3`  
> **Source:** `https://core.telegram.org/bots/api#answerguestquery`, `https://core.telegram.org/bots/api#update`

---

## Table of Contents
- [1. Overview of Telegram Guest Mode](#1-overview-of-telegram-guest-mode)
- [2. Enabling Guest Mode in @BotFather](#2-enabling-guest-mode-in-botfather)
- [3. The `guest_message` Update Structure](#3-the-guest_message-update-structure)
- [4. Handling Guest Messages in grammY](#4-handling-guest-messages-in-grammy)
  - [Filter Queries](#filter-queries)
  - [Responding with `ctx.answerGuestQuery()`](#responding-with-ctxanswerguestquery)
  - [Raw API Method: `ctx.api.answerGuestQuery()`](#raw-api-method-ctxapianswerguestquery)
- [5. Answering with Rich Content & Keyboards](#5-answering-with-rich-content--keyboards)
- [6. Bot API 10.1–10.3 Rich Message & Ephemeral Integrations](#6-bot-api-101103-rich-message--ephemeral-integrations)
- [7. Complete Production Guest Bot Recipe](#7-complete-production-guest-bot-recipe)

---

## 1. Overview of Telegram Guest Mode

Introduced in **Telegram Bot API 10.0**, **Guest Mode** enables bots to interact directly inside chats (private chats, group chats, supergroups, channels) where the bot is **not an added member**.

### How It Works:
1. A user mentions the bot by `@username` in any group or private chat (e.g. `@MyHelperBot summarize this`).
2. Telegram forwards this single trigger as a `guest_message` update to the bot webhook or polling stream.
3. The bot processes the query and calls `answerGuestQuery` with an `InlineQueryResult` object (such as an article with formatted text and an inline keyboard).
4. Telegram injects the bot's response directly into the target chat without adding the bot as a member.

### Key Benefits:
- **Zero Group Clutter:** Bots do not need admin rights or standard membership.
- **Enhanced Privacy:** The bot only receives the explicit query message it was tagged in, not background chat history.
- **Ephemeral & Targeted:** Seamless user experience across groups and channels.

---

## 2. Enabling Guest Mode in @BotFather

To receive `guest_message` updates, you must configure your bot via `@BotFather`:

1. Open `@BotFather` in Telegram.
2. Send `/mybots` and select your bot.
3. Navigate to **Bot Settings** $\rightarrow$ **Guest Mode** (or command `/setguestchat`).
4. Enable Guest Chat / Queries.
5. In your bot info (`getMe`), `supports_guest_queries` will now return `true`.

---

## 3. The `guest_message` Update Structure

When Telegram receives a guest invocation, it delivers an `Update` where `update.guest_message` is populated:

```typescript
interface Update {
  update_id: number;
  guest_message?: Message;
  // ... other update fields
}
```

The `Message` object contains critical guest-specific context:
- `ctx.msg.guest_query_id`: Unique `string` identifier used to answer the query.
- `ctx.msg.guest_bot_caller_user`: `User` object of the person who initiated the guest query.
- `ctx.msg.guest_bot_caller_chat`: `Chat` object representing the chat where the query was triggered.
- `ctx.msg.text`: The text sent by the user (including `@botusername`).

---

## 4. Handling Guest Messages in grammY

grammY includes native first-class support for `guest_message` updates and the `answerGuestQuery` method.

### Filter Queries

Listen to guest updates using declarative grammY filter queries:

```typescript
import { Bot, Context } from "grammy";

const bot = new Bot(process.env.BOT_TOKEN ?? "");

// 1. Match all guest messages
bot.on("guest_message", async (ctx) => {
  const queryId = ctx.msg.guest_query_id;
  const caller = ctx.msg.guest_bot_caller_user;
  console.log(`Guest query from @${caller?.username} (ID: ${queryId})`);
});

// 2. Match only guest text messages (with automatic TypeScript string narrowing)
bot.on("guest_message:text", async (ctx) => {
  const text = ctx.msg.text; // string (guaranteed NonNullable)
  console.log(`Guest query text: ${text}`);
});

// 3. Match guest queries containing specific entities or commands
bot.on("guest_message::bot_command", async (ctx) => {
  // Triggered when a command syntax is invoked in guest mode
});
```

### Responding with `ctx.answerGuestQuery()`

Inside a `guest_message` handler, `ctx.answerGuestQuery()` automatically supplies the `ctx.msg.guest_query_id`:

```typescript
bot.on("guest_message:text", async (ctx) => {
  await ctx.answerGuestQuery({
    type: "article",
    id: `guest_res_${Date.now()}`,
    title: "AI Response",
    description: "Summary generated for the chat",
    input_message_content: {
      message_text: `<b>Guest Assistant Result:</b>\nProcessed query: <code>${ctx.msg.text}</code>`,
      parse_mode: "HTML",
    },
  });
});
```

### Raw API Method: `ctx.api.answerGuestQuery()`

You can also reply directly via `ctx.api` or `bot.api`:

```typescript
const result = await ctx.api.answerGuestQuery(guestQueryId, {
  type: "article",
  id: "article_1",
  title: "Direct Query Response",
  input_message_content: {
    message_text: "Replying via raw api method.",
    parse_mode: "HTML",
  },
});
```

---

## 5. Answering with Rich Content & Keyboards

You can attach inline keyboards and formatted content to guest responses:

```typescript
import { Bot, InlineKeyboard } from "grammy";

bot.on("guest_message:text", async (ctx) => {
  const keyboard = new InlineKeyboard()
    .url("Open Mini App", "https://t.me/MyHelperBot/app")
    .row()
    .url("Support Channel", "https://t.me/example");

  await ctx.answerGuestQuery({
    type: "article",
    id: `guest_${ctx.msg.message_id}`,
    title: "Quick Action Menu",
    input_message_content: {
      message_text: `<b>Interactive Guest Card</b>\nRequested by: <i>${ctx.msg.guest_bot_caller_user?.first_name}</i>`,
      parse_mode: "HTML",
    },
    reply_markup: keyboard,
  });
});
```

---

## 6. Bot API 10.1–10.3 Rich Message & Ephemeral Integrations

Telegram Bot API 10.1 – 10.3 introduced structured Rich Messages and Ephemeral messages that enhance both guest interactions and group responses:

### 1. Bot API 10.3 Ephemeral Parameters
Ephemeral messages are temporary messages visible only to the interacting user:
- Controlled via `EphemeralMessageParameters`.
- Can be modified via `ctx.api.editEphemeralMessageText()` and `ctx.api.deleteEphemeralMessage()`.

### 2. Bot API 10.3 Compact Tables
In Bot API 10.3, rich message tables support `is_compact: true` for denser mobile rendering:
```typescript
// ASCII fallback for standard messages or rich blocks
const compactTable = 
  `<pre>\n` +
  `Metric      | Value\n` +
  `------------+------\n` +
  `CPU Usage   | 18.4%\n` +
  `RAM Free    | 4.2GB\n` +
  `</pre>`;
```

---

## 7. Complete Production Guest Bot Recipe

```typescript
import { Bot, Context, InlineKeyboard } from "grammy";
import { run, sequentialize } from "@grammyjs/runner";

type MyContext = Context;

const bot = new Bot<MyContext>(process.env.BOT_TOKEN ?? "");

// Concurrency sequentializer per caller user ID
bot.use(sequentialize((ctx) => {
  return ctx.msg?.guest_bot_caller_user?.id.toString() 
    ?? ctx.chat?.id.toString() 
    ?? ctx.from?.id.toString();
}));

// Guest message handler
bot.on("guest_message:text", async (ctx) => {
  const caller = ctx.msg.guest_bot_caller_user;
  const callerName = caller?.first_name ?? "User";
  const userPrompt = ctx.msg.text.replace(/@\w+/g, "").trim();

  const keyboard = new InlineKeyboard()
    .url("View Details", "https://example.com/details");

  await ctx.answerGuestQuery({
    type: "article",
    id: `resp_${Date.now()}`,
    title: `Assistant Reply for ${callerName}`,
    description: `Processed: ${userPrompt.slice(0, 30)}...`,
    input_message_content: {
      message_text: `💡 <b>Guest Response</b>\n\n` +
                    `👤 <b>Caller:</b> ${callerName}\n` +
                    `💬 <b>Query:</b> <code>${userPrompt || "Hello"}</code>\n\n` +
                    `✨ <i>Processed instantly without adding bot to chat.</i>`,
      parse_mode: "HTML",
    },
    reply_markup: keyboard,
  });
});

// Standard chat handler
bot.command("start", async (ctx) => {
  await ctx.reply(
    "👋 <b>Welcome!</b>\n\n" +
    "This bot supports <b>Guest Mode (Bot API 10.x)</b>.\n" +
    "You can mention me in any chat: <code>@MyBotName your question</code> without adding me!",
    { parse_mode: "HTML" }
  );
});

// Global error boundary
bot.catch((err) => {
  console.error(`Error in update ${err.ctx.update.update_id}:`, err.error);
});

// Start bot
run(bot);
console.log("Guest Bot running with Telegram Bot API 10.3 / grammY v1.46.0");
```
