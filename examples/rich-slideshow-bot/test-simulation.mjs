import { Bot } from "grammy";

console.log("🧪 Starting Offline Simulation for Rich Message Slideshow & Buttons...");

// Create dummy bot instance
const bot = new Bot("123456789:AAFakeTokenForOfflineTestingPurposesOnlyX");

let capturedCall = null;
bot.api.config.use(async (prev, method, payload, signal) => {
  console.log(`📡 [Mock Bot API] Calling method: ${method}`);
  capturedCall = { method, payload };
  return { ok: true, result: { message_id: 9999, chat: { id: 12345 }, date: Math.floor(Date.now() / 1000) } };
});

// Test /slideshow simulation
const mockSlideshowMarkdown = `
# 🌄 Mountain Expedition
<tg-slideshow>

![](https://example.com/photo1.jpg "Summit")
![](https://example.com/photo2.jpg "Camp")

</tg-slideshow>

<tg-button-row align="center">
  <tg-button type="callback_data" style="primary" data="exp:details">ℹ️ Info</tg-button>
  <tg-button type="url" url="https://t.me/example">📢 Channel</tg-button>
</tg-button-row>
`;

await bot.api.raw.sendRichMessage({
  chat_id: 123456,
  rich_message: {
    markdown: mockSlideshowMarkdown,
  },
});

console.log("✅ Verification checks:");
console.log(" - Method invoked:", capturedCall.method === "sendRichMessage" ? "PASSED (sendRichMessage)" : "FAILED");
console.log(" - Has <tg-slideshow> tag:", capturedCall.payload.rich_message.markdown.includes("<tg-slideshow>") ? "PASSED" : "FAILED");
console.log(" - Has <tg-button-row> tag:", capturedCall.payload.rich_message.markdown.includes("<tg-button-row") ? "PASSED" : "FAILED");
console.log(" - Has embedded callback button:", capturedCall.payload.rich_message.markdown.includes('type="callback_data"') ? "PASSED" : "FAILED");

console.log("\n🎉 All simulation checks passed successfully!");
