# grammY Telegram Bot Skill for AI Coding Agents

[![grammY Version](https://img.shields.io/badge/grammY-v1.46.0%20%7C%20v2.0%20beta-2481cc?style=flat-square&logo=telegram)](https://grammy.dev)
[![Telegram Bot API](https://img.shields.io/badge/Bot%20API-10.0%20--%2010.3-blue?style=flat-square&logo=telegram)](https://core.telegram.org/bots/api)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x%20Strict-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Runtimes](https://img.shields.io/badge/Runtimes-Node%20%7C%20Deno%20%7C%20Bun%20%7C%20Cloudflare-green?style=flat-square)](https://grammy.dev/hosting/comparison)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

An agent-agnostic, comprehensive skill and reference library for building high-quality, production-grade Telegram Bots with **grammY** (`v1.46.0` stable & `v2.0.0` next-gen) using TypeScript and JavaScript.

Equips AI coding assistants with deep domain knowledge, strict architecture principles, primary documentation references, and battle-tested code recipes.

---

## 🤖 Supported AI Coding Assistants

| AI Assistant / Tool | Command / Indicator | Global Installation Path | Project Workspace Path |
| :--- | :--- | :--- | :--- |
| **Google Antigravity / Gemini CLI** | `agy` / `gemini` | `~/.gemini/config/skills/grammy` | `.agents/skills/grammy` |
| **Pi Coding Agent** | `pi` | `~/.pi/agent/skills/grammy` | `.pi/skills/grammy` |
| **Anthropic Claude Code** | `claude` | `~/.claude/skills/grammy` | `.claude/skills/grammy` |
| **Cursor IDE** | Cursor Agent | `~/.cursor/skills/grammy` | `.cursor/skills/grammy` |
| **Windsurf / Codeium** | Cascade | `~/.codeium/windsurf/skills/grammy` | `.windsurf/skills/grammy` |
| **Roo Code / Cline** | Roo / Cline | `~/.roo/skills/grammy`, `~/.cline/skills/grammy` | `.roo/skills/grammy` |
| **Universal Standards** | Agent standard | `~/.agents/skills/grammy`, `~/.skills/grammy` | `.agents/skills/grammy` |

---

## 🌟 Core Highlights & Modern Telegram Features

- **🔒 Ephemeral & Invisible Messages in Groups (Bot API 10.3 / July 2026):**
  Send private messages in groups visible strictly to the interacting user via `EphemeralMessageParameters`. Register two-way invisible commands (`is_ephemeral: true`) to hide sensitive user prompts from other chat members, and render in-place private overlays (`replace_callback_query_message: true`).
- **👤 Guest Bot Mode (Bot API 10.0):**
  Enable bots to answer `@mention` queries in chats where the bot is **not** an added member via `guest_message` updates and `ctx.answerGuestQuery()`.
- **🖼️ Rich Messages & Media Slideshows with Buttons (Bot API 10.1–10.3):**
  Overcome the limitation of `sendMediaGroup` (which forbids inline buttons) by using `<tg-slideshow>` and `<tg-collage>` with embedded `<tg-button>` action rows. Render compact tables (`is_compact: true`) and stream real-time AI responses with `<tg-thinking>`.
- **🔄 Deterministic Conversations:**
  Enforce strict rules for `@grammyjs/conversations` (wrapping side effects in `conversation.external`, preserving deterministic replay, eliminating race conditions).
- **🚀 High-Performance Broadcast Engine:**
  Queue-based state machine (`pending` $\rightarrow$ `running` $\rightarrow$ `paused`/`stopped`), chunked recipient dispatch, auto-throttling on `429 Too Many Requests`, and automatic dead account cleanup (`onUserRestricted`).
- **⚡ Serverless & Multi-Platform Hosting:**
  Production patterns for Cloudflare Workers, Deno Deploy, Supabase Functions, Fly.io, and VPS (PM2/systemd) with portable KV storage abstractions.
- **🛡️ Telegram Mini App (TMA) Auditing:**
  A 5-phase gated protocol for analyzing and hardening TMA codebases, including cryptographic `initData` validation and UI button lifecycle synchronization.
- **🔮 grammY 2.0 Preparedness:**
  Transformative context flavors, method renamings (`ctx.reply*` $\rightarrow$ `ctx.send*`), polymorphic `SendData` payloads, and JSR distribution (`@grammyjs/grammy`).

---

## 📦 Reference Documentation Library

The [`grammy/references/`](grammy/references/) directory provides 100% factual documentation cross-referenced directly with official sources:

### 1. Core Architecture & Standards
- **[`SKILL.md`](grammy/SKILL.md)** — Master skill manifest: Freshness protocol, 9 Lazy Senior Principles, context modeling, Decision Tree, and starter snippets.
- **[`core.md`](grammy/references/core.md)** — Bot class options, context flavors, filter queries (`bot.on`), message sending, and file uploads.
- **[`typescript-patterns.md`](grammy/references/typescript-patterns.md)** — Strict typing conventions, dependency injection (DI), `Result<T, E>` error handling, and dependency pre-flight checks.
- **[`v2-migration.md`](grammy/references/v2-migration.md)** — grammY 2.0 breaking changes, `ctx.send` conventions, transformative flavor wrappers, and JSR packaging.

### 2. Modern Telegram Bot API 10.x Features
- **[`ephemeral-messages.md`](grammy/references/ephemeral-messages.md)** — Telegram Bot API 10.3 Ephemeral Messages in Groups, `EphemeralMessageParameters`, two-way invisible commands (`is_ephemeral`), private overlays (`replace_callback_query_message`), dedicated edits/deletions, and Telegram Communities onboarding.
- **[`guest-messages.md`](grammy/references/guest-messages.md)** — Bot API 10.0 Guest Mode, non-member chat interactions, `guest_message` updates, `ctx.answerGuestQuery()`, and `@BotFather` setup.
- **[`rich-messages.md`](grammy/references/rich-messages.md)** — Bot API 10.1–10.3 Rich Blocks (`InputRichMessage`), `<tg-slideshow>` & `<tg-collage>` media albums with buttons, compact tables, `@grammyjs/format`, `@grammyjs/parse-mode`, and AI streaming drafts.

### 3. Interactive UI & User Dialogs
- **[`keyboards.md`](grammy/references/keyboards.md)** — Built-in `InlineKeyboard`, custom reply keyboards, callback handling, `@grammyjs/menu` plugin, submenus, and back navigation.
- **[`conversations.md`](grammy/references/conversations.md)** — Multi-step async dialogs via `@grammyjs/conversations`, Replay Engine rules, external side-effects isolation, and forms.
- **[`sessions.md`](grammy/references/sessions.md)** — Built-in sessions, storage adapters (SQLite, Redis, Supabase, Free), multi-sessions, `lazySession`, and TTL enhancements.

### 4. Operations, Infrastructure & Scale
- **[`broadcast.md`](grammy/references/broadcast.md)** — High-performance broadcast queue state machine, batch chunking, 429 auto-throttling, KV persistence, and progress telemetry.
- **[`error-handling.md`](grammy/references/error-handling.md)** — Global `bot.catch`, `BotError` unwrapping, `GrammyError` (API), `HttpError` (network), and composer error boundaries.
- **[`deployment.md`](grammy/references/deployment.md)** — Polling vs Webhooks, `@grammyjs/runner` concurrency with `sequentialize`, webhook security tokens, and framework adapters.
- **[`hosting.md`](grammy/references/hosting.md)** — Detailed deployment guides for VPS (systemd/PM2/Caddy), Cloudflare Workers, Deno Deploy, Supabase Functions, and Fly.io.
- **[`serverless-patterns.md`](grammy/references/serverless-patterns.md)** — Serverless runtime constraints, portable KV abstractions, cold start mitigations, and Hono routing.
- **[`miniapp-codebase-analysis.md`](grammy/references/miniapp-codebase-analysis.md)** — 5-phase gated audit protocol for Telegram Mini Apps (TMAs), cryptographic validation, and SDK alignment.
- **[`_meta.json`](grammy/references/_meta.json)** — Version provenance and fetched primary documentation sources.

---

## 🛠️ Runnable Example Bots

The [`examples/`](examples/) directory includes full, standalone bot implementations with zero-network offline simulation test suites:

| Example Bot | Directory | Key Features Demonstrated | Offline Test |
| :--- | :--- | :--- | :--- |
| **Ephemeral Bot** | [`examples/ephemeral-bot`](examples/ephemeral-bot) | Bot API 10.3 invisible `/whisper` command, in-place private overlays (`replace_callback_query_message`), `deleteEphemeralMessage`, Communities welcome | `node test-simulation.mjs` |
| **Guest Message Bot** | [`examples/guest-message-bot`](examples/guest-message-bot) | Bot API 10.0 non-member `@mention` handling, `answerGuestQuery` responses, inline cards | `node test-simulation.mjs` |
| **Rich Slideshow Bot** | [`examples/rich-slideshow-bot`](examples/rich-slideshow-bot) | Bot API 10.1–10.3 `<tg-slideshow>` albums with interactive buttons, compact ASCII tables | `npm test` |
| **Broadcast Engine Bot** | [`examples/broadcast-bot`](examples/broadcast-bot) | Queue-based state machine, rate-limit backoff, restricted user pruning, live progress | `npm test` |

---

## 🚀 Installation & Setup

Use the smart installer script (`install.sh` or `install.mjs`) to install the skill globally across your system or locally in a specific project.

### 1. Interactive Menu
Simply execute the installer to open the interactive setup:
```bash
./install.sh
```

### 2. Global Installation (Recommended)
Installs into detected agent configuration directories. Using the `--link` flag creates live symlinks so repository edits reflect instantly:
```bash
# Live symlink (recommended for development)
./install.sh --global --link

# Or standalone copy
./install.sh --global
```

### 3. Project Workspace Installation
Install the skill directly into your current project workspace:
```bash
# In current working directory
./install.sh --project

# Or into a specific project path
./install.sh --project /path/to/my-telegram-bot
```

### 4. Target Specific Coding Agents
Install exclusively for your preferred agent:
```bash
# Google Antigravity / Gemini CLI
./install.sh -g -a antigravity -l

# Pi Coding Agent
./install.sh -g -a pi -l

# Anthropic Claude Code
./install.sh -g -a claude -l

# Cursor IDE
./install.sh -p -a cursor

# Universal Standard (.agents / .skills)
./install.sh -g -a universal -l
```

### 5. Check Status & Uninstall
```bash
# View active installation footprint
./install.sh --status

# Remove global installations
./install.sh --uninstall --global

# Remove from project
./install.sh --uninstall --project
```

---

## 🔄 Auto-Update & Documentation Sync

Keep reference documents, API specifications, and symlinks synchronized with upstream releases:

```bash
# Run auto-updater
./update.sh

# Or via npm
npm run update
```

### What the Synchronizer Does:
1. **Repository Pull:** Fetches latest improvements and reference docs from `origin/main`.
2. **Registry Freshness Check:** Queries npm (`grammy@latest`) and JSR (`@grammyjs/grammy`) for newly published versions.
3. **Symlink Health Check:** Verifies and repairs symbolic links across all detected agent folders.

#### Optional Daily Crontab:
```bash
# Automatically sync every morning at 04:00
(crontab -l 2>/dev/null; echo "0 4 * * * cd $(pwd) && ./update.sh >/dev/null 2>&1") | crontab -
```

---

## 📄 License
Released under the [MIT License](LICENSE).
