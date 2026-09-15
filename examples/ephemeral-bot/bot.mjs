/**
 * grammY Telegram Bot: Ephemeral Messages & Private Overlays
 * Demonstrates Telegram Bot API 10.3 ephemeral message capabilities.
 */

import { Bot, InlineKeyboard } from "grammy";
import { run, sequentialize } from "@grammyjs/runner";
import dotenv from "dotenv";

dotenv.config();

/**
 * Factory function to create and configure the Bot instance.
 * @param {string} token
 * @param {import("grammy").BotConfig} [options]
 */
export function createBot(token, options = {}) {
  const bot = new Bot(token, options);

  // 1. Concurrency control: sequentialize per chat / user
  bot.use(
    sequentialize(
      (ctx) => ctx.chat?.id.toString() ?? ctx.from?.id.toString()
    )
  );

  // 2. Register ephemeral command handler
  // Note: /whisper should be registered with is_ephemeral: true so the user's prompt is invisible
  bot.command("whisper", async (ctx) => {
    if (!ctx.chat || !ctx.from) return;

    const keyboard = new InlineKeyboard()
      .text("🔄 Check Status", "check_ephemeral_status")
      .row()
      .text("✖ Dismiss", "dismiss_ephemeral");

    await ctx.api.sendMessage(
      ctx.chat.id,
      `🕵️ <b>Stealth Ephemeral Response</b>\n\n` +
        `• Caller: <b>${ctx.from.first_name}</b>\n` +
        `• User ID: <code>${ctx.from.id}</code>\n` +
        `• Security: <i>End-to-end discreet</i>\n\n` +
        `<i>This message is visible ONLY to you and the bot.</i>`,
      {
        parse_mode: "HTML",
        ephemeral_message_parameters: {
          receiver_user_id: ctx.from.id,
        },
        reply_markup: keyboard,
      }
    );
  });

  // 3. Edit ephemeral message in-place
  bot.callbackQuery("check_ephemeral_status", async (ctx) => {
    await ctx.answerCallbackQuery({ text: "Status refreshed" });
    const ephemeralMessageId = ctx.callbackQuery.message?.message_id;
    if (!ephemeralMessageId || !ctx.chat || !ctx.from) return;

    await ctx.api.raw.editEphemeralMessageText({
      chat_id: ctx.chat.id,
      receiver_user_id: ctx.from.id,
      ephemeral_message_id: ephemeralMessageId,
      text:
        `✅ <b>Status Updated</b>\n\n` +
        `• Timestamp: <code>${new Date().toISOString()}</code>\n` +
        `• All systems nominal.\n\n` +
        `<i>Still strictly private to you.</i>`,
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text("✖ Dismiss", "dismiss_ephemeral"),
    });
  });

  // 4. Delete ephemeral message
  bot.callbackQuery("dismiss_ephemeral", async (ctx) => {
    await ctx.answerCallbackQuery({ text: "Dismissed" });
    const ephemeralMessageId = ctx.callbackQuery.message?.message_id;
    if (!ephemeralMessageId || !ctx.chat || !ctx.from) return;

    await ctx.api.raw.deleteEphemeralMessage({
      chat_id: ctx.chat.id,
      receiver_user_id: ctx.from.id,
      ephemeral_message_id: ephemeralMessageId,
    });
  });

  // 5. Public hub with in-place private ephemeral overlay
  bot.command("hub", async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text("🔑 View Confidential Key", "view_key_overlay");

    await ctx.reply(
      `🌐 <b>Public Group Hub</b>\n\n` +
        `Anyone in this group can tap below to view their private credentials in-place without changing what others see.`,
      {
        parse_mode: "HTML",
        reply_markup: keyboard,
      }
    );
  });

  // 6. Handle button tap by replacing message with private ephemeral overlay
  bot.callbackQuery("view_key_overlay", async (ctx) => {
    await ctx.answerCallbackQuery();
    if (!ctx.chat || !ctx.from) return;

    await ctx.api.sendMessage(
      ctx.chat.id,
      `🔐 <b>Private Credentials Overlay</b>\n\n` +
        `• Access Key: <code>SK-${ctx.from.id}-88219</code>\n` +
        `• Permission: Moderator\n\n` +
        `<i>This view replaced the hub for YOU only. Other group members still see the public hub!</i>`,
      {
        parse_mode: "HTML",
        ephemeral_message_parameters: {
          receiver_user_id: ctx.from.id,
          callback_query_id: ctx.callbackQuery.id,
          replace_callback_query_message: true, // In-place ephemeral replacement
        },
        reply_markup: new InlineKeyboard().text("✖ Close Overlay", "dismiss_ephemeral"),
      }
    );
  });

  // 7. Community auto-welcome service message
  bot.on("message:community_chat_joined", async (ctx) => {
    const newUser = ctx.from;
    await ctx.api.sendMessage(
      ctx.chat.id,
      `👋 <i>Welcome ${newUser.first_name} to <b>${ctx.chat.title}</b>!</i>\n` +
        `Explore the community guidelines below:`,
      {
        parse_mode: "HTML",
        ephemeral_message_parameters: {
          receiver_user_id: newUser.id,
        },
        reply_markup: new InlineKeyboard().text("Acknowledge", "dismiss_ephemeral"),
      }
    );
  });

  // 8. Error boundary
  bot.catch((err) => {
    console.error(`[Error] Update ${err.ctx.update.update_id}:`, err.error);
  });

  return bot;
}

/**
 * Register commands with Telegram Bot API, marking ephemeral commands.
 * @param {Bot} bot
 */
export async function registerBotCommands(bot) {
  await bot.api.setMyCommands(
    [
      { command: "hub", description: "Open public community hub" },
      {
        command: "whisper",
        description: "Private status check (Two-way invisible)",
        is_ephemeral: true, // Highlights command in bot menu and hides prompt from others
      },
    ],
    {
      scope: { type: "all_group_chats" },
    }
  );
  console.log("✔ Registered group commands with ephemeral metadata.");
}

// Direct execution entrypoint
if (process.env.NODE_ENV !== "test" && process.argv[1]?.endsWith("bot.mjs")) {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    console.error("Please provide BOT_TOKEN in .env or environment.");
    process.exit(1);
  }

  const bot = createBot(token);
  registerBotCommands(bot).catch(console.error);

  console.log("Starting Ephemeral Bot with @grammyjs/runner...");
  const runner = run(bot);

  const stop = () => runner.isRunning() && runner.stop();
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}
