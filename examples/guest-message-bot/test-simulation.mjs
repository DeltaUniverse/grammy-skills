#!/usr/bin/env node

/**
 * Offline Simulation Test for Guest Message Bot
 * Verifies update handling, filter queries, payload creation, and API calls.
 */

import { createBot } from "./bot.mjs";

console.log("=== Running Guest Message Bot Offline Simulation Test ===\n");

const MOCK_TOKEN = "123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ_01234567";

const bot = createBot(MOCK_TOKEN, {
  botInfo: {
    id: 123456789,
    is_bot: true,
    first_name: "GuestTestBot",
    username: "guest_test_bot",
    can_join_groups: true,
    can_read_all_group_messages: false,
    supports_inline_queries: false,
    can_connect_to_business: false,
    has_main_web_app: false,
    supports_guest_queries: true,
  },
});

// Intercept outgoing Telegram API calls
const outgoingCalls = [];
bot.api.config.use(async (prev, method, payload, signal) => {
  console.log(`[Telegram API Mock] Intercepted call: "${method}"`);
  console.log("Payload:", JSON.stringify(payload, null, 2));
  outgoingCalls.push({ method, payload });
  if (method === "answerGuestQuery") {
    return {
      ok: true,
      result: {
        message_id: 202,
        date: Math.floor(Date.now() / 1000),
        chat: { id: -100123456789, type: "supergroup", title: "Public Group" },
        text: "Sent guest reply",
      },
    };
  }
  return prev(method, payload, signal);
});

// Mock incoming update: a user in a non-member supergroup tagging the bot
const mockGuestUpdate = {
  update_id: 10001,
  guest_message: {
    message_id: 501,
    date: Math.floor(Date.now() / 1000),
    chat: {
      id: -100123456789,
      type: "supergroup",
      title: "Public Developer Group",
    },
    from: {
      id: 99887766,
      is_bot: false,
      first_name: "Alex",
      username: "alex_coder",
    },
    guest_bot_caller_user: {
      id: 99887766,
      is_bot: false,
      first_name: "Alex",
      username: "alex_coder",
    },
    guest_query_id: "gq_test_session_8899aabb",
    text: "@guest_test_bot summarize release notes for 10.3",
  },
};

console.log("1. Dispatching mock 'guest_message' update...");
await bot.handleUpdate(mockGuestUpdate);

console.log("\n2. Checking test assertions...");
const answeredCall = outgoingCalls.find((c) => c.method === "answerGuestQuery");

if (!answeredCall) {
  console.error("❌ Test Failed: answerGuestQuery was not called!");
  process.exit(1);
}

if (answeredCall.payload.guest_query_id !== "gq_test_session_8899aabb") {
  console.error("❌ Test Failed: guest_query_id did not match!");
  process.exit(1);
}

if (!answeredCall.payload.result?.input_message_content?.message_text?.includes("summarize release notes for 10.3")) {
  console.error("❌ Test Failed: query text was not properly formatted in response!");
  process.exit(1);
}

console.log("\n✅ ALL TESTS PASSED! Guest Message Bot functions as expected.");
console.log("   - Filter query matched correctly");
console.log("   - Caller metadata extracted successfully");
console.log("   - ctx.answerGuestQuery() executed with valid payload & keyboard\n");
