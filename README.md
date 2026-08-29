# grammY Telegram Bot Skill for AI Coding Agents

An agent-agnostic, comprehensive skill and reference library for building high-quality Telegram Bots with **grammY** (`v1.46.0`, Telegram Bot API 10.0–10.3) using TypeScript and JavaScript.

Compatible with all leading AI coding assistants:
- **Pi Coding Agent (`pi`)**
- **Google Antigravity / Gemini CLI (`agy`)**
- **Anthropic Claude Code (`claude`)**
- **Cursor IDE (`.cursor/`)**
- **Windsurf / Codeium Cascade (`.windsurf/`)**
- **Roo Code / Cline (`.roo/`, `.cline/`)**
- **Universal Agent Standards (`.agents/skills/`, `.skills/`)**

---

## 📦 What's Included

- **[`grammy/SKILL.md`](grammy/SKILL.md)**: Main skill file with Freshness Protocol, Lazy Senior Principles, Context Typing, Decision Tree, and Reference Map.
- **[`grammy/references/`](grammy/references/)**: 100% factual reference files derived directly from official documentation:
  - [`core.md`](grammy/references/core.md) — Bot class, context flavors, filter queries, message sending, and file uploads.
  - [`guest-messages.md`](grammy/references/guest-messages.md) — Telegram Bot API 10.0–10.3 Guest Bot Mode, `guest_message` updates, `ctx.answerGuestQuery()`, and `@BotFather` setup.
  - [`rich-messages.md`](grammy/references/rich-messages.md) — HTML formatting, Bot API 10.1–10.3 Rich Blocks (`InputRichMessage`), compact tables, `@grammyjs/format`, `@grammyjs/parse-mode`, ASCII monospace tables, AI streaming via `editMessageText`, and inline keyboards.
  - [`sessions.md`](grammy/references/sessions.md) — Built-in sessions, multi-sessions, storage adapters (SQLite, Redis, Supabase, Free), lazy sessions, and TTL enhancement.
  - [`conversations.md`](grammy/references/conversations.md) — Async multi-step dialogs, Replay Engine rules, determinism, and form builders.
  - [`keyboards.md`](grammy/references/keyboards.md) — Inline keyboards, custom reply keyboards, callback queries, and the Menu plugin.
  - [`error-handling.md`](grammy/references/error-handling.md) — Global `bot.catch`, `BotError`, `GrammyError` (API), `HttpError` (network), and error boundaries.
  - [`deployment.md`](grammy/references/deployment.md) — Polling vs. Webhooks, `@grammyjs/runner` concurrency with `sequentialize`, and webhook adapters.
  - [`hosting.md`](grammy/references/hosting.md) — VPS (systemd/PM2/Caddy), Deno Deploy, Cloudflare Workers, Supabase Functions, Fly.io, and Vercel.
  - [`v2-migration.md`](grammy/references/v2-migration.md) — grammY 2.0 migration, `ctx.reply*` $\rightarrow$ `ctx.send*` renamings, `SendData` object, transformative flavors, and JSR distribution.
  - [`_meta.json`](grammy/references/_meta.json) — Version provenance and fetched primary documentation sources.

---

## 🚀 Installation

Use the universal installer script (`install.sh` or `install.mjs`) to install the skill globally or into any project.

### 1. Interactive Installation
Simply run the installer without arguments to open an interactive terminal menu:
```bash
./install.sh
```

### 2. Global Installation (All Coding Agents)
Installs the skill into your user home configuration directories so it is accessible across all workspaces:
```bash
# Standalone copy
./install.sh --global

# Or as a live symlink (updates to this repo reflect immediately)
./install.sh --global --link
```

### 3. Project Installation (Local Workspace)
Installs the skill into a specific project repository:
```bash
# Current directory
./install.sh --project

# Specific project path
./install.sh --project /path/to/my-telegram-bot
```

### 4. Target Specific AI Agents
```bash
# Install for Pi Coding Agent
./install.sh -g -a pi

# Install for Antigravity / Gemini CLI
./install.sh -g -a antigravity

# Install for Claude Code
./install.sh -g -a claude

# Install for Cursor
./install.sh -p -a cursor
```

### 5. Check Status & Uninstall
```bash
# Check where the skill is installed
./install.sh --status

# Uninstall globally
./install.sh --uninstall --global

# Uninstall from project
./install.sh --uninstall --project
```

---

## 🔄 Auto-Update & Synchronizer

Keep your skill references and agent links up-to-date with a single command:

```bash
# 1. Quick update via script
./update.sh

# Or via npm script
npm run update
```

### What the Auto-Updater Does:
1. **Git Pull:** Pulls the latest commits, fixes, and docs from `origin/main`.
2. **Registry Freshness Check:** Checks npm (`grammy@latest`) and JSR (`@grammyjs/grammy`) for newly released versions.
3. **Agent Symlink Repair:** Automatically verifies and repairs symlinks for all detected AI coding agents (`.gemini`, `.pi`, `.claude`, `.cursor`, `.windsurf`, `.roo`, `.cline`, `.agents`).

### Automated Background Cron (Optional)
To run auto-updates automatically every day in the background:
```bash
# Add a daily cron job (runs every day at 04:00)
(crontab -l 2>/dev/null; echo "0 4 * * * cd $(pwd) && ./update.sh >/dev/null 2>&1") | crontab -
```

---

## 🗺️ Agent Directory Locations

| Agent Platform | Global Location | Project Location |
| :--- | :--- | :--- |
| **Pi Coding Agent (`pi`)** | `~/.pi/agent/skills/grammy`, `~/.pi/skills/grammy` | `.pi/skills/grammy` |
| **Antigravity / Gemini CLI** | `~/.gemini/config/skills/grammy` | `.agents/skills/grammy`, `.agent/skills/grammy` |
| **Claude Code** | `~/.claude/skills/grammy` | `.claude/skills/grammy` |
| **Cursor** | `~/.cursor/skills/grammy` | `.cursor/skills/grammy` |
| **Windsurf** | `~/.codeium/windsurf/skills/grammy` | `.windsurf/skills/grammy` |
| **Roo Code / Cline** | `~/.roo/skills/grammy`, `~/.cline/skills/grammy` | `.roo/skills/grammy`, `.cline/skills/grammy` |
| **Universal / Standard** | `~/.agents/skills/grammy`, `~/.skills/grammy` | `.agents/skills/grammy`, `.skills/grammy`, `skills/grammy` |

---

## 📄 License
MIT
