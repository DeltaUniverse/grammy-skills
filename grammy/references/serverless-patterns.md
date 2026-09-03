# grammY Serverless & Edge Runtime Patterns Reference

> **Target Version:** grammY `v1.46.0` & `v2.0.0-beta.x`  
> **Runtimes:** Cloudflare Workers, Deno Deploy, Supabase Edge Functions, Hono  
> **Scope:** Runtime Constraints, KV Storage Portability, Cold Start Optimizations, and Hono Webhook Integrations

---

## Table of Contents
- [1. Runtime Constraints (Cloudflare Workers vs Deno Deploy)](#1-runtime-constraints-cloudflare-workers-vs-deno-deploy)
- [2. Portable KV Storage Abstraction Pattern](#2-portable-kv-storage-abstraction-pattern)
- [3. Cold Start & Webhook Execution Discipline](#3-cold-start--webhook-execution-discipline)
- [4. Hono-Specific Serverless Integration Patterns](#4-hono-specific-serverless-integration-patterns)

---

## 1. Runtime Constraints (Cloudflare Workers vs Deno Deploy)

Edge and serverless runtimes operate under strict sandbox rules compared to traditional Node.js VPS servers:

| Feature / API | Node.js VPS | Deno Deploy | Cloudflare Workers |
| :--- | :--- | :--- | :--- |
| **Execution Mode** | Long-running process | Event-driven isolators | Short-lived Isolate execution |
| **File System (`fs`)** | Full read/write | Not available / read-only | ❌ Strictly Not Available |
| **TCP Sockets / Redis Drivers** | Native (`ioredis`) | `Deno.connect` (limited) | ❌ Requires HTTP/REST drivers |
| **Standard Fetch API** | Global (`fetch`) | Native Web Standard | Native Web Standard |
| **Execution Timeouts** | Unlimited | ~30s per request | 10ms–50ms CPU time limit |
| **Long Polling (`bot.start`)** | Supported | Not recommended | ❌ Webhooks Only |

### Rule Guidelines:
1. **No Node-Only Native Modules:** Do not import `fs`, `path`, `child_process`, `net`, `tls`, `better-sqlite3`, or `ioredis` in serverless bot handlers.
2. **HTTP-Based Databases:** Use HTTP-based databases (e.g. `@grammyjs/storage-supabase`, Upstash Redis REST, Cloudflare KV, Deno KV) instead of native TCP socket drivers.
3. **Use Webhooks Exclusively:** Always configure webhooks (`webhookCallback`) for serverless deployments.

---

## 2. Portable KV Storage Abstraction Pattern

To ensure storage logic runs seamlessly across both Cloudflare Workers KV and Deno KV without refactoring bot features, define a portable storage adapter interface:

```typescript
export interface UniversalKVStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

// 1. Cloudflare Workers KV Adapter
export class CloudflareKVAdapter implements UniversalKVStorage {
  constructor(private kv: KVNamespace) {}

  async get<T>(key: string): Promise<T | null> {
    const val = await this.kv.get(key, "json");
    return val as T | null;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.kv.put(key, JSON.stringify(value), {
      expirationTtl: ttlSeconds,
    });
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(key);
  }
}

// 2. Deno KV Adapter
export class DenoKVAdapter implements UniversalKVStorage {
  constructor(private kv: Deno.Kv) {}

  async get<T>(key: string): Promise<T | null> {
    const res = await this.kv.get<T>(["app_store", key]);
    return res.value;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expireIn = ttlSeconds ? ttlSeconds * 1000 : undefined;
    await this.kv.set(["app_store", key], value, { expireIn });
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(["app_store", key]);
  }
}
```

---

## 3. Cold Start & Webhook Execution Discipline

Serverless isolates spin down when idle. When Telegram sends a webhook update, the runtime performs a cold start.

### Key Rules for Fast Response:
1. **Lightweight Global Scope:** Avoid heavy synchronous computations or dynamic imports outside event handlers.
2. **Immediate Webhook Acknowledgment:** Telegram expects an immediate HTTP `200 OK` response. Never run long tasks synchronously inside the request handler.
3. **Use Background Execution (`waitUntil`):**
   In Cloudflare Workers or Vercel, pass background tasks to `ctx.waitUntil()` so the HTTP response returns immediately while background work completes.

```typescript
// Cloudflare Workers Background Task Handling
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === "POST") {
      // Pass background tasks to ctx.waitUntil without blocking HTTP 200 return
      ctx.waitUntil(
        processBackgroundWork(env)
      );
    }
    return new Response("OK", { status: 200 });
  },
};
```

---

## 4. Hono-Specific Serverless Integration Patterns

[Hono](https://hono.dev) is a lightweight multi-runtime framework ideal for wrapping grammY bots on Cloudflare Workers, Deno, Bun, and Node.js.

### Production Hono + grammY Webhook Recipe:

```typescript
import { Hono } from "hono";
import { Bot, Context, webhookCallback } from "grammy";

interface Env {
  BOT_TOKEN: string;
  BOT_SECRET_TOKEN: string;
  BOT_KV: KVNamespace;
}

const app = new Hono<{ Bindings: Env }>();

// 1. Health Check Endpoint
app.get("/", (c) => c.text("Bot Service Online 🟢"));

// 2. Telegram Webhook Endpoint
app.post("/webhook", async (c) => {
  // Validate Secret Token Header
  const secretToken = c.req.header("X-Telegram-Bot-Api-Secret-Token");
  if (secretToken !== c.env.BOT_SECRET_TOKEN) {
    return c.text("Unauthorized", 401);
  }

  // Instantiate Bot with Environment Token
  const bot = new Bot(c.env.BOT_TOKEN);

  // Setup Command Handlers
  bot.command("start", (ctx) => ctx.reply("Hello from Hono + Cloudflare Workers!"));
  bot.command("status", (ctx) => ctx.reply("System Status: 🟢 Normal"));

  // Process Update via grammY Hono adapter
  const handleUpdate = webhookCallback(bot, "hono");
  return handleUpdate(c);
});

export default app;
```
