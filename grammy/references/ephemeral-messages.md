# grammY Ephemeral & Invisible Messages Reference (Telegram Bot API 10.3 / Communities & Groups)

> **Verified Version:** grammY `v1.46.0` (with `@grammyjs/types` `v5.0.0`)  
> **Bot API Version:** Telegram Bot API `10.3` (July 2026 update)  
> **Primary Sources:**  
> - Blog Announcement: `https://telegram.org/blog/communities-editor-invisible-messages`  
> - Bot Features: `https://core.telegram.org/bots/features#ephemeral-messages`  
> - Bot API Specs: `https://core.telegram.org/bots/api#ephemeralmessageparameters`, `https://core.telegram.org/bots/api#deleteephemeralmessage`, `https://core.telegram.org/bots/api#editephemeralmessagetext`

---

## Table of Contents
- [1. Architectural Overview: The Evolution of Ephemeral Interactions](#1-architectural-overview-the-evolution-of-ephemeral-interactions)
- [2. The `EphemeralMessageParameters` Interface](#2-the-ephemeralmessageparameters-interface)
- [3. Sending Ephemeral Messages](#3-sending-ephemeral-messages)
  - [Ephemeral Text Messages (`sendMessage`)](#ephemeral-text-messages-sendmessage)
  - [Ephemeral Rich Messages (`sendRichMessage`)](#ephemeral-rich-messages-sendrichmessage)
  - [Ephemeral Media (Photos, Documents, Voice, Video)](#ephemeral-media-photos-documents-voice-video)
- [4. Private Overlays via `replace_callback_query_message`](#4-private-overlays-via-replace_callback_query_message)
- [5. Modifying and Deleting Ephemeral Messages](#5-modifying-and-deleting-ephemeral-messages)
  - [`editEphemeralMessageText`](#editephemeralmessagetext)
  - [`editEphemeralMessageCaption` & `editEphemeralMessageMedia`](#editephemeralmessagecaption--editephemeralmessagemedia)
  - [`deleteEphemeralMessage`](#deleteephemeralmessage)
- [6. Two-Way Privacy with Ephemeral Commands (`is_ephemeral`)](#6-two-way-privacy-with-ephemeral-commands-is_ephemeral)
- [7. Telegram Communities & Welcome Messages](#7-telegram-communities--welcome-messages)
- [8. grammY Context Flavor: `EphemeralFlavor`](#8-grammy-context-flavor-ephemeralflavor)
- [9. Complete Production Bot Recipe](#9-complete-production-bot-recipe)

---

## 1. Architectural Overview: The Evolution of Ephemeral Interactions

Prior to Bot API 10.3, bots communicating in group chats faced a major dilemma: either spam the entire group with private responses, or rely on Guest Mode (`ctx.answerGuestQuery()`), which only worked when a bot was tagged externally as a non-member.

The **July 2026 Telegram Update** introduced **Ephemeral Messages in Groups** and **Two-Way Invisible Commands**:

| Feature | Guest Mode (Bot API 10.0) | Ephemeral Messages (Bot API 10.3) |
| :--- | :--- | :--- |
| **Bot Membership** | Bot is **NOT** a member of the chat. | Bot **IS** a member or admin in the group. |
| **Trigger Mechanism** | User tags bot via `@username query`. | Regular command, button click, or event. |
| **Update Type** | `update.guest_message` | Standard `message` or `callback_query`. |
| **Response Method** | `ctx.answerGuestQuery(...)` | Standard `send*` with `ephemeral_message_parameters`. |
| **Visibility Scope** | Injected message into chat. | **Strictly visible only to target user and bot.** |
| **Two-Way Privacy** | User's mention is visible to everyone. | User's `/command` is **completely invisible** to group (`is_ephemeral: true`). |
| **Interactive Overlays** | Not supported. | Supported via `replace_callback_query_message: true`. |
| **Editing / Deletion** | Standard message edits if permitted. | Dedicated `editEphemeralMessage*` and `deleteEphemeralMessage`. |

---

## 2. The `EphemeralMessageParameters` Interface

All standard sending methods in Telegram Bot API 10.3 accept the `ephemeral_message_parameters` field:

```typescript
export interface EphemeralMessageParameters {
  /**
   * Identifier of the target user who will exclusively receive and see the message.
   * Note: Delivery is best-effort and not guaranteed if the user is offline.
   */
  receiver_user_id: number;

  /**
   * Optional identifier of the callback query which triggered this ephemeral message.
   */
  callback_query_id?: string;

  /**
   * Pass true if the ephemeral message must be shown as an in-place private overlay
   * replacing the original message for this user only.
   * 
   * CRITICAL RULE: Must be false for callback queries originating from ephemeral messages.
   * Ephemeral messages must be updated using regular editEphemeralMessage* methods.
   */
  replace_callback_query_message?: boolean;
}
```

---

## 3. Sending Ephemeral Messages

### Ephemeral Text Messages (`sendMessage`)

To send a text message visible only to the interacting user:

```typescript
import { Bot, InlineKeyboard } from "grammy";

const bot = new Bot(process.env.BOT_TOKEN ?? "");

bot.command("profile", async (ctx) => {
  if (!ctx.chat || ctx.chat.type === "private") {
    return ctx.reply("This command is tailored for group chats!");
  }

  const userId = ctx.from.id;

  // Send an ephemeral message visible ONLY to the caller
  await ctx.api.sendMessage(
    ctx.chat.id,
    `🔒 <b>Private Profile Overview</b>\n\n` +
      `• User: ${ctx.from.first_name}\n` +
      `• ID: <code>${userId}</code>\n` +
      `• Status: Verified Member\n\n` +
      `<i>This message is invisible to everyone else in this group.</i>`,
    {
      parse_mode: "HTML",
      ephemeral_message_parameters: {
        receiver_user_id: userId,
      },
      reply_markup: new InlineKeyboard().text("Close", "dismiss_ephemeral"),
    }
  );
});
```

### Ephemeral Rich Messages (`sendRichMessage`)

Combine structured Bot API 10.1–10.3 Rich Blocks (expandable quotes, compact tables, inline buttons) with Ephemeral privacy:

```typescript
bot.command("stats", async (ctx) => {
  const userId = ctx.from.id;

  await ctx.api.raw.sendRichMessage({
    chat_id: ctx.chat.id,
    rich_message: {
      html: `<b>📊 Personal Performance Summary</b>\n` +
            `<pre>\n` +
            `Metric       | Value\n` +
            `-------------+------\n` +
            `Rank         | #3\n` +
            `Points       | 1,420\n` +
            `Reputation   | 99.4%\n` +
            `</pre>\n` +
            `<tg-button-row>` +
            `<tg-button data="refresh_stats">🔄 Refresh</tg-button>` +
            `</tg-button-row>`,
    },
    ephemeral_message_parameters: {
      receiver_user_id: userId,
    },
  });
});
```

### Ephemeral Media (Photos, Documents, Voice, Video)

All media sending methods accept `ephemeral_message_parameters`:

```typescript
// Send a private report document in a public group
await ctx.api.sendDocument(
  ctx.chat.id,
  new InputFile("./reports/monthly_confidential.pdf"),
  {
    caption: "📄 <i>Here is your requested confidential statement.</i>",
    parse_mode: "HTML",
    ephemeral_message_parameters: {
      receiver_user_id: ctx.from.id,
    },
  }
);
```

Supported media methods:
`sendPhoto`, `sendAnimation`, `sendAudio`, `sendDocument`, `sendLivePhoto`, `sendSticker`, `sendVideo`, `sendVideoNote`, `sendVoice`, `sendContact`, `sendLocation`, `sendVenue`.

---

## 4. Private Overlays via `replace_callback_query_message`

A powerful feature of Bot API 10.3 is the ability to create **Private Overlays**.

When a bot posts a public message with an inline button (e.g. `[ View My Balance ]`), multiple users might tap it. If you edit the message directly, everyone sees the last clicker's data.

With `replace_callback_query_message: true`, Telegram renders an ephemeral overlay **in place of the original message for that user only**, leaving the public message untouched for everyone else!

```typescript
import { Bot, InlineKeyboard } from "grammy";

const bot = new Bot(process.env.BOT_TOKEN ?? "");

// 1. Post a public group card
bot.command("hub", async (ctx) => {
  const keyboard = new InlineKeyboard()
    .text("View My Balance", "open_balance_overlay")
    .text("Help", "open_help_overlay");

  await ctx.reply("🌐 <b>Community Hub</b>\nTap below to check your details privately:", {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
});

// 2. Handle button click with an Ephemeral In-Place Overlay
bot.callbackQuery("open_balance_overlay", async (ctx) => {
  const userId = ctx.from.id;
  const queryId = ctx.callbackQuery.id;

  // Acknowledge query immediately
  await ctx.answerCallbackQuery();

  const overlayKeyboard = new InlineKeyboard()
    .text("Transfer", "act_transfer")
    .text("Statement", "act_statement");

  await ctx.api.sendMessage(
    ctx.chat.id,
    `💰 <b>Your Private Balance Card</b>\n\n` +
      `• Available: $450.00 USD\n` +
      `• Credits: 120 Tokens\n\n` +
      `<i>This view replaces the hub for you only. Other group members still see the main hub.</i>`,
    {
      parse_mode: "HTML",
      ephemeral_message_parameters: {
        receiver_user_id: userId,
        callback_query_id: queryId,
        replace_callback_query_message: true, // In-place ephemeral replacement
      },
      reply_markup: overlayKeyboard,
    }
  );
});
```

---

## 5. Modifying and Deleting Ephemeral Messages

Ephemeral messages exist within a user-specific ephemeral scope. They cannot be edited with standard `ctx.api.editMessageText` (which operates on public message IDs). Instead, Telegram provides dedicated ephemeral mutation methods.

### `editEphemeralMessageText`

```typescript
await ctx.api.raw.editEphemeralMessageText({
  chat_id: ctx.chat.id,
  receiver_user_id: ctx.from.id,
  ephemeral_message_id: ephemeralMessageId,
  text: "🔄 <b>Updating your progress...</b> (Step 2 of 3)",
  parse_mode: "HTML",
  reply_markup: new InlineKeyboard().text("Cancel", "cancel_action"),
});
```

> [!NOTE]
> `editEphemeralMessageText` supports either `text` (HTML/MarkdownV2) or `rich_message` (`InputRichMessage`).

### `editEphemeralMessageCaption` & `editEphemeralMessageMedia`

```typescript
// Edit caption
await ctx.api.raw.editEphemeralMessageCaption({
  chat_id: ctx.chat.id,
  receiver_user_id: ctx.from.id,
  ephemeral_message_id: ephemeralMessageId,
  caption: "New private caption",
  show_caption_above_media: true,
});

// Replace media
await ctx.api.raw.editEphemeralMessageMedia({
  chat_id: ctx.chat.id,
  receiver_user_id: ctx.from.id,
  ephemeral_message_id: ephemeralMessageId,
  media: {
    type: "photo",
    media: "https://example.com/updated_chart.png",
    caption: "Updated analytics",
  },
});
```

### `deleteEphemeralMessage`

Unlike public group messages where deletion requires admin privileges (`can_delete_messages`), bots can always delete their own ephemeral messages at any time:

```typescript
bot.callbackQuery("dismiss_ephemeral", async (ctx) => {
  await ctx.answerCallbackQuery({ text: "Closed" });

  const ephemeralMessageId = ctx.callbackQuery.message?.message_id;
  if (!ephemeralMessageId) return;

  await ctx.api.raw.deleteEphemeralMessage({
    chat_id: ctx.chat.id,
    receiver_user_id: ctx.from.id,
    ephemeral_message_id: ephemeralMessageId,
  });
});
```

---

## 6. Two-Way Privacy with Ephemeral Commands (`is_ephemeral`)

In Telegram Bot API 10.3, bot commands support two-way privacy via the `is_ephemeral` flag in `BotCommand`.

When a command is marked `is_ephemeral: true`:
1. **Stealth Invocation:** The user's typed command message (e.g. `/secret`) is **completely invisible** to other group members and other bots.
2. **Client Distinction:** Telegram clients render the command in the bot menu with a distinctive shield / whisper icon.
3. **Seamless Response:** The bot responds with an ephemeral message, achieving end-to-end discrete interaction in crowded channels and supergroups.

### Registering Ephemeral Commands:

```typescript
import { Bot } from "grammy";

const bot = new Bot(process.env.BOT_TOKEN ?? "");

async function registerCommands() {
  await bot.api.setMyCommands(
    [
      {
        command: "help",
        description: "Public bot instructions",
      },
      {
        command: "mywallet",
        description: "View confidential balance (Private)",
        is_ephemeral: true, // Marks command as invisible to other members
      },
      {
        command: "report",
        description: "Discreetly flag content to moderators",
        is_ephemeral: true,
      },
    ],
    {
      scope: { type: "all_group_chats" },
    }
  );
  console.log("Registered commands with ephemeral support.");
}
```

---

## 7. Telegram Communities & Welcome Messages

Telegram Communities allow linking multiple channels, groups, and bots into unified networks.

### 1. The `community_chat_joined` Service Update
When a user hops between chats within a Community, Telegram emits a service message:

```typescript
bot.on("message:community_chat_joined", async (ctx) => {
  const newUser = ctx.from;
  const chatTitle = ctx.chat.title;

  // Send an ephemeral welcome message so existing chatter isn't interrupted
  await ctx.api.sendMessage(
    ctx.chat.id,
    `👋 <i>Welcome ${newUser.first_name} to <b>${chatTitle}</b>!</i>\n\n` +
      `Check out our community guidelines below before chatting.`,
    {
      parse_mode: "HTML",
      ephemeral_message_parameters: {
        receiver_user_id: newUser.id,
      },
      reply_markup: new InlineKeyboard()
        .url("Community Directory", "https://t.me/example_community")
        .row()
        .text("Acknowledge Rules", "ack_rules"),
    }
  );
});
```

### 2. Admin Right: `can_send_welcome_messages`
Bot API 10.3 adds `can_send_welcome_messages` to `ChatAdministratorRights` and `ChatMemberAdministrator`. When promoting a bot in supergroups or communities:
```typescript
await ctx.api.promoteChatMember(ctx.chat.id, botUserId, {
  can_send_welcome_messages: true,
  can_manage_chat: true,
});
```

---

## 8. grammY Context Flavor: `EphemeralFlavor`

To eliminate repetitive parameter boilerplate, define a reusable grammY context flavor and middleware:

```typescript
import { Context, Middleware, InlineKeyboard } from "grammy";

export interface EphemeralFlavor {
  replyEphemeral: (
    text: string,
    options?: {
      parse_mode?: "HTML" | "MarkdownV2";
      reply_markup?: InlineKeyboard;
    }
  ) => Promise<any>;

  replaceWithEphemeral: (
    text: string,
    options?: {
      parse_mode?: "HTML" | "MarkdownV2";
      reply_markup?: InlineKeyboard;
    }
  ) => Promise<any>;

  deleteEphemeral: (ephemeralMessageId: number) => Promise<boolean>;
}

export type EphemeralContext = Context & EphemeralFlavor;

export const ephemeralMiddleware: Middleware<EphemeralContext> = async (ctx, next) => {
  ctx.replyEphemeral = async (text, options = {}) => {
    if (!ctx.chat || !ctx.from) {
      throw new Error("Cannot send ephemeral message outside of an identifiable chat & user context.");
    }

    return ctx.api.sendMessage(ctx.chat.id, text, {
      parse_mode: options.parse_mode ?? "HTML",
      reply_markup: options.reply_markup,
      ephemeral_message_parameters: {
        receiver_user_id: ctx.from.id,
      },
    });
  };

  ctx.replaceWithEphemeral = async (text, options = {}) => {
    if (!ctx.chat || !ctx.from || !ctx.callbackQuery) {
      throw new Error("replaceWithEphemeral requires an active callbackQuery.");
    }

    return ctx.api.sendMessage(ctx.chat.id, text, {
      parse_mode: options.parse_mode ?? "HTML",
      reply_markup: options.reply_markup,
      ephemeral_message_parameters: {
        receiver_user_id: ctx.from.id,
        callback_query_id: ctx.callbackQuery.id,
        replace_callback_query_message: true,
      },
    });
  };

  ctx.deleteEphemeral = async (ephemeralMessageId: number) => {
    if (!ctx.chat || !ctx.from) return false;
    return ctx.api.raw.deleteEphemeralMessage({
      chat_id: ctx.chat.id,
      receiver_user_id: ctx.from.id,
      ephemeral_message_id: ephemeralMessageId,
    });
  };

  await next();
};
```

---

## 9. Complete Production Bot Recipe

```typescript
import { Bot, InlineKeyboard } from "grammy";
import { run, sequentialize } from "@grammyjs/runner";
import {
  EphemeralContext,
  ephemeralMiddleware,
} from "./ephemeral-middleware";

const bot = new Bot<EphemeralContext>(process.env.BOT_TOKEN ?? "");

// 1. Sequentialize per user / chat to prevent session race conditions
bot.use(
  sequentialize(
    (ctx) => ctx.chat?.id.toString() ?? ctx.from?.id.toString()
  )
);

// 2. Install ephemeral helpers
bot.use(ephemeralMiddleware);

// 3. Two-Way Invisible Command: /secret_status
bot.command("secret_status", async (ctx) => {
  // If registered with is_ephemeral: true, user's /secret_status is invisible to group
  await ctx.replyEphemeral(
    `🕵️ <b>Private Inspection Report</b>\n\n` +
      `• User Level: VIP\n` +
      `• Token Expiry: 14h 22m\n` +
      `• Session Security: TLS 1.3 Verified\n\n` +
      `<i>Tap dismiss to clean up this view.</i>`,
    {
      reply_markup: new InlineKeyboard().text("Dismiss", "dismiss_secret"),
    }
  );
});

// 4. Dismiss Ephemeral Message
bot.callbackQuery("dismiss_secret", async (ctx) => {
  await ctx.answerCallbackQuery({ text: "Dismissed" });
  if (ctx.callbackQuery.message?.message_id) {
    await ctx.deleteEphemeral(ctx.callbackQuery.message.message_id);
  }
});

// 5. In-Place Ephemeral Overlay on Public Announcement
bot.command("raffle", async (ctx) => {
  const keyboard = new InlineKeyboard().text("Check My Ticket", "check_ticket");
  await ctx.reply(
    "🎟️ <b>Annual Community Raffle</b>\n\n" +
      "Tickets are live! Tap below to view your confidential ticket number.",
    {
      parse_mode: "HTML",
      reply_markup: keyboard,
    }
  );
});

bot.callbackQuery("check_ticket", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.replaceWithEphemeral(
    `🎫 <b>Your Confidential Raffle Entry</b>\n\n` +
      `• Ticket ID: <code>#TG-994821</code>\n` +
      `• Draw Time: Today at 20:00 UTC\n\n` +
      `<i>This card replaces the raffle banner for you only.</i>`,
    {
      reply_markup: new InlineKeyboard().text("Close Ticket", "dismiss_secret"),
    }
  );
});

// 6. Community Auto-Welcome
bot.on("message:community_chat_joined", async (ctx) => {
  await ctx.replyEphemeral(
    `🌟 <b>Welcome to the Community, ${ctx.from.first_name}!</b>\n` +
      `Feel free to explore our linked channels without noise.`
  );
});

// 7. Global Error Catching
bot.catch((err) => {
  console.error(`Error handling update ${err.ctx.update.update_id}:`, err.error);
});

const runner = run(bot);
console.log("Ephemeral-enabled bot started.");
