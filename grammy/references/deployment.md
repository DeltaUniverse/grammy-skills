# grammY Deployment & Concurrency Reference

> **Verified Version:** grammY `v1.45.1` (`@grammyjs/runner`, `webhookCallback`)  
> **Source:** `https://grammy.dev/guide/deployment-types`, `https://grammy.dev/plugins/runner`

---

## Table of Contents
- [1. Deployment Strategies: Polling vs Webhooks](#1-deployment-strategies-polling-vs-webhooks)
- [2. Long Polling (`bot.start`)](#2-long-polling-botstart)
- [3. Concurrent Long Polling with grammY runner](#3-concurrent-long-polling-with-grammy-runner)
- [4. Webhook Mode (`webhookCallback`)](#4-webhook-mode-webhookcallback)
- [5. Supported Webhook Framework Adapters](#5-supported-webhook-framework-adapters)
- [6. Webhook Security & Secret Tokens](#6-webhook-security--secret-tokens)
- [7. Webhook Timeouts & Race Condition Prevention](#7-webhook-timeouts--race-condition-prevention)
- [8. Graceful Shutdown Protocol](#8-graceful-shutdown-protocol)

---

## 1. Deployment Strategies: Polling vs Webhooks

| Feature | Long Polling | Webhooks |
| :--- | :--- | :--- |
| **How it works** | Bot pulls updates from Telegram | Telegram pushes updates to your public HTTPS endpoint |
| **Domain / SSL required?** | No | Yes (public valid HTTPS certificate required) |
| **Local / Dev environment** | Simple (`bot.start()`) | Requires tunnel (e.g. ngrok / cloudflared) |
| **Hosting types** | VPS, long-running servers, containers | Serverless functions, edge workers, VPS |
| **Cost / Resource idle** | Holds active connection | Scales to zero when idle |

---

## 2. Long Polling (`bot.start`)

For simple bots or local development, `bot.start()` polls Telegram sequentially.

```typescript
import { Bot } from "grammy";

const bot = new Bot("BOT_TOKEN");

// Basic polling
bot.start({
  // Drop pending updates on startup to prevent backlog spam
  drop_pending_updates: true,
  // Specify update types to receive (saves bandwidth)
  allowed_updates: ["message", "callback_query"],
  onStart: (botInfo) => {
    console.log(`Bot @${botInfo.username} started successfully via long polling.`);
  },
});
```

---

## 3. Concurrent Long Polling with grammY runner

Sequential polling processes one message at a time. For production high-traffic bots, use `@grammyjs/runner` to process updates concurrently while preserving sequential processing per chat.

```bash
npm install @grammyjs/runner
```

```typescript
import { Bot } from "grammy";
import { run, sequentialize } from "@grammyjs/runner";

const bot = new Bot("BOT_TOKEN");

// CRITICAL: Prevent session race conditions (WAR hazards) across concurrent updates
// Guarantees that updates for the same chat are processed sequentially
bot.use(
  sequentialize((ctx) => {
    const chat = ctx.chat?.id.toString();
    const user = ctx.from?.id.toString();
    return chat ?? user;
  })
);

// Install application middleware & handlers
bot.on("message", async (ctx) => {
  await ctx.reply("Processed concurrently!");
});

// Launch concurrent runner
const runner = run(bot, {
  runner: {
    fetch: {
      allowed_updates: ["message", "callback_query"],
      timeout: 30,
    },
  },
});
```

---

## 4. Webhook Mode (`webhookCallback`)

To use webhooks, pass the bot instance and framework adapter to `webhookCallback`.

### Express Example
```typescript
import express from "express";
import { Bot, webhookCallback } from "grammy";

const bot = new Bot("BOT_TOKEN");
const app = express();

app.use(express.json());

// Mount grammY webhook callback
app.use("/telegram-webhook", webhookCallback(bot, "express"));

app.listen(3000, async () => {
  console.log("Server listening on port 3000");
  
  // Set webhook endpoint with Telegram
  await bot.api.setWebhook("https://example.com/telegram-webhook", {
    drop_pending_updates: true,
    secret_token: process.env.WEBHOOK_SECRET,
  });
});
```

---

## 5. Supported Webhook Framework Adapters

`webhookCallback(bot, adapter)` supports the following adapter strings:

| Adapter | Runtime / Framework |
| :--- | :--- |
| `"express"` | Express, Google Cloud Functions |
| `"fastify"` | Fastify |
| `"hono"` | Hono |
| `"http"`, `"https"` | Node.js `http`/`https` native modules, Vercel Serverless |
| `"std/http"` | `Deno.serve`, `Fresh`, Vercel Edge Runtime, Supabase Functions |
| `"cloudflare"` | Cloudflare Workers (Legacy) |
| `"cloudflare-mod"` | Cloudflare Module Workers (ES Modules `export default { fetch }`) |
| `"bun"` | `Bun.serve` |
| `"oak"` | Deno Oak framework |
| `"koa"` | Koa |
| `"next-js"` | Next.js API Routes |
| `"aws-lambda"` | AWS Lambda Functions (callback style) |
| `"aws-lambda-async"`| AWS Lambda Functions (`async`/`await` handler) |
| `"azure"` | Azure Functions |
| `"sveltekit"` | SvelteKit |
| `"nhttp"` | NHttp |
| `"worktop"` | Worktop |

---

## 6. Webhook Security & Secret Tokens

Always configure `secret_token` when registering webhooks to ensure incoming requests originate from Telegram.

```typescript
const secretToken = process.env.WEBHOOK_SECRET ?? "random_secure_hex_string";

// 1. Register webhook with Telegram
await bot.api.setWebhook("https://example.com/webhook", {
  secret_token: secretToken,
});

// 2. Validate in webhookCallback
// grammY's webhookCallback validates X-Telegram-Bot-Api-Secret-Token automatically
// when secretToken is configured in webhookCallback options
app.use(
  "/webhook",
  webhookCallback(bot, "express", {
    secretToken: secretToken,
  })
);
```

---

## 7. Webhook Timeouts & Race Condition Prevention

Telegram expects webhook endpoints to respond within a few seconds.

### The Timeout Danger
If middleware takes too long (> 10 seconds), Telegram assumes delivery failed and retries the update. This leads to duplicate processing loops and spamming users.

### The Solution: Offload Long-Running Work
Keep middleware execution instantaneous (< 1s). Offload slow tasks (AI generation, video encoding, external syncs) to background job queues:

```typescript
bot.command("generate_report", async (ctx) => {
  // Acknowledge user immediately
  await ctx.reply("Generating your report. We'll send it here once ready...");
  
  // Push job to external queue (BullMQ, Redis, SQS, etc.)
  await reportQueue.add("generate", {
    chatId: ctx.chat.id,
    userId: ctx.from.id,
  });
  
  // Middleware finishes immediately, returning 200 OK to Telegram
});
```

---

## 8. Graceful Shutdown Protocol

Always handle process termination signals (`SIGINT`, `SIGTERM`) to stop runners cleanly and finish in-flight updates.

```typescript
const stopRunner = () => {
  if (runner.isRunning()) {
    console.log("Stopping bot runner gracefully...");
    runner.stop();
  }
};

process.once("SIGINT", stopRunner);
process.once("SIGTERM", stopRunner);
```
