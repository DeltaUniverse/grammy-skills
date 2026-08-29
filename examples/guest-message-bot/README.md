# Guest Message Test Bot (Telegram Bot API 10.0–10.3)

A simple, ready-to-run Telegram bot demonstrating **Guest Bot Mode** using **grammY** (`v1.46.0`).

---

## ⚡ Quick Test (Without Bot Token)

You can run the offline simulation immediately:

```bash
npm install
npm test
```

---

## 🚀 Live Run with Real Telegram Bot

### Step 1: Enable Guest Mode in Telegram
1. Open `@BotFather` in Telegram.
2. Send `/mybots` and choose your bot.
3. Go to **Bot Settings** -> **Guest Mode** (or use command `/setguestchat`).
4. Turn Guest Mode **ON**.

### Step 2: Configure Token
```bash
cp .env.example .env
# Edit .env and put your real BOT_TOKEN
```

### Step 3: Start Bot
```bash
npm start
```

### Step 4: Test in Any Chat
1. Go to any group or private chat (where your bot is **not** a member).
2. Type `@your_bot_username hello world`
3. Watch the bot respond directly in that chat as a guest!
