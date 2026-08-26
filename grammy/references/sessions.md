# grammY Sessions Reference

> **Verified Version:** grammY `v1.45.1`  
> **Source:** `https://grammy.dev/plugins/session`

---

## Table of Contents
- [1. Overview & Installation](#1-overview--installation)
- [2. Basic Session Configuration](#2-basic-session-configuration)
- [3. Session Flavors & Typing](#3-session-flavors--typing)
- [4. Storage Adapters](#4-storage-adapters)
- [5. Multi-Sessions](#5-multi-sessions)
- [6. Lazy Sessions](#6-lazy-sessions)
- [7. Advanced Storage Features (`enhanceStorage`)](#7-advanced-storage-features-enhancestorage)
- [8. Custom Session Keys](#8-custom-session-keys)

---

## 1. Overview & Installation

grammY includes built-in session middleware for persisting user and chat state across updates. The session plugin is included in the `grammy` core package and requires no external dependency for in-memory storage.

```typescript
import { Bot, Context, session, SessionFlavor } from "grammy";
```

---

## 2. Basic Session Configuration

To initialize sessions, pass a configuration object containing the `initial` factory function.

```typescript
interface SessionData {
  pizzaCount: number;
  selectedCrust?: "thin" | "thick";
}

type MyContext = Context & SessionFlavor<SessionData>;

const bot = new Bot<MyContext>("BOT_TOKEN");

// Install session middleware
bot.use(
  session({
    // Factory function returning fresh initial state for new sessions
    initial: (): SessionData => ({
      pizzaCount: 0,
    }),
  })
);

bot.command("order", async (ctx) => {
  ctx.session.pizzaCount++;
  await ctx.reply(`You have ordered ${ctx.session.pizzaCount} pizzas.`);
});

bot.command("reset", async (ctx) => {
  // Reset session to initial state or delete it
  ctx.session = { pizzaCount: 0 };
  await ctx.reply("Session reset.");
});
```

---

## 3. Session Flavors & Typing

Sessions must be added to the custom context type via `SessionFlavor<SessionData>`.

```typescript
import { Context, SessionFlavor } from "grammy";

export interface MySessionData {
  step: string;
  items: string[];
}

export type MyContext = Context & SessionFlavor<MySessionData>;
```

---

## 4. Storage Adapters

By default, grammY uses `MemorySessionStorage`, which retains data in-memory only (reset on process restart). For persistent storage, use official storage adapters:

### 1. SQLite Storage (`@grammyjs/storage-sqlite`)
Ideal for self-hosted VPS / single-instance bots.

```typescript
import Database from "better-sqlite3";
import { sqliteAdapter } from "@grammyjs/storage-sqlite";

const db = new Database("bot_sessions.db");
bot.use(
  session({
    initial: () => ({ counter: 0 }),
    storage: sqliteAdapter(db),
  })
);
```

### 2. Redis Storage (`@grammyjs/storage-redis`)
Ideal for distributed bots, high throughput, and multiple workers.

```typescript
import { Redis } from "ioredis";
import { RedisAdapter } from "@grammyjs/storage-redis";

const redis = new Redis("redis://localhost:6379");
bot.use(
  session({
    initial: () => ({ counter: 0 }),
    storage: new RedisAdapter({ instance: redis }),
  })
);
```

### 3. Supabase Storage (`@grammyjs/storage-supabase`)
Ideal for serverless edge deployments (Supabase Edge Functions / Deno Deploy).

```typescript
import { createClient } from "@supabase/supabase-js";
import { supabaseAdapter } from "@grammyjs/storage-supabase";

const supabase = createClient("SUPABASE_URL", "SUPABASE_KEY");
bot.use(
  session({
    initial: () => ({ counter: 0 }),
    storage: supabaseAdapter({
      supabase,
      table: "sessions",
    }),
  })
);
```

### 4. Free Storage Adapter (`@grammyjs/storage-free`)
Free key-value storage provided by grammY hosted cluster (useful for prototypes and hobby projects).

```typescript
import { freeStorage } from "@grammyjs/storage-free";

bot.use(
  session({
    initial: () => ({ counter: 0 }),
    storage: freeStorage<SessionData>(bot.token),
  })
);
```

---

## 5. Multi-Sessions

Multi-sessions allow splitting session data into multiple keys or different storages (e.g., chat settings in Redis, user profile in SQLite).

```typescript
interface UserData {
  name: string;
}
interface ChatData {
  language: string;
}

type MyContext = Context &
  SessionFlavor<{
    user: UserData;
    chat: ChatData;
  }>;

bot.use(
  session({
    type: "multi",
    user: {
      initial: (): UserData => ({ name: "Anonymous" }),
      // Per-user key (default is ctx.from.id)
      getSessionKey: (ctx) => ctx.from?.id.toString(),
      storage: userStorage,
    },
    chat: {
      initial: (): ChatData => ({ language: "en" }),
      // Per-chat key (default is ctx.chat.id)
      getSessionKey: (ctx) => ctx.chat?.id.toString(),
      storage: chatStorage,
    },
  })
);

bot.on("message", async (ctx) => {
  const userName = ctx.session.user.name;
  const lang = ctx.session.chat.language;
});
```

---

## 6. Lazy Sessions

Lazy sessions do not load session data from storage unless `ctx.session` is explicitly read. Writes are committed only if `ctx.session` was modified. Useful when only a fraction of updates access sessions, significantly reducing database load.

```typescript
import { Bot, Context, lazySession, LazySessionFlavor } from "grammy";

interface SessionData {
  counter: number;
}

type MyContext = Context & LazySessionFlavor<SessionData>;

const bot = new Bot<MyContext>("BOT_TOKEN");

bot.use(
  lazySession({
    initial: () => ({ counter: 0 }),
    storage: redisStorage,
  })
);

bot.command("count", async (ctx) => {
  // Must await ctx.session with LazySessionFlavor
  const session = await ctx.session;
  session.counter++;
  await ctx.reply(`Count is ${session.counter}`);
});
```

---

## 7. Advanced Storage Features (`enhanceStorage`)

grammY provides `enhanceStorage` to wrap storage adapters with automatic expiration (TTL) and migrations.

### Timeouts / Expiration (TTL)
```typescript
import { session, enhanceStorage } from "grammy";

bot.use(
  session({
    initial: () => ({ counter: 0 }),
    storage: enhanceStorage({
      storage: redisStorage,
      // Automatically expire session after 24 hours of inactivity
      millisecondsToLive: 24 * 60 * 60 * 1000,
    }),
  })
);
```

### Migrations
```typescript
bot.use(
  session({
    initial: () => ({ version: 2, counter: 0, newField: "default" }),
    storage: enhanceStorage({
      storage: sqliteStorage,
      migrations: {
        // Upgrade from version 1 to version 2
        1: (oldSession: any) => ({
          version: 2,
          counter: oldSession.counter ?? 0,
          newField: "migrated",
        }),
      },
    }),
  })
);
```

---

## 8. Custom Session Keys

By default, `getSessionKey` uses `${ctx.chat.id}` for standard chat sessions or `${ctx.from.id}` for user sessions. You can customize key derivation:

```typescript
bot.use(
  session({
    initial: () => ({ counter: 0 }),
    getSessionKey: (ctx) => {
      // Store per-chat per-user session
      if (ctx.chat === undefined || ctx.from === undefined) return undefined;
      return `${ctx.chat.id}:${ctx.from.id}`;
    },
  })
);
```
