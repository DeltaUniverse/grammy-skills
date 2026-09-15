#!/usr/bin/env node

/**
 * Offline Simulation Test for Ephemeral Bot
 * Verifies ephemeral parameters, two-way commands, overlay replacement,
 * ephemeral text editing, and ephemeral message deletion.
 */

import { createBot } from "./bot.mjs";

console.log("=== Running Ephemeral Bot Offline Simulation Test ===\n");

const MOCK_TOKEN = "123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ_01234567";

const bot = createBot(MOCK_TOKEN, {
  botInfo: {
    id: 123456789,
    is_bot: true,
    first_name: "EphemeralTestBot",
    username: "ephemeral_test_bot",
    can_join_groups: true,
    can_read_all_group_messages: true,
    supports_inline_queries: false,
    can_connect_to_business: false,
    has_main_web_app: false,
  },
});

// Intercept Telegram Bot API calls
const outgoingCalls = [];
bot.api.config.use(async (prev, method, payload, signal) => {
  console.log(`[Telegram API Mock] Call: "${method}"`);
  outgoingCalls.push({ method, payload });

  if (method === "sendMessage") {
    return {
      ok: true,
      result: {
        message_id: 101,
        date: Math.floor(Date.now() / 1000),
        chat: { id: payload.chat_id, type: "supergroup", title: "Test Supergroup" },
        text: payload.text,
      },
    };
  }

  if (method === "editEphemeralMessageText" || method === "deleteEphemeralMessage") {
    return { ok: true, result: true };
  }

  if (method === "answerCallbackQuery") {
    return { ok: true, result: true };
  }

  return prev(method, payload, signal);
});

async function runTests() {
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✔ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✖ FAIL: ${message}`);
      process.exitCode = 1;
    }
  }

  // 1. Simulate /whisper command
  console.log("\n[Test 1] Simulating /whisper ephemeral command...");
  await bot.handleUpdate({
    update_id: 1,
    message: {
      message_id: 200,
      date: Math.floor(Date.now() / 1000),
      chat: { id: -10099887766, type: "supergroup", title: "Alpha Chat" },
      from: { id: 424242, is_bot: false, first_name: "Alice" },
      text: "/whisper",
      entities: [{ type: "bot_command", offset: 0, length: 8 }],
    },
  });

  const whisperCall = outgoingCalls.find(
    (c) => c.method === "sendMessage" && c.payload.ephemeral_message_parameters
  );
  assert(whisperCall !== undefined, "sendMessage was invoked with ephemeral_message_parameters");
  assert(
    whisperCall?.payload.ephemeral_message_parameters.receiver_user_id === 424242,
    "receiver_user_id matches caller ID (424242)"
  );

  // 2. Simulate inline button tap for in-place private overlay
  console.log("\n[Test 2] Simulating 'view_key_overlay' button tap...");
  outgoingCalls.length = 0;
  await bot.handleUpdate({
    update_id: 2,
    callback_query: {
      id: "cb_overlay_123",
      chat_instance: "inst_1",
      from: { id: 424242, is_bot: false, first_name: "Alice" },
      message: {
        message_id: 50,
        date: Math.floor(Date.now() / 1000),
        chat: { id: -10099887766, type: "supergroup", title: "Alpha Chat" },
        text: "Public Group Hub",
      },
      data: "view_key_overlay",
    },
  });

  const overlayCall = outgoingCalls.find(
    (c) => c.method === "sendMessage" && c.payload.ephemeral_message_parameters?.replace_callback_query_message
  );
  assert(overlayCall !== undefined, "replace_callback_query_message was set to true");
  assert(
    overlayCall?.payload.ephemeral_message_parameters.callback_query_id === "cb_overlay_123",
    "callback_query_id is included for in-place replacement"
  );

  // 3. Simulate editEphemeralMessageText
  console.log("\n[Test 3] Simulating editing an ephemeral message...");
  outgoingCalls.length = 0;
  await bot.handleUpdate({
    update_id: 3,
    callback_query: {
      id: "cb_edit_456",
      chat_instance: "inst_1",
      from: { id: 424242, is_bot: false, first_name: "Alice" },
      message: {
        message_id: 101, // Ephemeral message id
        date: Math.floor(Date.now() / 1000),
        chat: { id: -10099887766, type: "supergroup", title: "Alpha Chat" },
        text: "Stealth Ephemeral Response",
      },
      data: "check_ephemeral_status",
    },
  });

  const editCall = outgoingCalls.find((c) => c.method === "editEphemeralMessageText");
  assert(editCall !== undefined, "editEphemeralMessageText was called");
  assert(editCall?.payload.receiver_user_id === 424242, "edit operates on receiver_user_id 424242");
  assert(editCall?.payload.ephemeral_message_id === 101, "edit targets ephemeral_message_id 101");

  // 4. Simulate deleteEphemeralMessage
  console.log("\n[Test 4] Simulating deleting an ephemeral message...");
  outgoingCalls.length = 0;
  await bot.handleUpdate({
    update_id: 4,
    callback_query: {
      id: "cb_dismiss_789",
      chat_instance: "inst_1",
      from: { id: 424242, is_bot: false, first_name: "Alice" },
      message: {
        message_id: 101,
        date: Math.floor(Date.now() / 1000),
        chat: { id: -10099887766, type: "supergroup", title: "Alpha Chat" },
        text: "Stealth Ephemeral Response",
      },
      data: "dismiss_ephemeral",
    },
  });

  const deleteCall = outgoingCalls.find((c) => c.method === "deleteEphemeralMessage");
  assert(deleteCall !== undefined, "deleteEphemeralMessage was called");
  assert(deleteCall?.payload.receiver_user_id === 424242, "delete operates on receiver_user_id 424242");
  assert(deleteCall?.payload.ephemeral_message_id === 101, "delete targets ephemeral_message_id 101");

  // Summary
  console.log(`\n========================================`);
  console.log(`Simulation Result: ${passed}/${total} assertions passed.`);
  if (passed === total) {
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!\n");
  } else {
    console.error("❌ Some tests failed.\n");
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Simulation run error:", err);
  process.exit(1);
});
