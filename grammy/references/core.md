# grammY Core Architecture Reference

> **Verified Version:** grammY `v1.46.0` (Bot API 10.0–10.3 support)  
> **Source:** `https://grammy.dev/guide/basics`, `https://grammy.dev/guide/context`, `https://grammy.dev/guide/middleware`, `https://grammy.dev/guide/filter-queries`

---

## Table of Contents
- [1. Bot Instantiation & Configuration](#1-bot-instantiation--configuration)
- [2. Context Object (`ctx`)](#2-context-object-ctx)
- [3. Context Flavors & Types](#3-context-flavors--types)
- [4. Middleware Architecture](#4-middleware-architecture)
- [5. Filter Queries & Type Narrowing](#5-filter-queries--type-narrowing)
- [6. Sending Messages & Reply Parameters](#6-sending-messages--reply-parameters)
- [7. File Handling with `InputFile`](#7-file-handling-with-inputfile)
- [8. Text Formatting & Parse Modes](#8-text-formatting--parse-modes)

---

## 1. Bot Instantiation & Configuration

The `Bot` class is the primary entry point for any grammY application.

```typescript
import { Bot } from "grammy";

// Standard initialization with bot token
const bot = new Bot("BOT_TOKEN");

// Initialization with configuration options
const botWithOptions = new Bot("BOT_TOKEN", {
  client: {
    // Custom Bot API server (e.g. local Bot API server)
    apiRoot: "https://api.telegram.org",
    // Set custom fetch implementation or agent
    buildEndpoint: (root, token, method) => `${root}/bot${token}/${method}`,
    // Performance optimization for webhook replies
    canUseWebhookReply: (method) => method === "sendChatAction",
    // Timeouts and network settings
    timeoutSeconds: 30,
  },
  // Custom context constructor (rarely needed)
  ContextConstructor: CustomContextClass,
});
```

---

## 2. Context Object (`ctx`)

Every middleware receives a `Context` instance (`ctx`) containing the current update and shortcut methods for the Telegram Bot API.

### Core Properties
- `ctx.update`: The raw `Update` object received from Telegram.
- `ctx.update.update_id`: Unique identifier for the update.
- `ctx.api`: Instance of `Api` class configured with the bot token.
- `ctx.me`: Bot information (populated upon bot start or first call).

### Update Shortcuts (Nullable depending on update type)
- `ctx.message`: Present on `message` and `channel_post` updates.
- `ctx.editedMessage`: Present on `edited_message` updates.
- `ctx.callbackQuery`: Present on `callback_query` updates.
- `ctx.inlineQuery`: Present on `inline_query` updates.
- `ctx.msg`: Unified shortcut to `ctx.message ?? ctx.editedMessage ?? ctx.channelPost ?? ctx.editedChannelPost ?? ctx.callbackQuery?.message ?? ctx.guestMessage`.
- `ctx.chat`: Chat object where update originated (`ctx.message?.chat` or `ctx.callbackQuery?.message?.chat`).
- `ctx.from`: User object who performed the action (`ctx.message?.from` or `ctx.callbackQuery?.from`).
- `ctx.chatId`: Identifier of the chat (`ctx.chat?.id`).
- `ctx.senderId`: Identifier of the user (`ctx.from?.id`).

### Guest Message Properties (Bot API 10.0+)
- `ctx.msg.guest_query_id`: Unique string identifier when replying to guest queries.
- `ctx.msg.guest_bot_caller_user`: `User` object of the user initiating the guest interaction.
- `ctx.msg.guest_bot_caller_chat`: `Chat` object representing where the guest interaction took place.

### Context Methods
- `ctx.reply(text, options)`: Sends text message to current chat (shortcut for `ctx.api.sendMessage(ctx.chat.id, text, options)`).
- `ctx.replyWithPhoto(photo, options)`: Sends photo to current chat (`ctx.api.sendPhoto`).
- `ctx.replyWithDocument(doc, options)`: Sends document to current chat (`ctx.api.sendDocument`).
- `ctx.replyWithAudio(audio, options)`: Sends audio file to current chat (`ctx.api.sendAudio`).
- `ctx.replyWithVideo(video, options)`: Sends video file to current chat (`ctx.api.sendVideo`).
- `ctx.replyWithVoice(voice, options)`: Sends voice message to current chat (`ctx.api.sendVoice`).
- `ctx.replyWithChatAction(action)`: Sends typing or media upload status (`ctx.api.sendChatAction`).
- `ctx.answerCallbackQuery(options)`: Responds to an incoming callback query.
- `ctx.answerGuestQuery(result)`: Responds to an incoming guest query (Bot API 10.0+).
- `ctx.editMessageText(text, options)`: Edits the text of the message associated with `ctx`.
- `ctx.editEphemeralMessageText(text, options)`: Edits the text of an ephemeral message (Bot API 10.2+).
- `ctx.deleteMessage()`: Deletes the message associated with `ctx`.

> [!NOTE]
> **grammY 2.0 Shortcuts:** In grammY 2.0 (`http://v2.grammy.dev`), context sending shortcuts use `ctx.send*` (e.g. `ctx.send(text)`, `ctx.sendPhoto(photo)`, `ctx.sendVideo(video)`, `ctx.sendRichMessage(rich)`). Both `ctx.reply*` and `ctx.send*` are fully documented across this skill. See [`v2-migration.md`](v2-migration.md) for full details.

---

## 3. Context Flavors & Types

grammY allows extending the `Context` type using TypeScript intersection types (Additive Flavors) or generic types (Transformative Flavors).

### Additive Flavor Pattern
Used when plugins add new properties to `ctx`:

```typescript
import { Context, SessionFlavor } from "grammy";
import { ConversationFlavor } from "@grammyjs/conversations";

interface SessionData {
  counter: number;
}

// Combine base Context with plugin flavors
export type MyContext = Context & SessionFlavor<SessionData> & ConversationFlavor;

// Pass custom context type to Bot constructor
const bot = new Bot<MyContext>("BOT_TOKEN");
```

### Transformative Flavor Pattern
Used when plugins modify existing properties or methods of `Context` (e.g., `@grammyjs/hydrate`):

```typescript
import { Context } from "grammy";
import { HydrateFlavor } from "@grammyjs/hydrate";

// Transform Context with HydrateFlavor
export type MyContext = HydrateFlavor<Context>;

const bot = new Bot<MyContext>("BOT_TOKEN");
```

---

## 4. Middleware Architecture

grammY middleware uses the Onion Model (similar to Koa). A middleware is either a function `(ctx, next) => Promise<void> | void` or an object with a `middleware()` method.

### Execution Flow
```typescript
bot.use(async (ctx, next) => {
  const start = Date.now();
  console.log("Before downstream middleware");
  
  // Hand over control to downstream middleware
  await next();
  
  console.log(`After downstream middleware. Took ${Date.now() - start}ms`);
});
```

### Composer Class
`Composer` is used to organize handlers into modular trees before attaching to `bot`:

```typescript
import { Composer } from "grammy";

const feature = new Composer<MyContext>();

feature.command("start", async (ctx) => {
  await ctx.reply("Welcome!");
});

feature.on("message:text", async (ctx) => {
  await ctx.reply(`Echo: ${ctx.msg.text}`);
});

// Mount composer onto bot
bot.use(feature);
```

### Branching & Chaining
- `composer.filter(predicate, ...middleware)`: Executes middleware only if `predicate(ctx)` returns `true` or a truthy value.
- `composer.drop(predicate, ...middleware)`: Opposite of filter; runs only if predicate is falsy.
- `composer.chatType("private" | "group" | "supergroup" | "channel", ...middleware)`: Branches by chat type.

---

## 5. Filter Queries & Type Narrowing

Filter queries allow matching specific update shapes declaratively via `bot.on()`.

### Query Syntax Levels
- **L1 (Update Type):** `"message"`, `"edited_message"`, `"callback_query"`, `"inline_query"`, `"guest_message"`, etc.
- **L2 (Message Subtype):** `":text"`, `":photo"`, `":document"`, `":location"`, `":contact"`, `":voice"`, `":video"`, etc.
- **L3 (Entity / Modifier):** `"::url"`, `"::mention"`, `"::bot_command"`, `"::email"`, etc.

### Combining Filters
Pass an array of queries to match ANY of the conditions (logical OR):

```typescript
// 1. Matches incoming text messages OR incoming photo captions
bot.on(["message:text", "message:photo"], async (ctx) => {
  const textOrCaption = ctx.msg.text ?? ctx.msg.caption;
  await ctx.reply(`Received content: ${textOrCaption}`);
});

// 2. Matches guest messages in chats where bot is not a member (Bot API 10.0+)
bot.on("guest_message:text", async (ctx) => {
  await ctx.answerGuestQuery({
    type: "article",
    id: "reply_1",
    title: "Guest Response",
    input_message_content: { message_text: "Replying to guest prompt!" },
  });
});
```

### Type Narrowing Guarantees
Inside `bot.on("message:text", (ctx) => ...)`:
- `ctx.message` is guaranteed to be defined (`NonNullable`).
- `ctx.msg.text` is guaranteed to be `string` (not `undefined`).

---

## 6. Sending Messages & Reply Parameters

Modern grammY uses `reply_parameters` for quoting / replying to existing messages (replaces legacy `reply_to_message_id`).

```typescript
// 1. Standard text reply
await ctx.reply("Simple reply");

// 2. Replying with HTML formatting
await ctx.reply("<b>Status:</b> 🟢 <i>Online</i>", {
  parse_mode: "HTML",
});

// 3. Replying to a specific message with parameters (modern quote)
await ctx.reply("Quoting your message", {
  reply_parameters: {
    message_id: ctx.msg.message_id,
    allow_sending_without_reply: true,
    quote: "custom quoted snippet",
  },
});

// 4. Direct API call via bot.api
await bot.api.sendMessage(chatId, "Direct notification", {
  parse_mode: "HTML",
  link_preview_options: {
    is_disabled: true,
  },
});
```

### Ephemeral Messages Architecture

Ephemeral messages are temporary messages visible only to a specific target user and the bot (e.g. during Mini App interactions or user-specific group prompts).

- **Creation:** Telegram does not provide a standalone `sendEphemeralMessage` method; ephemeral messages are created via interactive flows, Mini App parameters, or `ephemeral_message_parameters`.
- **Identification:** Stored on `Message` objects under `message.ephemeral_message_id`.
- **Replying:** Pass `ephemeral_message_id` inside `ReplyParameters` (`reply_parameters: { ephemeral_message_id: ... }`).
- **Editing & Deletion:** Telegram provides dedicated API methods to manipulate ephemeral messages:

```typescript
// 1. Edit ephemeral message text
await ctx.api.editEphemeralMessageText(chatId, ephemeralMessageId, "<b>Updated private notice</b>", {
  parse_mode: "HTML",
});

// 2. Edit ephemeral message inline keyboard
await ctx.api.editEphemeralMessageReplyMarkup(chatId, ephemeralMessageId, {
  reply_markup: new InlineKeyboard().text("Done", "done"),
});

// 3. Delete ephemeral message
await ctx.api.deleteEphemeralMessage(chatId, ephemeralMessageId);
```

---

## 7. File Handling with `InputFile`

Files can be sent using the `InputFile` class from `grammy`.

```typescript
import { InputFile } from "grammy";
import fs from "node:fs";

// 1. From local file path
const fileFromPath = new InputFile("/path/to/image.png");
await ctx.replyWithPhoto(fileFromPath);

// 2. From URL
const fileFromUrl = new InputFile({
  url: "https://grammy.dev/images/Y.svg",
});
await ctx.replyWithPhoto(fileFromUrl);

// 3. From Buffer / Uint8Array (in-memory)
const buffer = Buffer.from("Hello world", "utf-8");
const fileFromBuffer = new InputFile(buffer, "hello.txt");
await ctx.replyWithDocument(fileFromBuffer);

// 4. From Node / Web ReadableStream
const stream = fs.createReadStream("/path/to/archive.zip");
const fileFromStream = new InputFile(stream, "archive.zip");
await ctx.replyWithDocument(fileFromStream);
```

---

## 8. Text Formatting & Parse Modes

Supported parse modes: `"HTML"` and `"MarkdownV2"`.

### HTML Formatting (Recommended for stability)
```typescript
await ctx.reply(
  `<b>Bold</b>, <i>Italic</i>, <u>Underline</u>, <s>Strikethrough</s>\n` +
  `<tg-spoiler>Spoiler</tg-spoiler>\n` +
  `<a href="https://grammy.dev">Link</a>\n` +
  `<code>inline code</code>\n` +
  `<pre><code class="language-typescript">const x = 1;</code></pre>`,
  { parse_mode: "HTML" }
);
```

### MarkdownV2 Formatting
All characters `_`, `*`, `[`, `]`, `(`, `)`, `~`, `` ` ``, `>`, `#`, `+`, `-`, `=`, `|`, `{`, `}`, `.`, `!` must be escaped with `\` if not part of syntax.

```typescript
await ctx.reply(
  "*Bold* and _italic_ and [link](https://grammy.dev)",
  { parse_mode: "MarkdownV2" }
);
```
