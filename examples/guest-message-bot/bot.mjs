#!/usr/bin/env node

/**
 * Simple Telegram Bot to test Guest Messages (Telegram Bot API 10.0-10.3)
 * Framework: grammY v1.46.0
 */

import { Bot, InlineKeyboard } from "grammy";
import { run, sequentialize } from "@grammyjs/runner";
import "dotenv/config";
import url from "node:url";

export function createBot(botToken, options = {}) {
  const bot = new Bot(botToken, options);

  // 1. Concurrency sequentializer: Group by guest caller or chat ID to prevent race conditions
  bot.use(
    sequentialize((ctx) => {
      return (
        ctx.msg?.guest_bot_caller_user?.id?.toString() ??
        ctx.chat?.id?.toString() ??
        ctx.from?.id?.toString()
      );
    })
  );

  // 2. /start command for standard direct chats
  bot.command("start", async (ctx) => {
    await ctx.reply(
      `👋 <b>Welcome to the Guest Message Test Bot!</b>\n\n` +
      `✨ <b>Guest Mode (Bot API 10.x):</b>\n` +
      `You can invoke this bot in <i>any group or private chat</i> where this bot is <b>not a member</b>.\n\n` +
      `<b>How to test:</b>\n` +
      `1. Open any group or chat.\n` +
      `2. Tag me: <code>@${ctx.me.username} ping</code>\n` +
      `3. I will reply instantly into that chat as a guest!`,
      { parse_mode: "HTML" }
    );
  });

  // 3. Guest message handler (matches when someone tags @botusername in non-member chats)
  bot.on("guest_message:text", async (ctx) => {
    const caller = ctx.msg.guest_bot_caller_user ?? ctx.from;
    const callerName = caller?.first_name ?? "User";
    const callerHandle = caller?.username ? `@${caller.username}` : callerName;
    const rawText = ctx.msg.text ?? "";
    const cleanPrompt = rawText.replace(/@\w+/g, "").trim() || "(empty prompt)";
    const queryId = ctx.msg.guest_query_id;

    console.log(`\n📩 [Guest Message Received]`);
    console.log(`   From: ${callerHandle} (ID: ${caller?.id})`);
    console.log(`   Query ID: ${queryId}`);
    console.log(`   Prompt: "${cleanPrompt}"`);

    // Interactive reply keyboard
    const keyboard = new InlineKeyboard()
      .url("🤖 Bot Profile", `https://t.me/${ctx.me.username}`)
      .url("📚 grammY Docs", "https://grammy.dev");

    // Reply directly to the guest query
    await ctx.answerGuestQuery({
      type: "article",
      id: `guest_reply_${Date.now()}`,
      title: `Reply to ${callerName}`,
      description: `Echo: ${cleanPrompt.slice(0, 40)}`,
      input_message_content: {
        message_text:
          `⚡ <b>Guest Bot Response</b>\n\n` +
          `👤 <b>Caller:</b> ${callerHandle}\n` +
          `💬 <b>Query:</b> <code>${cleanPrompt}</code>\n\n` +
          `<i>✅ Delivered via Telegram Bot API 10.3 & grammY v1.46.0 without group membership!</i>`,
        parse_mode: "HTML",
      },
      reply_markup: keyboard,
    });

    console.log(`   ✔ Responded to guest query successfully!`);
  });

  // 4. Global Error Catching
  bot.catch((err) => {
    console.error(`❌ Error processing update ${err.ctx.update.update_id}:`, err.error);
  });

  return bot;
}

// If run directly as entrypoint
const isMain = process.argv[1] && (
  import.meta.url === url.pathToFileURL(process.argv[1]).href ||
  process.argv[1].endsWith("bot.mjs")
);

if (isMain) {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    console.error("❌ Error: BOT_TOKEN environment variable is required!");
    console.error("👉 Copy .env.example to .env and set your token, or run 'npm test' for offline simulation.");
    process.exit(1);
  }

  const bot = createBot(token);
  
  console.log("🚀 Initializing Guest Message Test Bot...");
  await bot.init();
  console.log(`🤖 Logged in as @${bot.botInfo.username}`);
  console.log(`📡 Supports guest queries: ${bot.botInfo.supports_guest_queries ? "YES ✅" : "NO (enable via @BotFather /setguestchat) ⚠️"}`);
  console.log("⚡ Starting long polling with @grammyjs/runner...");

  const runner = run(bot);

  process.once("SIGINT", () => {
    console.log("\nStopping bot...");
    runner.stop();
  });
  process.once("SIGTERM", () => {
    console.log("\nStopping bot...");
    runner.stop();
  });
}
