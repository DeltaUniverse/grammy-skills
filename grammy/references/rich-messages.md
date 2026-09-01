# grammY Rich Formatting, Tables, Keyboards & Streaming Reference

> **Verified Version:** grammY `v1.46.0` (with Bot API 10.0–10.3 & grammY 2.0 Roadmap)  
> **Source:** `https://grammy.dev/guide/basics`, `https://grammy.dev/plugins/keyboard`, `https://grammy.dev/plugins/parse-mode`, `https://grammy.dev/plugins/format`

---

## Table of Contents
- [1. Message Formatting in Telegram & grammY](#1-message-formatting-in-telegram--grammy)
- [2. HTML Parse Mode (`parse_mode: "HTML"`)](#2-html-parse-mode-parse_mode-html)
  - [Supported HTML Tags (Classic)](#supported-html-tags-classic)
  - [Safe HTML Escaping Utility](#safe-html-escaping-utility)
  - [Link Preview Control (`link_preview_options`)](#link-preview-control-link_preview_options)
- [3. Telegram Bot API 10.1–10.3 Rich Messages & Formatting](#3-telegram-bot-api-101103-rich-messages--formatting)
  - [Overview & Limits](#overview--limits)
  - [Rich Markdown Style Reference](#rich-markdown-style-reference)
  - [Rich HTML Style Reference](#rich-html-style-reference)
  - [Embedded Buttons (`<tg-button>` & `<tg-button-row>`)](#embedded-buttons-tg-button--tg-button-row)
  - [Streaming AI Drafts & Thinking Block (`<tg-thinking>`)](#streaming-ai-drafts--thinking-block-tg-thinking)
- [4. Media Albums: Conventional `sendMediaGroup` vs Rich `<tg-slideshow>` / `<tg-collage>`](#4-media-albums-conventional-sendmediagroup-vs-rich-tg-slideshow--tg-collage)
  - [The Critical Difference: Buttons on Media Albums](#the-critical-difference-buttons-on-media-albums)
  - [When to Use What](#when-to-use-what)
  - [Attaching Local & Remote Files via `tg://...` Links](#attaching-local--remote-files-via-tg-links)
- [5. Type-Safe Formatting Plugins](#5-type-safe-formatting-plugins)
  - [`@grammyjs/format` (JSX-like Builder)](#grammyjsformat-jsx-like-builder)
  - [`@grammyjs/parse-mode` (Hydrated Reply Shortcuts)](#grammyjsparse-mode-hydrated-reply-shortcuts)
- [6. Monospace Tables vs Native Rich Tables](#6-monospace-tables-vs-native-rich-tables)
  - [A. Native Rich Table (`<table>` / Markdown Table)](#a-native-rich-table-table--markdown-table)
  - [B. Monospace ASCII `<pre>` Code Block (Classic fallback)](#b-monospace-ascii-pre-code-block-classic-fallback)
- [7. Inline Keyboards (`InlineKeyboard`) & Callback Lifecycle](#7-inline-keyboards-inlinekeyboard--callback-lifecycle)
- [8. Production Implementation Recipes](#8-production-implementation-recipes)
  - [Recipe A: Media Album / Slideshow with Interactive Buttons (Remote URLs)](#recipe-a-media-album--slideshow-with-interactive-buttons-remote-urls)
  - [Recipe B: Rich Media Slideshow with Local File Uploads (`InputFile`)](#recipe-b-rich-media-slideshow-with-local-file-uploads-inputfile)
  - [Recipe C: Interactive Collage Card with Action Row](#recipe-c-interactive-collage-card-with-action-row)
  - [Recipe D: Full Rich Markdown Report with Nested Details, Math & Footnotes](#recipe-d-full-rich-markdown-report-with-nested-details-math--footnotes)
  - [Recipe E: Real-Time AI Streaming with Drafts & Thinking Block](#recipe-e-real-time-ai-streaming-with-drafts--thinking-block)

---

## 1. Message Formatting in Telegram & grammY

Telegram Bot API provides two primary ways to format text:
1. **Classic Message Formatting (`sendMessage` / `ctx.reply`):** Uses `parse_mode: "HTML"`, `"MarkdownV2"`, or message entities. Supports basic styling (bold, italic, spoiler, expandable blockquote, custom emoji).
2. **Rich Messages (`sendRichMessage` / `sendRichMessageDraft`):** Introduced in **Bot API 10.1–10.3**. Uses structured `InputRichMessage` with native headings, tables, collages, slideshows, collapsible details, math formulas, embedded buttons, and local media bindings.

### Formatting Strategies Matrix

| Strategy | Capabilities | Inline Buttons | Best Use Case |
| :--- | :--- | :--- | :--- |
| **`sendRichMessage` (Markdown / HTML)** | Headings, Slideshows, Collages, Tables, Math, Details, Embedded Buttons | ✅ Embedded `<tg-button>` OR `reply_markup` | **Media albums with buttons, AI streaming, complex cards, dashboards** |
| **`parse_mode: "HTML"` (Classic)** | Bold, italic, code, blockquotes, spoilers, custom emojis | ✅ via `reply_markup: InlineKeyboard` | Standard text replies, simple notifications |
| **`sendMediaGroup` (Conventional)** | Photo/video grouped bubbles (up to 10 items) | ❌ **NOT Supported** by Telegram API | Simple photo batches where NO buttons are needed |
| **`@grammyjs/format`** | Type-safe templating without manual escaping | ✅ via `reply_markup: InlineKeyboard` | Safe dynamic text rendering in classic messages |

---

## 2. HTML Parse Mode (`parse_mode: "HTML"`)

HTML remains the standard for classic Telegram text replies.

### Supported HTML Tags (Classic)

| Tag | Purpose | Example |
| :--- | :--- | :--- |
| `<b>`, `<strong>` | Bold header or emphasized text | `<b>System Status</b>` |
| `<i>`, `<em>` | Italicized subtitle or caption | `<i>Updated 2 mins ago</i>` |
| `<u>`, `<ins>` | Underlined text | `<u>Attention</u>` |
| `<s>`, `<strike>`, `<del>` | Strikethrough text | `<s>Original: $100</s>` |
| `<tg-spoiler>` | Concealed spoiler content | `<tg-spoiler>Secret OTP: 1234</tg-spoiler>` |
| `<a href="...">` | Embedded inline hyperlink | `<a href="https://grammy.dev">grammY Docs</a>` |
| `<code>` | Monospace inline snippet | `<code>npm install grammy</code>` |
| `<pre>` | Multi-line code block | `<pre><code class="language-typescript">const x = 1;</code></pre>` |
| `<blockquote>` | Quoted message block | `<blockquote>Quoted note</blockquote>` |
| `<blockquote expandable>` | Collapsible / expandable blockquote | `<blockquote expandable>Long changelog...</blockquote>` |
| `<tg-emoji emoji-id="...">` | Custom animated Telegram emoji | `<tg-emoji emoji-id="5368324170671202286">👍</tg-emoji>` |

### Safe HTML Escaping Utility

```typescript
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
```

### Link Preview Control (`link_preview_options`)

```typescript
await ctx.reply(`Check our guide: <a href="https://grammy.dev">grammY Docs</a>`, {
  parse_mode: "HTML",
  link_preview_options: {
    is_disabled: false,
    prefer_small_media: true,
    show_above_text: false,
  },
});
```

---

## 3. Telegram Bot API 10.1–10.3 Rich Messages & Formatting

Telegram Bot API 10.1–10.3 allows bots to construct rich interactive documents using `sendRichMessage` and `sendRichMessageDraft`.

### Overview & Limits
- **Length limit:** Up to **32,768 UTF-8 characters** in the rich message text.
- **Block limit:** Up to **500 blocks** (nested blocks, list items, table rows, details, quotes).
- **Nesting limit:** Up to **16 levels** of nested formatting.
- **Media attachments:** Up to **50 media attachments** in total.
- **Table width:** Up to **20 columns** in a table.

---

### Rich Markdown Style Reference

Pass the markdown payload in `rich_message: { markdown: "..." }`.

```markdown
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

Paragraph text with **bold**, _italic_, ~~strikethrough~~, `code`, ==marked text==, and ||spoiler||.

[inline URL](https://t.me/)
[inline e-mail](mailto:user@example.com)
[inline phone](tel:+123456789)
[inline mention](tg://user?id=123456789)
![👍](tg://emoji?id=5368324170671202286)
![22:45 tomorrow](tg://time?unix=1647531900&format=wDT)
$x^2 + y^2$

```python
print("Preformatted code block")
```

---

- unordered list item 1
- unordered list item 2

1. ordered list item 1
2. ordered list item 2

- [ ] task list unchecked
- [x] completed task list item

> Block quotation line 1
> Block quotation line 2

| Header 1 | Header 2 |
|:---------|:--------:|
| left     | center   |

Text with a reference[^note1].

[^note1]: Definition of the footnote.

$$E = mc^2$$

<details open><summary>Expandable Details with **Markdown**</summary>

- Item A
- Item B with ||hidden secret||

</details>

<tg-slideshow>

![](https://example.com/photo1.jpg "Slide 1 Caption")
![](https://example.com/photo2.jpg "Slide 2 Caption")

</tg-slideshow>

<tg-collage>

![](https://example.com/item1.jpg)
![](https://example.com/item2.jpg)

</tg-collage>
```

---

### Rich HTML Style Reference

Pass the HTML payload in `rich_message: { html: "..." }`.

```html
<h1>Heading 1</h1>
<h2>Heading 2</h2>
<h3>Heading 3</h3>

<p>Paragraph with <b>bold</b>, <i>italic</i>, <u>underlined</u>, <s>strikethrough</s>, <mark>marked</mark>, <tg-spoiler>spoiler</tg-spoiler>, <code>code</code>, <sub>subscript</sub>, <sup>superscript</sup>.</p>

<p>Custom emoji: <tg-emoji emoji-id="5368324170671202286">👍</tg-emoji></p>
<p>Time entity: <tg-time unix="1647531900" format="wDT">22:45 tomorrow</tg-time></p>
<tg-math-block>E = mc^2</tg-math-block>

<hr/>

<ul>
  <li>Unordered item</li>
  <li><input type="checkbox" checked> Completed task</li>
  <li><input type="checkbox"> Pending task</li>
</ul>

<ol start="1" type="1">
  <li>Ordered item 1</li>
  <li>Ordered item 2</li>
</ol>

<blockquote>Standard blockquote<cite>Author</cite></blockquote>
<blockquote expandable>Expandable quote content<cite>Author</cite></blockquote>
<aside>Pull quote text<cite>Author</cite></aside>

<details open>
  <summary>Collapsible Section Title</summary>
  <p>Detailed body content rendered cleanly inside Telegram.</p>
</details>

<tg-map lat="41.9028" long="12.4964" zoom="14"/>

<table bordered striped compact>
  <caption>Financial Summary</caption>
  <tr><th>Asset</th><th>Allocation</th><th>Return</th></tr>
  <tr><td>BTC</td><td>40%</td><td>+12.4%</td></tr>
  <tr><td>ETH</td><td>30%</td><td>+8.1%</td></tr>
  <tr><td>SOL</td><td>30%</td><td>+24.5%</td></tr>
</table>

<!-- Media & Albums -->
<figure>
  <img src="https://example.com/photo.jpg" tg-spoiler/>
  <figcaption>Cover photo <cite>Photo credit</cite></figcaption>
</figure>

<tg-slideshow>
  <img src="https://example.com/photo1.jpg"/>
  <video src="https://example.com/video1.mp4"></video>
  <figcaption>Slideshow album caption <cite>Photographer</cite></figcaption>
</tg-slideshow>

<tg-collage>
  <img src="https://example.com/item1.jpg"/>
  <img src="https://example.com/item2.jpg"/>
  <figcaption>Collage gallery</figcaption>
</tg-collage>

<!-- Embedded Interactive Buttons -->
<tg-button-row align="center">
  <tg-button type="callback_data" style="primary" data="album:prev">◀️ Prev</tg-button>
  <tg-button type="callback_data" style="primary" data="album:next">Next ▶️</tg-button>
</tg-button-row>
<tg-button-row align="center">
  <tg-button type="url" style="success" url="https://example.com">🌐 View Full Gallery</tg-button>
</tg-button-row>
```

---

### Embedded Buttons (`<tg-button>` & `<tg-button-row>`)

Rich messages support embedding buttons **directly into the HTML/Markdown layout** without needing external keyboard structures.

#### Supported Button Attributes:
- `type`:
  - `"url"`: Opens URL (`url="https://..."` or `url="tg://user?id=..."`).
  - `"callback_data"`: Emits callback query update (`data="callback_payload"`).
  - `"web_app"`: Opens Telegram Mini App (`url="https://..."`, private chats only).
  - `"copy_text"`: Copies text to user clipboard (`text="copied content"`).
  - `"switch_inline_query"`: Opens inline query picker (`query="..."`).
  - `"switch_inline_query_current_chat"`: Inline query in current chat (`query="..."`).
  - `"switch_inline_query_chosen_chat"`: Inline query in chosen chat with filters.
  - `"login_url"`: Telegram authorization widget.
  - `"disabled"`: Visual non-clickable button state.
- `style`: `"primary"` (bold accent), `"success"` (green), `"danger"` (red), `"link"` (text link style).
- `<tg-button-row align="left|center|right">`: Groups buttons horizontally with alignment control.

---

### Streaming AI Drafts & Thinking Block (`<tg-thinking>`)

For LLMs and streaming AI responses, Bot API 10.1–10.3 provides `sendRichMessageDraft`:
- Ephemeral 30-second animated live stream.
- Supports `<tg-thinking>Thinking through reasoning steps...</tg-thinking>`.
- Allows `can_stop: true` to display a user "Stop Generation" button.

```typescript
// Stream partial reasoning draft
await ctx.api.raw.sendRichMessageDraft({
  chat_id: ctx.chat.id,
  draft_id: 101,
  can_stop: true,
  rich_message: {
    html: `<tg-thinking>Analyzing query and querying vector database...</tg-thinking>`,
  },
});
```

---

## 4. Media Albums: Conventional `sendMediaGroup` vs Rich `<tg-slideshow>` / `<tg-collage>`

### The Critical Difference: Buttons on Media Albums

> [!IMPORTANT]
> **Why `sendMediaGroup` Fails for Albums With Buttons:**  
> In Telegram Bot API, the `sendMediaGroup` method **strictly forbids attaching inline keyboards** (`reply_markup`). Calling `sendMediaGroup` with an `InlineKeyboard` causes Telegram API error: `400: Bad Request: reply_markup is not supported in sendMediaGroup`.

### When to Use What

| Requirement | Conventional `sendMediaGroup` | Rich `<tg-slideshow>` / `<tg-collage>` |
| :--- | :--- | :--- |
| **Media Album WITHOUT buttons** | ✅ Good for simple static photo batches | ✅ Also supported |
| **Media Album WITH buttons / interactive UI** | ❌ **IMPOSSIBLE** (API rejection) | ✅ **RECOMMENDED SOLUTION** (`sendRichMessage`) |
| **Swipeable Carousel / Slideshow UI** | ❌ Displays as separate grouped bubble grid | ✅ **Native swiper / slideshow presentation** |
| **Collage presentation** | ❌ Default static tile group | ✅ **`<tg-collage>` native tile collage** |
| **Rich Captions with Headings, Tables, Spoilers** | ❌ Limited to single string caption | ✅ **Full rich HTML/Markdown structure** |

---

### Attaching Local & Remote Files via `tg://...` Links

Rich message tags (`<img src="...">`, `<video src="...">`, `![](...)`) support:
1. **Remote HTTPS URLs:** Directly reference any public image/video URL.
2. **Local Uploaded Files / File IDs:** Use the `tg://photo?id=IDENTIFIER` syntax and map them in the `media` array using grammY `InputFile`.

```typescript
import { InputFile } from "grammy";

await ctx.api.raw.sendRichMessage({
  chat_id: ctx.chat.id,
  rich_message: {
    html: `
      <h2>📸 Product Showcase</h2>
      <tg-slideshow>
        <img src="tg://photo?id=slide1" />
        <img src="tg://photo?id=slide2" />
        <figcaption>Explore our latest spring collection</figcaption>
      </tg-slideshow>
      <tg-button-row align="center">
        <tg-button type="callback_data" style="primary" data="buy:collection">🛍️ Order Now</tg-button>
        <tg-button type="url" url="https://shop.example.com">🌐 Website</tg-button>
      </tg-button-row>
    `,
    media: [
      {
        id: "slide1",
        media: { type: "photo", media: new InputFile("./assets/slide1.jpg") },
      },
      {
        id: "slide2",
        media: { type: "photo", media: new InputFile("./assets/slide2.jpg") },
      },
    ],
  },
});
```

---

## 5. Type-Safe Formatting Plugins

### `@grammyjs/format` (JSX-like Builder)

```typescript
import { fmt, bold, italic, code, link, spoiler } from "@grammyjs/format";

bot.command("info", async (ctx) => {
  const text = fmt`
${bold("User Profile")}
• Name: ${ctx.from?.first_name}
• ID: ${code(ctx.from?.id.toString())}
• Status: ${italic("Active")}
• Secret: ${spoiler("VIP-2026")}

Read more at ${link("Official Guide", "https://grammy.dev")}`;

  await ctx.reply(text);
});
```

### `@grammyjs/parse-mode` (Hydrated Reply Shortcuts)

```typescript
import { hydrateReply, parseMode } from "@grammyjs/parse-mode";
import type { ParseModeFlavor } from "@grammyjs/parse-mode";

type MyContext = ParseModeFlavor<Context>;
const bot = new Bot<MyContext>("BOT_TOKEN");

bot.api.config.use(parseMode("HTML"));
bot.use(hydrateReply);

bot.command("start", async (ctx) => {
  await ctx.replyWithHTML("<b>Welcome</b> to our bot!");
});
```

---

## 6. Monospace Tables vs Native Rich Tables

### A. Native Rich Table (`<table>` / Markdown Table)

Use when sending via `sendRichMessage`:

```html
<table bordered striped compact>
  <caption>Monthly Server Costs</caption>
  <tr><th>Region</th><th>Instances</th><th>Cost</th></tr>
  <tr><td>US-East</td><td>4</td><td>$160.00</td></tr>
  <tr><td>EU-Central</td><td>2</td><td>$80.00</td></tr>
</table>
```

### B. Monospace ASCII `<pre>` Code Block (Classic fallback)

Use when sending standard `ctx.reply` with `parse_mode: "HTML"`:

```typescript
export function formatMonospaceTable(headers: string[], rows: string[][]): string {
  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length))
  );

  const formatRow = (row: string[]) =>
    row.map((cell, i) => (cell ?? "").padEnd(colWidths[i])).join(" │ ");

  const separator = colWidths.map((w) => "─".repeat(w)).join("─┼─");

  return [
    "<pre>",
    formatRow(headers),
    separator,
    ...rows.map(formatRow),
    "</pre>",
  ].join("\n");
}
```

---

## 7. Inline Keyboards (`InlineKeyboard`) & Callback Lifecycle

```typescript
import { InlineKeyboard } from "grammy";

const keyboard = new InlineKeyboard()
  .url("📖 Docs", "https://grammy.dev")
  .text("🔄 Refresh", "stats:refresh")
  .row()
  .webApp("🚀 Open App", "https://app.example.com")
  .copyText("📋 Copy Code", "INVITE-2026-X");

bot.callbackQuery("stats:refresh", async (ctx) => {
  // Always answer immediately to clear loading state
  await ctx.answerCallbackQuery({ text: "Refreshed!" });
  // Update UI...
});
```

---

## 8. Production Implementation Recipes

### Recipe A: Media Album / Slideshow with Interactive Buttons (Remote URLs)

```typescript
import { Composer, Context } from "grammy";

export const mediaAlbumFeature = new Composer<Context>();

mediaAlbumFeature.command("gallery", async (ctx) => {
  const slideshowMarkdown = `
# 🌄 Scenic Mountain Expedition
Swipe through our high-altitude highlights from the Alps expedition:

<tg-slideshow>

![](https://images.unsplash.com/photo-1464822759023-fed622ff2c3b "Summit Panorama")
![](https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99 "Alpine Lake Trail")
![](https://images.unsplash.com/photo-1506744038136-46273834b3fb "Sunset Valley")

</tg-slideshow>

<tg-button-row align="center">
  <tg-button type="callback_data" style="primary" data="gallery:details">📋 Trail Info</tg-button>
  <tg-button type="callback_data" style="success" data="gallery:book">🎟️ Book Tour</tg-button>
</tg-button-row>
<tg-button-row align="center">
  <tg-button type="url" url="https://t.me/example_channel">📢 Join Channel</tg-button>
</tg-button-row>
`;

  await ctx.api.raw.sendRichMessage({
    chat_id: ctx.chat.id,
    rich_message: {
      markdown: slideshowMarkdown,
    },
  });
});

mediaAlbumFeature.callbackQuery("gallery:details", async (ctx) => {
  await ctx.answerCallbackQuery({
    text: "Elevation: 3,842m | Difficulty: Moderate | Duration: 4 Days",
    show_alert: true,
  });
});

mediaAlbumFeature.callbackQuery("gallery:book", async (ctx) => {
  await ctx.answerCallbackQuery({ text: "Opening booking form..." });
  await ctx.reply("🎫 Visit our booking portal at: https://example.com/tours");
});
```

---

### Recipe B: Rich Media Slideshow with Local File Uploads (`InputFile`)

```typescript
import { Composer, Context, InputFile } from "grammy";
import * as path from "path";

export const localAlbumFeature = new Composer<Context>();

localAlbumFeature.command("catalog", async (ctx) => {
  const htmlSlideshow = `
<h2>👗 New Season Catalog</h2>
<p>Swipe through items and tap to inspect details:</p>

<tg-slideshow>
  <img src="tg://photo?id=item1" />
  <img src="tg://photo?id=item2" />
  <figcaption>Spring / Summer Designer Collection</figcaption>
</tg-slideshow>

<tg-button-row align="center">
  <tg-button type="callback_data" style="primary" data="item:1:info">🔍 Item 1</tg-button>
  <tg-button type="callback_data" style="primary" data="item:2:info">🔍 Item 2</tg-button>
</tg-button-row>
<tg-button-row align="center">
  <tg-button type="copy_text" text="SUMMER-2026-DISCOUNT">🎁 Copy Coupon</tg-button>
</tg-button-row>
`;

  await ctx.api.raw.sendRichMessage({
    chat_id: ctx.chat.id,
    rich_message: {
      html: htmlSlideshow,
      media: [
        {
          id: "item1",
          media: {
            type: "photo",
            media: new InputFile(path.resolve("./assets/item1.jpg")),
          },
        },
        {
          id: "item2",
          media: {
            type: "photo",
            media: new InputFile(path.resolve("./assets/item2.jpg")),
          },
        },
      ],
    },
  });
});
```

---

### Recipe C: Interactive Collage Card with Action Row

```typescript
import { Composer, Context } from "grammy";

export const collageFeature = new Composer<Context>();

collageFeature.command("collage", async (ctx) => {
  const htmlContent = `
<h2>🎨 Featured Artwork Showcase</h2>
<p>Curated weekly picks from community artists:</p>

<tg-collage>
  <img src="https://images.unsplash.com/photo-1579783900882-c0d3dad7b119" />
  <img src="https://images.unsplash.com/photo-1579783902614-a3fb3927b675" />
  <figcaption>Weekly Spotlight • Curated by ArtBot</figcaption>
</tg-collage>

<tg-button-row align="center">
  <tg-button type="callback_data" style="success" data="art:vote:1">❤️ Vote #1</tg-button>
  <tg-button type="callback_data" style="success" data="art:vote:2">❤️ Vote #2</tg-button>
</tg-button-row>
`;

  await ctx.api.raw.sendRichMessage({
    chat_id: ctx.chat.id,
    rich_message: {
      html: htmlContent,
    },
  });
});
```

---

### Recipe D: Full Rich Markdown Report with Nested Details, Math & Footnotes

```typescript
import { Composer, Context } from "grammy";

export const reportFeature = new Composer<Context>();

reportFeature.command("report", async (ctx) => {
  const markdownReport = `
# 📈 System Architecture & Health Report
Generated on: ![Now](tg://time?unix=${Math.floor(Date.now() / 1000)}&format=wDT)

## 📊 Core Performance Metrics

| Service | Status | Latency | SLA |
|:--------|:------:|--------:|:---:|
| API Gateway | 🟢 Up | \`14ms\` | 99.9% |
| DB Cluster | 🟢 Up | \`3ms\` | 99.99% |
| Cache Store | 🟢 Up | \`1ms\` | 100% |

### 🔬 Theoretical Max Throughput
Calculated via Little's Law:
$$L = \\lambda W$$

<details open><summary>📋 <b>Active Maintenance Checklist</b></summary>

- [x] Rotate Redis authentication tokens
- [x] SSL certificate auto-renew verified
- [ ] Purge temporary export snapshots

</details>

For more architecture details, consult our specification[^spec].

[^spec]: Internal RFC-2026: Distributed Message Queue and Sharding Strategy.

<tg-button-row align="center">
  <tg-button type="callback_data" style="primary" data="report:refresh">🔄 Refresh</tg-button>
  <tg-button type="url" style="link" url="https://status.internal">🌐 Live Dashboard</tg-button>
</tg-button-row>
`;

  await ctx.api.raw.sendRichMessage({
    chat_id: ctx.chat.id,
    rich_message: {
      markdown: markdownReport,
    },
  });
});
```

---

### Recipe E: Real-Time AI Streaming with Drafts & Thinking Block

```typescript
import { Composer, Context } from "grammy";

export const aiFeature = new Composer<Context>();

aiFeature.command("ask", async (ctx) => {
  const query = ctx.match;
  if (!query) return ctx.reply("Please enter a question.");

  const draftId = Math.floor(Math.random() * 1000000) + 1;

  // 1. Send live thinking draft
  await ctx.api.raw.sendRichMessageDraft({
    chat_id: ctx.chat.id,
    draft_id: draftId,
    can_stop: true,
    rich_message: {
      html: `
        <h3>🤖 AI Reasoning</h3>
        <tg-thinking>Formulating solution and validating constraints...</tg-thinking>
      `,
    },
  });

  // Simulate inference delay
  await new Promise((r) => setTimeout(r, 1200));

  // 2. Send finalized rich response
  await ctx.api.raw.sendRichMessage({
    chat_id: ctx.chat.id,
    rich_message: {
      html: `
        <h3>💡 Solution for: <i>${escapeHtml(query)}</i></h3>
        <p>Here is the structured solution:</p>
        <pre><code class="language-typescript">export function solve() {\n  return "Optimized Output";\n}</code></pre>
        <blockquote expandable>Key Insight: Time complexity reduced to O(log n).</blockquote>
        <tg-button-row align="center">
          <tg-button type="copy_text" text="export function solve() { return 'Optimized Output'; }">📋 Copy Code</tg-button>
          <tg-button type="callback_data" style="link" data="ai:feedback">👍 Helpful</tg-button>
        </tg-button-row>
      `,
    },
  });
});

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
```

