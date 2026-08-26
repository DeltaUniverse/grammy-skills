# grammY Conversations Reference

> **Verified Version:** grammY `v1.45.1` (`@grammyjs/conversations`)  
> **Source:** `https://grammy.dev/plugins/conversations`

---

## Table of Contents
- [1. Overview & Installation](#1-overview--installation)
- [2. Prerequisites & Middleware Ordering](#2-prerequisites--middleware-ordering)
- [3. Typing & Context Flavors](#3-typing--context-flavors)
- [4. Defining & Registering Conversations](#4-defining--registering-conversations)
- [5. The Replay Engine: Core Mechanics](#5-the-replay-engine-core-mechanics)
- [6. The Three Golden Rules of Conversations](#6-the-three-golden-rules-of-conversations)
- [7. Waiting for User Input](#7-waiting-for-user-input)
- [8. Side Effects & `conversation.external`](#8-side-effects--conversationexternal)
- [9. Form Builder Helper (`conversation.form`)](#9-form-builder-helper-conversationform)
- [10. Controlling Conversation Lifecycle](#10-controlling-conversation-lifecycle)

---

## 1. Overview & Installation

The `@grammyjs/conversations` plugin provides linear, async/await-style multi-step dialog management. Instead of manually maintaining state machines, developers can write conversational flows sequentially using standard control structures (`if`, `for`, `while`, `try/catch`).

```bash
npm install @grammyjs/conversations
```

---

## 2. Prerequisites & Middleware Ordering

Conversations store their execution log and state inside the session. Therefore:
1. Session middleware MUST be installed BEFORE conversation middleware.
2. `conversations()` must be registered before individual conversation builders.

```typescript
import { Bot, Context, session, SessionFlavor } from "grammy";
import {
  conversations,
  createConversation,
  ConversationFlavor,
  type Conversation,
} from "@grammyjs/conversations";

export type MyContext = Context & SessionFlavor<any> & ConversationFlavor;
export type MyConversation = Conversation<MyContext>;

const bot = new Bot<MyContext>("BOT_TOKEN");

// 1. Install session FIRST
bot.use(session({ initial: () => ({}) }));

// 2. Install conversations plugin SECOND
bot.use(conversations());

// 3. Register conversation builders THIRD
bot.use(createConversation(greetingConversation));
```

---

## 3. Typing & Context Flavors

A conversation builder function receives two parameters:
1. `conversation`: A `Conversation<MyContext>` instance providing wait helpers, replay engine controllers, and state recording.
2. `ctx`: The initial `MyContext` from the update that triggered the conversation.

```typescript
import { Context, SessionFlavor } from "grammy";
import { ConversationFlavor, Conversation } from "@grammyjs/conversations";

export type MyContext = Context & SessionFlavor<{}> & ConversationFlavor;
export type MyConversation = Conversation<MyContext>;

async function myDialog(conversation: MyConversation, ctx: MyContext) {
  // Dialog logic
}
```

---

## 4. Defining & Registering Conversations

```typescript
async function askAge(conversation: MyConversation, ctx: MyContext) {
  await ctx.reply("How old are you?");
  
  // Wait for the user to reply with a message
  const ageCtx = await conversation.waitFor("message:text");
  const age = Number.parseInt(ageCtx.msg.text, 10);
  
  if (Number.isNaN(age)) {
    await ctx.reply("That does not look like a valid number. Conversation ended.");
    return;
  }
  
  await ctx.reply(`You are ${age} years old!`);
}

// Register with bot
bot.use(createConversation(askAge)); // Identifier defaults to function name: 'askAge'

// Enter conversation from command
bot.command("start_age", async (ctx) => {
  await ctx.conversation.enter("askAge");
});
```

---

## 5. The Replay Engine: Core Mechanics

The plugin uses an active **Replay Engine**. Understanding this is critical:
- When a user sends an update to an active conversation, **the conversation function executes again from the very beginning**.
- All calls to `conversation.wait()` and `conversation.waitFor()` replay historical recorded values from previous steps instantly without pausing.
- When the code reaches a `wait` point that has no recorded response yet, execution pauses and control yields back to the bot.

---

## 6. The Three Golden Rules of Conversations

Violating these rules will cause subtle bugs, duplicate database writes, repeated emails/messages, or corrupted state during replaying.

### Rule 1: Always Wrap Side Effects in `conversation.external()`
Any non-grammY operation that communicates with a database, external API, file system, or external service MUST be wrapped in `await conversation.external()`. The return value will be cached in the session so it executes only ONCE and returns cached results during subsequent replays.

### Rule 2: Never Access or Mutate Mutable Outer Scope Variables
Do not mutate global variables, outer module state, or variables outside the conversation across wait points. Store persistent state inside local variables inside the conversation function or inside `ctx.session`.

### Rule 3: Maintain Strict Determinism (No Direct `Math.random` / `Date.now`)
Never use non-deterministic values directly. Use built-in helpers provided by the `conversation` object:
- Instead of `Math.random()`, use `await conversation.random()`.
- Instead of `Date.now()` or `new Date()`, use `await conversation.now()`.
- Instead of `console.log()`, use `conversation.log()`.

---

## 7. Waiting for User Input

The `conversation` object provides multiple helper methods to wait for updates:

### `conversation.wait()`
Waits for ANY incoming update from the user in this chat.
```typescript
const nextCtx = await conversation.wait();
```

### `conversation.waitFor(filter, options?)`
Waits for an update matching a filter query. If non-matching updates arrive, they can be skipped or handled.
```typescript
// Waits for a text message
const textCtx = await conversation.waitFor("message:text");

// Waits for a photo
const photoCtx = await conversation.waitFor("message:photo");

// Specify custom handling for invalid input
const textCtxWithCustomOtherwise = await conversation.waitFor("message:text", {
  otherwise: async (ctx) => {
    await ctx.reply("Please send a text message, not files or media!");
  },
});
```

### `conversation.waitForCallbackQuery(data, options?)`
Waits specifically for callback query updates matching a string or RegExp pattern:
```typescript
const cbCtx = await conversation.waitForCallbackQuery(["confirm", "cancel"]);
await cbCtx.answerCallbackQuery();
if (cbCtx.callbackQuery.data === "confirm") {
  await cbCtx.reply("Confirmed!");
}
```

### `conversation.waitUntil(predicate, options?)`
Waits until a custom condition evaluates to `true`.
```typescript
const validNumberCtx = await conversation.waitUntil(
  (ctx) => ctx.has("message:text") && !isNaN(Number(ctx.msg.text)),
  {
    otherwise: (ctx) => ctx.reply("Please enter a valid number!"),
  }
);
```

---

## 8. Side Effects & `conversation.external`

### Database / API Call Example
```typescript
async function checkoutConversation(conversation: MyConversation, ctx: MyContext) {
  await ctx.reply("Please enter your delivery address:");
  const addressCtx = await conversation.waitFor("message:text");
  const address = addressCtx.msg.text;

  // SAFE: Wrapped in conversation.external. Only runs once on first pass!
  const orderId = await conversation.external(async () => {
    const res = await database.orders.create({
      userId: ctx.from?.id,
      address,
      created: Date.now(),
    });
    return res.id;
  });

  // SAFE: Deterministic date & random code
  const timestamp = await conversation.now();
  const confirmationCode = Math.floor((await conversation.random()) * 900000) + 100000;

  await ctx.reply(`Order #${orderId} created at ${new Date(timestamp).toISOString()}. Code: ${confirmationCode}`);
}
```

---

## 9. Form Builder Helper (`conversation.form`)

`conversation.form` simplifies gathering structured user inputs:

```typescript
async function survey(conversation: MyConversation, ctx: MyContext) {
  await ctx.reply("What is your name?");
  const name = await conversation.form.text();

  await ctx.reply("How old are you?");
  const age = await conversation.form.number({
    otherwise: (ctx) => ctx.reply("Age must be a number! Try again:"),
  });

  await ctx.reply(`Thank you ${name}, age ${age}!`);
}
```

---

## 10. Controlling Conversation Lifecycle

### Entering Conversations
```typescript
bot.command("start_flow", async (ctx) => {
  await ctx.conversation.enter("flowName");
});
```

### Exiting Conversations Early
```typescript
// From inside conversation:
if (cancelCondition) {
  await ctx.reply("Canceled.");
  return; // Returning from the function exits the conversation
}

// From outside middleware:
bot.command("cancel", async (ctx) => {
  await ctx.conversation.exit("flowName");
  await ctx.reply("Flow aborted.");
});
```

### Checking Active Conversations
```typescript
bot.on("message", async (ctx, next) => {
  const active = await ctx.conversation.active();
  console.log("Currently active conversations:", Object.keys(active));
  await next();
});
```
