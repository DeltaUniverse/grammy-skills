import { Bot } from "grammy";
import dotenv from "dotenv";

dotenv.config();

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error("❌ ERROR: BOT_TOKEN is not set in environment or .env file.");
  process.exit(1);
}

const bot = new Bot(token);

// 1. /start command
bot.command("start", async (ctx) => {
  await ctx.reply(
    "👋 <b>Welcome to the Rich Media Bot!</b>\n\n" +
    "Try these commands:\n" +
    "• /slideshow - Media Album with interactive buttons (<tg-slideshow>)\n" +
    "• /collage - Photo collage grid with buttons (<tg-collage>)\n" +
    "• /richdoc - Full Rich Markdown report (tables, math, details)",
    { parse_mode: "HTML" }
  );
});

// 2. /slideshow command: Media album + inline buttons (Markdown style)
bot.command("slideshow", async (ctx) => {
  const slideshowMarkdown = `
# 🌄 Scenic Alps Expedition
Swipe through our high-altitude highlights:

<tg-slideshow>

![](https://images.unsplash.com/photo-1464822759023-fed622ff2c3b "Summit Panorama (3,842m)")
![](https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99 "Alpine Lake Trail")
![](https://images.unsplash.com/photo-1506744038136-46273834b3fb "Sunset Over Ridge")

</tg-slideshow>

<tg-button-row align="center">
  <tg-button type="callback_data" style="primary" data="exp:details">ℹ️ Trail Details</tg-button>
  <tg-button type="callback_data" style="success" data="exp:book">🎟️ Book Tour</tg-button>
</tg-button-row>
<tg-button-row align="center">
  <tg-button type="url" url="https://t.me/telegram">📢 Join Community</tg-button>
</tg-button-row>
`;

  await ctx.api.raw.sendRichMessage({
    chat_id: ctx.chat.id,
    rich_message: {
      markdown: slideshowMarkdown,
    },
  });
});

// 3. /collage command: Photo collage grid + buttons (HTML style)
bot.command("collage", async (ctx) => {
  const collageHtml = `
<h2>🎨 Weekly Art Spotlight</h2>
<p>Curated community entries for this week:</p>

<tg-collage>
  <img src="https://images.unsplash.com/photo-1579783900882-c0d3dad7b119" />
  <img src="https://images.unsplash.com/photo-1579783902614-a3fb3927b675" />
  <figcaption>Spotlight Gallery • Curated by ArtBot</figcaption>
</tg-collage>

<tg-button-row align="center">
  <tg-button type="callback_data" style="success" data="art:vote:1">❤️ Vote #1</tg-button>
  <tg-button type="callback_data" style="success" data="art:vote:2">❤️ Vote #2</tg-button>
</tg-button-row>
`;

  await ctx.api.raw.sendRichMessage({
    chat_id: ctx.chat.id,
    rich_message: {
      html: collageHtml,
    },
  });
});

// 4. Callback query handlers
bot.callbackQuery("exp:details", async (ctx) => {
  await ctx.answerCallbackQuery({
    text: "Elevation: 3,842m | Difficulty: Moderate | Season: July - Sept",
    show_alert: true,
  });
});

bot.callbackQuery("exp:book", async (ctx) => {
  await ctx.answerCallbackQuery({ text: "Opening booking portal..." });
  await ctx.reply("🎫 Reservation portal: https://example.com/expedition-booking");
});

bot.callbackQuery(/^art:vote:(\d+)$/, async (ctx) => {
  const item = ctx.match[1];
  await ctx.answerCallbackQuery({
    text: `Your vote for Artwork #${item} has been recorded!`,
    show_alert: false,
  });
});

// Global error handler
bot.catch((err) => {
  console.error(`Error in update ${err.ctx.update.update_id}:`, err.error);
});

console.log("🚀 Rich Slideshow Bot started!");
bot.start();
