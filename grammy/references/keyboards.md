# grammY Keyboards and Menus Reference

> **Verified Version:** grammY `v1.45.1` (`InlineKeyboard`, `Keyboard`, `@grammyjs/menu`)  
> **Source:** `https://grammy.dev/ref/core/keyboard`, `https://grammy.dev/plugins/keyboard`, `https://grammy.dev/plugins/menu`

---

## Table of Contents
- [1. Keyboard Types Overview](#1-keyboard-types-overview)
- [2. Built-in Inline Keyboards (`InlineKeyboard`)](#2-built-in-inline-keyboards-inlinekeyboard)
  - [Layout & Grid Methods (`row`, `add`, `toFlowed`)](#layout--grid-methods-row-add-toflowed)
  - [Button Width & Responsive Long Text Handling](#button-width--responsive-long-text-handling)
- [3. Handling Callback Queries](#3-handling-callback-queries)
- [4. Built-in Custom Keyboards (`Keyboard`)](#4-built-in-custom-keyboards-keyboard)
  - [Layout & Sizing Modifiers (`resized`, `oneTime`, `placeholder`, `persistent`)](#layout--sizing-modifiers-resized-onetime-placeholder-persistent)
  - [Removing Custom Keyboards](#removing-custom-keyboards)
- [5. Interactive Menus Plugin (`@grammyjs/menu`)](#5-interactive-menus-plugin-grammyjsmenu)
- [6. Dynamic Menu Generation with `MenuRange`](#6-dynamic-menu-generation-with-menurange)
- [7. Menu Navigation & Submenus](#7-menu-navigation--submenus)

---

## 1. Keyboard Types Overview

Telegram supports two distinct types of keyboards, which are mutually exclusive in a single message:

| Keyboard Type | Location | Behavior | grammY Class |
| :--- | :--- | :--- | :--- |
| **Inline Keyboard** | Attached underneath a message | Emits `callback_query` updates without sending chat messages | `InlineKeyboard` |
| **Custom Keyboard** | Replaces user's system keyboard | Sends a regular text message or native payload on behalf of user | `Keyboard` |

---

## 2. Built-in Inline Keyboards (`InlineKeyboard`)

The `InlineKeyboard` class builds inline button grids attached directly to messages.

```typescript
import { InlineKeyboard } from "grammy";

// Create keyboard with rows
const inlineKeyboard = new InlineKeyboard()
  .text("Option A", "data_a")
  .text("Option B", "data_b")
  .row() // Force wrap to new row
  .url("Website", "https://grammy.dev")
  .webApp("Open App", "https://example.com/app")
  .row()
  .switchInline("Share Bot", "search query")
  .switchInlineCurrent("Search Here", "filter");

// Send with message
await ctx.reply("Please select an option:", {
  reply_markup: inlineKeyboard,
});
```

### Common `InlineKeyboard` Button Methods
- `.text(text, data)`: Adds callback button sending `data` payload.
- `.url(text, url)`: Adds button opening a web link.
- `.webApp(text, url)`: Launches a Telegram Mini App.
- `.login(text, loginUrl)`: Initiates Telegram Login authorization.
- `.switchInline(text, query?)`: Prompts user to select a chat to share inline query.
- `.switchInlineCurrent(text, query?)`: Inserts bot query into the current chat input.
- `.copyText(text, copyText)`: Copies text to clipboard on tap (Bot API 7.x+).

---

### Layout & Grid Methods (`row`, `add`, `toFlowed`)

1. **`.row()`**: Inserts a line break so all subsequent buttons are placed on a new line.
2. **`.add(...buttons)`**: Appends raw button objects or arrays to the current row.
3. **`.toFlowed(columns: number, options?)`**: Reflows all buttons in the keyboard into a clean, uniform grid with a fixed number of columns.

```typescript
import { InlineKeyboard } from "grammy";

// Reflow flat list of buttons into a 3-column grid
const keyboard = new InlineKeyboard()
  .text("1", "num_1")
  .text("2", "num_2")
  .text("3", "num_3")
  .text("4", "num_4")
  .text("5", "num_5")
  .text("6", "num_6")
  .toFlowed(3); // Result: 2 rows of 3 buttons
```

---

### Button Width & Responsive Long Text Handling

When button text labels are long (e.g. `"📝 Captions: Enabled"` or `"🎞 Media Album Limit: 10"`), placing multiple buttons on the same row causes Telegram mobile clients to truncate the labels with ellipses (`...`).

**Best Practice:**
- Place long action buttons on their own line using `.row()` to give them 100% full width.
- Use multi-column grids (`.toFlowed(2)` or `.toFlowed(3)`) only for short, compact labels (e.g. single numbers, short words, emojis).

```typescript
// Full-width layout for long label buttons
const settingsKeyboard = new InlineKeyboard()
  .text("📝 Captions: Enabled", "toggle_captions")
  .row()
  .text("🎞 Media Album Limit: 10", "set_album_limit")
  .row()
  .text("🔕 Silent Mode: Disabled", "toggle_silent")
  .row()
  .text("❌ Close Menu", "close_settings");
```

---

## 3. Handling Callback Queries

When users click an inline button, Telegram emits a `callback_query` update. Always call `ctx.answerCallbackQuery()` to clear the loading spinner on Telegram clients.

```typescript
// Match exact callback data string
bot.callbackQuery("data_a", async (ctx) => {
  await ctx.answerCallbackQuery({
    text: "Option A selected!",
    show_alert: false, // Set true to show modal dialog instead of toast
  });
  await ctx.editMessageText("You chose Option A.");
});

// Match regex pattern with capture groups
bot.callbackQuery(/^item:(\d+)$/, async (ctx) => {
  const itemId = ctx.match[1];
  await ctx.answerCallbackQuery();
  await ctx.reply(`Viewing item ${itemId}`);
});
```

---

## 4. Built-in Custom Keyboards (`Keyboard`)

The `Keyboard` class replaces the user's software keyboard with customizable buttons that send text messages or trigger device actions.

```typescript
import { Keyboard } from "grammy";

const customKeyboard = new Keyboard()
  .text("Help")
  .text("Settings")
  .row()
  .requestContact("Share Phone")
  .requestLocation("Share Location")
  .row()
  .requestPoll("Create Poll")
  .resized()                          // Resizes keyboard vertically to fit button count
  .oneTime()                          // Auto-hides keyboard after first tap
  .placeholder("Choose an action...") // Hint shown inside text input bar
  .persistent();                      // Keeps keyboard visible during chatting

await ctx.reply("Choose an option:", {
  reply_markup: customKeyboard,
});
```

### Layout & Sizing Modifiers (`resized`, `oneTime`, `placeholder`, `persistent`)
- **`.resized(isResized = true)`**: Requests Telegram to resize the keyboard vertically for an optimal fit (greatly improves mobile UX).
- **`.oneTime(isOneTime = true)`**: Requests Telegram to hide the custom keyboard immediately after a button is pressed.
- **`.placeholder(text)`**: Displays helpful placeholder text inside the input field while the keyboard is active.
- **`.persistent(isPersistent = true)`**: Keeps the custom keyboard open even when regular chat messages are sent.
- **`.selected(isSelective = true)`**: Targets custom keyboard only to specific users (e.g. mentioned users in a group).
- **`.toFlowed(columns)`**: Reflows keyboard buttons into a uniform grid of `N` columns.

### Removing Custom Keyboards
```typescript
await ctx.reply("Keyboard dismissed", {
  reply_markup: { remove_keyboard: true },
});
```

---

## 5. Interactive Menus Plugin (`@grammyjs/menu`)

The `@grammyjs/menu` plugin creates rich stateful menus, handling callback queries, message edits, and navigation automatically.

```bash
npm install @grammyjs/menu
```

```typescript
import { Bot, Context } from "grammy";
import { Menu, MenuFlavor } from "@grammyjs/menu";

export type MyContext = Context & MenuFlavor;

const bot = new Bot<MyContext>("BOT_TOKEN");

// Create menu instance with identifier
const mainMenu = new Menu<MyContext>("main-menu")
  .text("Like 👍", async (ctx) => {
    await ctx.reply("Thank you!");
    ctx.menu.update();
  })
  .text("Dislike 👎", (ctx) => ctx.reply("Sorry to hear that."))
  .row()
  .url("Visit Docs", "https://grammy.dev");

// Register menu with bot BEFORE handlers
bot.use(mainMenu);

bot.command("menu", async (ctx) => {
  await ctx.reply("Welcome to the menu:", {
    reply_markup: mainMenu,
  });
});
```

---

## 6. Dynamic Menu Generation with `MenuRange`

`MenuRange` allows generating button lists dynamically based on session or database arrays.

```typescript
import { Menu, MenuRange } from "@grammyjs/menu";

const productMenu = new Menu<MyContext>("product-menu")
  .dynamic(async (ctx, range) => {
    const products = await fetchProductsFromDb();
    for (const product of products) {
      range
        .text(product.title, async (ctx) => {
          await ctx.reply(`Selected product: ${product.name}`);
        })
        .row();
    }
  })
  .back("Back to Home");

bot.use(productMenu);
```

---

## 7. Menu Navigation & Submenus

Menus can be structured hierarchically with seamless navigation and back buttons.

```typescript
import { Menu } from "@grammyjs/menu";

// Root Menu
const rootMenu = new Menu<MyContext>("root");
// Sub Menu
const settingsMenu = new Menu<MyContext>("settings");

rootMenu
  .text("Status", (ctx) => ctx.reply("All systems operational."))
  .submenu("Settings ⚙️", "settings"); // Transition to submenu

settingsMenu
  .text("Toggle Notifications", async (ctx) => {
    ctx.session.notifications = !ctx.session.notifications;
    ctx.menu.update();
  })
  .row()
  .back("⬅️ Back"); // Return to parent menu

// Register submenu into root menu, then register root menu with bot
rootMenu.register(settingsMenu);
bot.use(rootMenu);
```
