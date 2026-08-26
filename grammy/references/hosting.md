# grammY Hosting & Infrastructure Reference

> **Verified Version:** grammY `v1.45.1`  
> **Source:** `https://grammy.dev/hosting/vps`, `https://grammy.dev/hosting/deno-deploy`, `https://grammy.dev/hosting/supabase`, `https://grammy.dev/hosting/cloudflare-workers`, `https://grammy.dev/hosting/fly`, `https://grammy.dev/hosting/vercel`

---

## Table of Contents
- [1. Hosting Environments Matrix](#1-hosting-environments-matrix)
- [2. Virtual Private Server (VPS)](#2-virtual-private-server-vps)
  - [systemd Service](#systemd-service)
  - [PM2 Process Manager](#pm2-process-manager)
  - [Caddy / Nginx Reverse Proxy](#caddy--nginx-reverse-proxy)
- [3. Deno Deploy](#3-deno-deploy)
- [4. Cloudflare Workers](#4-cloudflare-workers)
- [5. Supabase Edge Functions](#5-supabase-edge-functions)
- [6. Fly.io](#6-flyio)
- [7. Vercel Serverless](#7-vercel-serverless)

---

## 1. Hosting Environments Matrix

| Target | Deployment Method | Runtime | Best For |
| :--- | :--- | :--- | :--- |
| **VPS (Hetzner, DigitalOcean, AWS)** | Polling or Webhook | Node.js / Deno / Bun | Full control, persistent local SQLite/files |
| **Deno Deploy** | Webhook (`std/http`) | Deno Edge | Global edge latency, zero maintenance |
| **Cloudflare Workers** | Webhook (`cloudflare-mod`) | V8 Edge Worker | High scale, edge compute, low cost |
| **Supabase Functions** | Webhook (`std/http`) | Deno Edge | Apps built on Supabase DB / Auth |
| **Fly.io** | Polling or Webhook | Docker Container | Low latency containers with persistent volume |
| **Vercel** | Webhook (`http` or `std/http`) | Node.js / Edge | Next.js / frontend co-located bots |

---

## 2. Virtual Private Server (VPS)

### systemd Service
Create `/etc/systemd/system/telegram-bot.service`:

```ini
[Unit]
Description=grammY Telegram Bot
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/my-bot
ExecStart=/usr/bin/node /home/ubuntu/my-bot/dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/home/ubuntu/my-bot/.env

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable telegram-bot
sudo systemctl start telegram-bot
sudo systemctl status telegram-bot
```

### PM2 Process Manager
Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: "telegram-bot",
      script: "./dist/index.js",
      instances: 1, // Single instance if using polling with runner
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
```

Run with PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Caddy Reverse Proxy (Automatic HTTPS for Webhooks)
Create `/etc/caddy/Caddyfile`:

```caddy
bot.yourdomain.com {
    reverse_proxy localhost:3000
}
```

---

## 3. Deno Deploy

Native Deno Deploy setup using standard web standards:

```typescript
import { Bot, webhookCallback } from "https://deno.land/x/grammy/mod.ts";

const bot = new Bot(Deno.env.get("BOT_TOKEN") ?? "");

bot.command("start", (ctx) => ctx.reply("Hello from Deno Deploy!"));

const handleUpdate = webhookCallback(bot, "std/http");

Deno.serve(async (req) => {
  if (req.method === "POST") {
    const url = new URL(req.url);
    if (url.pathname.slice(1) === bot.token) {
      try {
        return await handleUpdate(req);
      } catch (err) {
        console.error(err);
      }
    }
  }
  return new Response("OK");
});
```

---

## 4. Cloudflare Workers

Cloudflare Module Worker setup using `cloudflare-mod` adapter:

```typescript
import { Bot, webhookCallback } from "grammy";

interface Env {
  BOT_TOKEN: string;
  WEBHOOK_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const bot = new Bot(env.BOT_TOKEN);

    bot.command("start", (ctx) => ctx.reply("Hello from Cloudflare Workers!"));

    // Handle webhook callback
    const handleUpdate = webhookCallback(bot, "cloudflare-mod", {
      secretToken: env.WEBHOOK_SECRET,
    });

    return handleUpdate(request);
  },
};
```

---

## 5. Supabase Edge Functions

Create `supabase/functions/telegram-bot/index.ts`:

```typescript
import { Bot, webhookCallback } from "https://deno.land/x/grammy/mod.ts";

const bot = new Bot(Deno.env.get("BOT_TOKEN") ?? "");

bot.command("ping", (ctx) => ctx.reply("pong!"));

const handleUpdate = webhookCallback(bot, "std/http");

Deno.serve(async (req) => {
  try {
    return await handleUpdate(req);
  } catch (err) {
    console.error(err);
    return new Response("Error", { status: 500 });
  }
});
```

---

## 6. Fly.io

Dockerfile for Fly.io container deployment:

```dockerfile
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist

CMD ["node", "dist/index.js"]
```

`fly.toml` configuration for long-polling (ensure machines don't auto-stop):
```toml
app = "my-grammy-bot"
primary_region = "iad"

[env]
  NODE_ENV = "production"

[http_service]
  internal_schema = "http"
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1
```

---

## 7. Vercel Serverless

Create `api/bot.ts`:

```typescript
import { Bot, webhookCallback } from "grammy";

const bot = new Bot(process.env.BOT_TOKEN ?? "");

bot.command("start", (ctx) => ctx.reply("Hello from Vercel!"));

export default webhookCallback(bot, "http");
```
