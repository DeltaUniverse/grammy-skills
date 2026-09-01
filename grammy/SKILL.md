---
name: grammy
description: Comprehensive expert skill for building Telegram Bots using grammY (v1.46.0) with TypeScript/JavaScript. Covers core architecture, context flavors, sessions, multi-step conversations, interactive keyboards/menus, guest messages & Bot API 10.0–10.3 features, rich formatting (HTML, @grammyjs/format, @grammyjs/parse-mode, tables), error handling, runners, and multi-platform deployments (VPS, Edge, Serverless).
verified_version: 1.46.0
last_verified: 2026-08-29
---

# grammY Telegram Bot Development Skill

This skill guides AI coding agents in designing, building, and deploying robust Telegram bots using the **grammY** framework (`v1.46.0`).

---

## 1. Freshness Protocol & Version Guardrails

- **Current Stable Release:** `v1.46.0` (production default, npm: `grammy`, with Bot API 10.0–10.3 support).
- **Upcoming Major Release:** `v2.0.0-beta.x` (JSR: `@grammyjs/grammy`, `v2.grammy.dev`). Introduces deprecation of `ctx.reply*` $\rightarrow$ `ctx.send*`, polymorphic `SendData`, and transformative context flavors. See [`v2-migration.md`](references/v2-migration.md).
- **Core Principle:** Never write version-sensitive API calls or plugin configurations purely from memory. Consult the primary reference files in `grammy/references/` before implementing any feature.
- **Reference Metadata:** See `grammy/references/_meta.json` for verified documentation sources.

---

## 2. Lazy Senior Principles

1. **Type-First Context Modeling:** Always declare custom context types using additive or transformative flavors (`type MyContext = Context & SessionFlavor<SessionData> & ConversationFlavor`). Pass `MyContext` to `Bot`, `Composer`, and `Menu` generic parameters.
2. **Lean Modular Architecture:** Group related commands, keyboards, and listeners into modular composers (`src/features/` or `src/bot/features/`). Keep files lean—only create separate handlers, services, or keyboards when truly needed. Avoid premature over-engineering.
3. **Guest Mode & Bot API 10.x Readiness:** Handle guest invocations across non-member chats via `bot.on("guest_message")` and answer promptly using `ctx.answerGuestQuery(result)` (supplying `ctx.msg.guest_query_id`). Configure `supports_guest_queries` in BotFather.
4. **Strict Conversation Replay Discipline:** Inside `@grammyjs/conversations` builders:
   - Wrap ALL side effects (database writes, API queries, network calls) in `await conversation.external(async () => ...)`.
   - Never mutate outer-scope variables across wait points.
   - Use `await conversation.now()` and `await conversation.random()` to preserve deterministic replay.
5. **Guaranteed Sequentiality Under Concurrency:** When using `@grammyjs/runner`, always register `sequentialize((ctx) => ctx.msg?.guest_bot_caller_user?.id.toString() ?? ctx.chat?.id.toString() ?? ctx.from?.id.toString())` to prevent session race conditions and write-after-read (WAR) hazards.
6. **Differentiated Error Handling:** Always install a global `bot.catch` differentiating `GrammyError` (API errors), `HttpError` (network timeouts), and generic runtime exceptions.
7. **Rich Formatting & UI Interaction Discipline:**
   - Prefer `"HTML"` parse mode (`<b>`, `<i>`, `<code>`, `<a href="...">`, `<tg-spoiler>`, `<blockquote expandable>`) with HTML entity escaping, or `@grammyjs/format` for 100% type-safe templating.
   - Render tables using monospace ASCII `<pre>` code blocks or compact tables (`is_compact: true`).
   - For real-time progress / AI responses, send `ctx.replyWithChatAction("typing")` and throttle in-place edits (`ctx.api.editMessageText`) to ~1 second.
   - Encapsulate rich features in a `Composer<MyContext>` along with their `InlineKeyboard` layouts and `composer.callbackQuery()` listeners.
   - Always call `await ctx.answerCallbackQuery()` immediately in callback query listeners to clear the client loading spinner and prevent timeouts.
8. **Media Albums with Buttons Discipline:**
   - **Golden Rule:** Conventional `sendMediaGroup` in Telegram Bot API **strictly prohibits** inline keyboards / buttons (`reply_markup`).
   - When a user asks for a media album, gallery, or multi-media upload **with buttons**, ALWAYS use **Rich Messages** (`<tg-slideshow>` for swipeable carousels or `<tg-collage>` for grid collages) sent via `ctx.api.raw.sendRichMessage({ rich_message: { markdown | html, media: [...] } })` with embedded `<tg-button>` / `<tg-button-row>`.

---

## 3. Decision Tree

When starting or architecting a grammY bot project, resolve architectural requirements according to the following guidelines:

### A. Session Storage Selection
- **Default:** In-memory storage (`session({ initial: () => ({ ... }) })`) for stateless bots or rapid prototyping.
- **Persistent State:** When state persistence across restarts is required, present clear persistent options to the user:
  - `better-sqlite3` (`@grammyjs/storage-sqlite`): Recommended for single-instance VPS / Node.js bots.
  - `ioredis` (`@grammyjs/storage-redis`): Recommended for distributed bots, high load, or multi-worker architectures.
  - Supabase (`@grammyjs/storage-supabase`): Recommended for serverless edge deployments.
  - MongoDB (`@grammyjs/storage-mongodb`): Recommended for document-based backends.
  - Free Storage (`@grammyjs/storage-free`): For lightweight testing.

### B. Update Retrieval Strategy (Polling vs Webhook)
- **Automatic Detection:**
  - If project context indicates local development, Termux, or a persistent VPS $\rightarrow$ choose **Long Polling**.
  - If project context indicates serverless edge runtimes (Cloudflare Workers, Deno Deploy, Supabase Functions, Vercel) $\rightarrow$ choose **Webhooks**.
- **Ambiguous Context:** Explicitly ask the user for their target deployment environment.

### C. Concurrency & Runner Configuration
- **Simple Bots:** Use `bot.start()` for sequential, zero-dependency polling.
- **Production Polling Bots:** Recommend and use `@grammyjs/runner` with `sequentialize` middleware to ensure fast concurrent processing across chats with sequential integrity per chat.

### D. Error Handling Strategy
- Standard pattern: Global `bot.catch` with `BotError` unpacking, extracting `err.ctx.update.update_id`, inspecting `GrammyError` parameters (`retry_after`), and logging `HttpError`.
- For modular or risky plugins, wrap sub-trees in `composer.errorBoundary(...)`.

### E. Project Directory Structure
Follow the lean feature-based modular layout:
```text
my-bot/
├── src/
│   ├── bot/
│   │   ├── features/          # Modular domain features (e.g. welcome, admin, order, rich-message)
│   │   │   ├── welcome.ts
│   │   │   ├── rich-message.ts
│   │   │   └── order.ts
│   │   ├── context.ts         # MyContext and session interfaces
│   │   └── index.ts           # Bot instantiation and plugin registration
│   ├── config.ts              # Environment variables and settings
│   └── index.ts               # Entrypoint (bot.start, runner, or webhook server)
├── package.json
└── tsconfig.json
```

---

## 4. Reference Map

Refer to the factual documentation in `grammy/references/` for detailed implementations:

| File | Key Topics Covered |
| :--- | :--- |
| [`core.md`](references/core.md) | `Bot` class options, `Context` shortcuts (`ctx.reply`, `ctx.replyWithPhoto`), context flavors, `Composer` branching, filter queries (`bot.on`), `InputFile`, `reply_parameters`, HTML formatting |
| [`guest-messages.md`](references/guest-messages.md) | Bot API 10.0–10.3 Guest Bot Mode, `guest_message` updates, `ctx.answerGuestQuery()`, `guest_query_id`, `@BotFather` setup, non-member chat interactions |
| [`rich-messages.md`](references/rich-messages.md) | Rich Markdown & HTML Style, Bot API 10.1–10.3 Rich Messages (`InputRichMessage`), `<tg-slideshow>` / `<tg-collage>` media albums with embedded buttons (`<tg-button>`), local file uploads, compact tables, AI drafts (`sendRichMessageDraft`) & `<tg-thinking>` |
| [`sessions.md`](references/sessions.md) | Built-in `session()`, `initial` factory, `SessionFlavor`, storage adapters (SQLite, Redis, Supabase, Free), multi-sessions, `lazySession`, `enhanceStorage` |
| [`conversations.md`](references/conversations.md) | `@grammyjs/conversations`, replay engine mechanics, 3 golden rules, `conversation.wait()`, `waitFor`, `conversation.external()`, `conversation.form` |
| [`keyboards.md`](references/keyboards.md) | Built-in `InlineKeyboard`, custom `Keyboard`, callback handling, `@grammyjs/menu` plugin, `MenuRange`, submenus and back buttons |
| [`error-handling.md`](references/error-handling.md) | `bot.catch`, `BotError`, `GrammyError` (API), `HttpError` (network), `errorBoundary` middleware |
| [`deployment.md`](references/deployment.md) | Polling vs Webhooks, `@grammyjs/runner` concurrency, `sequentialize`, `webhookCallback`, supported framework adapters, secret tokens, webhook timeout rules |
| [`hosting.md`](references/hosting.md) | VPS hosting (systemd, PM2, Caddy), Deno Deploy, Cloudflare Workers, Supabase Functions, Fly.io, Vercel |
| [`v2-migration.md`](references/v2-migration.md) | grammY 2.0 breaking changes, `ctx.reply*` $\rightarrow$ `ctx.send*` renamings, `SendData` object, transformative flavors, JSR installation |

---

## 5. Quick Starter Snippet

```typescript
import { Bot, Context, session, SessionFlavor, InlineKeyboard } from "grammy";
import { run, sequentialize } from "@grammyjs/runner";

interface SessionData {
  counter: number;
}

export type MyContext = Context & SessionFlavor<SessionData>;

const bot = new Bot<MyContext>(process.env.BOT_TOKEN ?? "");

// 1. Concurrency sequentializer (per chat or guest caller)
bot.use(sequentialize((ctx) => {
  return ctx.msg?.guest_bot_caller_user?.id.toString() 
    ?? ctx.chat?.id.toString() 
    ?? ctx.from?.id.toString();
}));

// 2. Session middleware
bot.use(session({ initial: (): SessionData => ({ counter: 0 }) }));

// 3. Command Handlers
bot.command("start", async (ctx) => {
  ctx.session.counter++;
  await ctx.reply(`Welcome! You interacted ${ctx.session.counter} times.`);
});

// 4. Guest Message Handler (Telegram Bot API 10.0–10.3)
bot.on("guest_message:text", async (ctx) => {
  const caller = ctx.msg.guest_bot_caller_user;
  await ctx.answerGuestQuery({
    type: "article",
    id: `guest_${Date.now()}`,
    title: "Assistant Reply",
    input_message_content: {
      message_text: `👋 <b>Hello ${caller?.first_name ?? "there"}!</b>\n` +
                    `Processed prompt: <code>${ctx.msg.text}</code>`,
      parse_mode: "HTML",
    },
    reply_markup: new InlineKeyboard().url("Open App", "https://t.me/example"),
  });
});

// 5. Global Error Catching
bot.catch((err) => {
  console.error(`Error in update ${err.ctx.update.update_id}:`, err.error);
});

// 6. Start bot with runner
const runner = run(bot);
process.once("SIGINT", () => runner.stop());
process.once("SIGTERM", () => runner.stop());
```
