# grammY 2.0 Migration & Deprecation Guide

> **Target Version:** grammY `v2.0.0-beta.x` (Next / JSR)  
> **Stable Baseline:** grammY `v1.45.1`  
> **Source:** `https://v2.grammy.dev`, `https://jsr.io/@grammyjs/grammy/doc`, `https://github.com/grammyjs/grammy/issues/675`

---

## Table of Contents
- [1. Executive Summary & Breaking Changes Overview](#1-executive-summary--breaking-changes-overview)
- [2. Method Renamings (`ctx.reply*` $\rightarrow$ `ctx.send*`)](#2-method-renamings-ctxreply--ctxsend)
- [3. The `ctx.send` & `SendData` Architecture](#3-the-ctxsend--senddata-architecture)
- [4. Context Flavor Paradigm Shift (Transformative Flavors)](#4-context-flavor-paradigm-shift-transformative-flavors)
- [5. Plugin Compatibility & Migration Guardrails](#5-plugin-compatibility--migration-guardrails)
- [6. Installation & JSR Package Distribution](#6-installation--jsr-package-distribution)
- [7. Code Comparison: 1.x vs 2.0](#7-code-comparison-1x-vs-20)
- [8. Dual-Version Compatibility Checklist](#8-dual-version-compatibility-checklist)

---

## 1. Executive Summary & Breaking Changes Overview

grammY 2.0 is a major generational update that unifies API naming, modernizes TypeScript context flavor mechanics, introduces the `SendData` decoupled payload structure, and transitions the ecosystem to JSR package distribution.

### Key Breaking Changes at a Glance
1. **Deprecation & Removal of `ctx.reply*`:** All context sending shortcuts (`ctx.reply`, `ctx.replyWithPhoto`, `ctx.replyWithRichMessage`, etc.) are renamed to `ctx.send*` (`ctx.send`, `ctx.sendPhoto`, `ctx.sendRichMessage`, etc.).
2. **`SendData` Object Support:** `ctx.send()` can accept either a raw string or a structured `SendData` payload that decouples message construction from the active context.
3. **Additive Flavors Deprecated in Favor of Transformative Flavors:** Plugin typing shifts from intersection types (`Context & SessionFlavor<S>`) to nested generic wrappers (`SessionFlavor<Context, S>`).
4. **Plugin Ecosystem Reset:** 1.x plugins are NOT compatible with 2.0 without explicit migration by maintainers.
5. **Documentation Endpoints:**
   - **v1 Archive:** `https://v1.grammy.dev` (persisted for legacy 1.x bots).
   - **v2 Live Preview:** `https://v2.grammy.dev` (becoming `grammy.dev` upon final release).
   - **API Reference:** `https://jsr.io/@grammyjs/grammy/doc`

---

## 2. Method Renamings (`ctx.reply*` $\rightarrow$ `ctx.send*`)

In grammY 1.x, context shortcuts used the `reply` prefix, which was confusing because sending a message does not necessarily quote/reply to an incoming message. grammY 2.0 cleans up this naming:

| grammY 1.x (Deprecated in 2.0) | grammY 2.0 (Standard) | Underlying Bot API Method |
| :--- | :--- | :--- |
| `ctx.reply(text, options)` | `ctx.send(text, options)` | `api.sendMessage` |
| `ctx.replyWithPhoto(photo, options)` | `ctx.sendPhoto(photo, options)` | `api.sendPhoto` |
| `ctx.replyWithVideo(video, options)` | `ctx.sendVideo(video, options)` | `api.sendVideo` |
| `ctx.replyWithDocument(doc, options)` | `ctx.sendDocument(doc, options)` | `api.sendDocument` |
| `ctx.replyWithAudio(audio, options)` | `ctx.sendAudio(audio, options)` | `api.sendAudio` |
| `ctx.replyWithVoice(voice, options)` | `ctx.sendVoice(voice, options)` | `api.sendVoice` |
| `ctx.replyWithAnimation(anim, options)` | `ctx.sendAnimation(anim, options)` | `api.sendAnimation` |
| `ctx.replyWithVideoNote(note, options)` | `ctx.sendVideoNote(note, options)` | `api.sendVideoNote` |
| `ctx.replyWithMediaGroup(media, options)`| `ctx.sendMediaGroup(media, options)` | `api.sendMediaGroup` |
| `ctx.replyWithLocation(lat, lon, opts)` | `ctx.sendLocation(lat, lon, opts)` | `api.sendLocation` |
| `ctx.replyWithVenue(lat, lon, t, a, o)` | `ctx.sendVenue(lat, lon, t, a, o)` | `api.sendVenue` |
| `ctx.replyWithContact(phone, name, o)` | `ctx.sendContact(phone, name, o)` | `api.sendContact` |
| `ctx.replyWithPoll(q, options, opts)` | `ctx.sendPoll(q, options, opts)` | `api.sendPoll` |
| `ctx.replyWithDice(emoji, options)` | `ctx.sendDice(emoji, options)` | `api.sendDice` |
| `ctx.replyWithPaidMedia(media, p, o)` | `ctx.sendPaidMedia(media, p, o)` | `api.sendPaidMedia` |
| `ctx.replyWithChatAction(action, opts)` | `ctx.sendChatAction(action, opts)` | `api.sendChatAction` |

---

## 3. The `ctx.send` & `SendData` Architecture

In grammY 2.0, `ctx.send` serves a dual purpose:

### A. Direct Text Sending
```typescript
// Simple string sending
await ctx.send("Hello from grammY 2.0!");

// With standard options
await ctx.send("<b>Bold Notice</b>", {
  parse_mode: "HTML",
});
```

### B. Polymorphic `SendData` Payload
`SendData` allows modular features or external services to construct message payloads without needing the entire `Context` object instance:

```typescript
import { SendData } from "@grammyjs/grammy";

// 1. Decoupled payload builder
function createWelcomeCard(userName: string): SendData {
  return {
    type: "photo",
    photo: "https://example.com/welcome.jpg",
    caption: `Welcome, <b>${userName}</b>!`,
    parse_mode: "HTML",
  };
}

// 2. Dispatch via ctx.send
bot.command("start", async (ctx) => {
  const card = createWelcomeCard(ctx.from?.first_name ?? "User");
  await ctx.send(card);
});
```

---

## 4. Context Flavor Paradigm Shift (Transformative Flavors)

### The 1.x Additive Pattern (Deprecated in 2.0)
In 1.x, context flavors were combined via TypeScript intersection types (`&`):
```typescript
// ❌ grammY 1.x Additive Pattern
import { Context, SessionFlavor } from "grammy";
import { ConversationFlavor } from "@grammyjs/conversations";

type MyContext = Context & SessionFlavor<SessionData> & ConversationFlavor;
```

### The 2.0 Transformative Pattern (Required in 2.0)
In 2.0, all plugins and extensions must be modeled as **Transformative Flavors** that accept the base or parent Context as a generic parameter:
```typescript
// ✅ grammY 2.0 Transformative Pattern
import { Context } from "@grammyjs/grammy";
import { SessionFlavor } from "@grammyjs/session";
import { ConversationFlavor } from "@grammyjs/conversations";

// Generically wrapped Context
type MyContext = ConversationFlavor<SessionFlavor<Context, SessionData>>;
```

---

## 5. Plugin Compatibility & Migration Guardrails

> [!WARNING]
> **No 1.x plugin works out-of-the-box with grammY 2.0.**
> If your bot relies on `@grammyjs/conversations`, `@grammyjs/menu`, `@grammyjs/runner`, or community plugins, do NOT upgrade production bots to 2.0 until matching `v2` compatible releases of those plugins are published.

### Guidelines for Developers:
1. **Production Bots:** Stay on **grammY `v1.45.1`** (stable).
2. **Early Adopters / Testing:** If experimenting with 2.0 beta:
   - Isolate in a separate branch or test bot.
   - Replace all `ctx.reply*` with `ctx.send*`.
   - Update context flavor definitions to transformative wrappers.
   - Report feedback and edge cases to the grammY team.

---

## 6. Installation & JSR Package Distribution

grammY 2.0 is published via [JSR (JavaScript Registry)](https://jsr.io/@grammyjs/grammy):

```bash
# Deno
deno add jsr:@grammyjs/grammy@2.0.0-beta.6

# Node.js (npm)
npx jsr add @grammyjs/grammy@2.0.0-beta.6

# pnpm
pnpm i jsr:@grammyjs/grammy@2.0.0-beta.6

# Yarn
yarn add jsr:@grammyjs/grammy@2.0.0-beta.6

# Bun
bunx jsr add @grammyjs/grammy@2.0.0-beta.6
```

---

## 7. Code Comparison: 1.x vs 2.0

### grammY 1.x (Current Stable)
```typescript
import { Bot, Context, InlineKeyboard } from "grammy";

const bot = new Bot<Context>(process.env.BOT_TOKEN!);

bot.command("start", async (ctx) => {
  // 1.x reply methods
  await ctx.reply("Welcome to our bot!", {
    reply_markup: new InlineKeyboard().text("Action", "btn_action"),
  });
  
  await ctx.reply("<b>Status:</b> 🟢 <i>Online</i>", {
    parse_mode: "HTML",
  });
});

bot.start();
```

### grammY 2.0 (Next / Beta)
```typescript
import { Bot, Context, InlineKeyboard } from "@grammyjs/grammy";

const bot = new Bot<Context>(process.env.BOT_TOKEN!);

bot.command("start", async (ctx) => {
  // 2.0 send methods
  await ctx.send("Welcome to our bot!", {
    reply_markup: new InlineKeyboard().text("Action", "btn_action"),
  });
  
  await ctx.send("<b>Status:</b> 🟢 <i>Online</i>", {
    parse_mode: "HTML",
  });
});

bot.start();
```

---

## 8. Dual-Version Compatibility Checklist

When writing libraries, middleware, or skills that need to stay forward-compatible:

- [ ] Recognize both `ctx.reply` (v1) and `ctx.send` (v2).
- [ ] For media messages, recognize `ctx.replyWithPhoto` (v1) and `ctx.sendPhoto` (v2).
- [ ] For document messages, recognize `ctx.replyWithDocument` (v1) and `ctx.sendDocument` (v2).
- [ ] Migrate context flavors from additive (`&`) to transformative wrappers (`Flavor<Context>`).
- [ ] Document version requirements clearly (`v1.45.1` for production vs `v2.0.0-beta.x` for beta testing).
