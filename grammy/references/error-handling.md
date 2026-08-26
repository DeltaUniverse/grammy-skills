# grammY Error Handling Reference

> **Verified Version:** grammY `v1.45.1`  
> **Source:** `https://grammy.dev/guide/errors`

---

## Table of Contents
- [1. Error Architecture Overview](#1-error-architecture-overview)
- [2. Global Error Handler (`bot.catch`)](#2-global-error-handler-botcatch)
- [3. The `BotError` Object](#3-the-boterror-object)
- [4. Differentiating Error Types](#4-differentiating-error-types)
- [5. Error Boundaries](#5-error-boundaries)
- [6. Error Handling Across Deployment Modes](#6-error-handling-across-deployment-modes)

---

## 1. Error Architecture Overview

grammY guarantees that errors thrown anywhere inside middleware (or plugins) do not crash the bot unhandled if a global error handler is installed. All errors thrown during update processing are wrapped in a `BotError` instance.

grammY classifies errors into three primary structures:

| Class | Thrown When | Key Properties |
| :--- | :--- | :--- |
| **`BotError`** | Any error occurs during middleware execution | `err.ctx`, `err.error` |
| **`GrammyError`** | Telegram Bot API returns `ok: false` (e.g. invalid token, user blocked bot) | `e.description`, `e.error_code`, `e.parameters` |
| **`HttpError`** | Network request to Telegram servers times out or fails at socket layer | `e.error` |

---

## 2. Global Error Handler (`bot.catch`)

Always install a global error handler via `bot.catch` to log errors, notify administrators, and prevent unhandled promise rejections.

```typescript
import { Bot, GrammyError, HttpError } from "grammy";

const bot = new Bot("BOT_TOKEN");

// Configure custom global error handler
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`[Bot Error] Exception while processing update ID: ${ctx.update.update_id}`);

  const e = err.error;
  if (e instanceof GrammyError) {
    console.error(`Telegram Bot API Error: [${e.error_code}] ${e.description}`);
    if (e.parameters?.retry_after) {
      console.warn(`Rate limit hit. Retry after ${e.parameters.retry_after} seconds.`);
    }
  } else if (e instanceof HttpError) {
    console.error("Network / HTTP Connection Error reaching Telegram servers:", e.error);
  } else {
    console.error("Unknown runtime / application error:", e);
  }
});
```

---

## 3. The `BotError` Object

The error argument passed to `bot.catch` or an error boundary handler is an instance of `BotError`.

```typescript
bot.catch((err) => {
  // 1. Access the context of the update that threw the error
  const failedUpdateId = err.ctx.update.update_id;
  const chatId = err.ctx.chat?.id;

  // 2. Access the underlying thrown exception
  const originalError = err.error;
  
  // 3. Stack trace of the BotError
  console.error(err.stack);
});
```

---

## 4. Differentiating Error Types

### 1. `GrammyError` (Bot API Error)
Occurs when the request reached Telegram, but Telegram rejected it with an error code (e.g. 400 Bad Request, 403 Forbidden, 429 Too Many Requests).

```typescript
if (e instanceof GrammyError) {
  switch (e.error_code) {
    case 400:
      // e.g. "Bad Request: message is not modified", "Bad Request: chat not found"
      break;
    case 403:
      // e.g. "Forbidden: bot was blocked by the user"
      break;
    case 429:
      // Too Many Requests: rate limit exceeded
      const waitSeconds = e.parameters.retry_after;
      break;
  }
}
```

### 2. `HttpError` (Network Transport Error)
Occurs when the outgoing fetch/HTTP request fails (DNS failure, network timeout, connection reset).

```typescript
if (e instanceof HttpError) {
  console.error("Fetch failed:", e.error);
}
```

---

## 5. Error Boundaries

Error boundaries isolate errors within specific middleware branches or plugins, preventing them from bubbling up to the global `bot.catch`.

```typescript
import { Composer } from "grammy";

const feature = new Composer();

// Define error boundary around this specific composer
const safeFeature = feature.errorBoundary((err) => {
  console.error("Error isolated in feature branch:", err.error);
  // Optionally inform the user
  err.ctx.reply("Something went wrong with this specific action. Please try again later.");
});

safeFeature.command("risky_task", async (ctx) => {
  throw new Error("Simulated failure");
});

bot.use(safeFeature);
```

---

## 6. Error Handling Across Deployment Modes

### In Long Polling (`bot.start()` or `@grammyjs/runner`)
- `bot.catch` handles all errors.
- Unhandled errors without `bot.catch` will cause `bot.start()` to stop polling and rethrow.

### In Webhooks (`webhookCallback`)
- If middleware throws, the error bubbles through `bot.catch` first.
- If `webhookCallback` times out before middleware completes (default 10s), it will throw an error to the host web framework (when using `"throw"` mode), triggering the web server's error logging.
