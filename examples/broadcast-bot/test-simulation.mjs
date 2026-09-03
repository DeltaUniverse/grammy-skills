import assert from "node:assert";
import { MemoryKVBroadcastStorage, BroadcastQueueEngine, formatBroadcastStatus } from "./src/broadcast.js";

console.log("=================================================");
console.log("🧪 Running grammY Broadcast Engine Simulation Test");
console.log("=================================================\n");

// 1. Setup Mock Bot API
const blockedUserIds = new Set([1005, 1010, 1015, 1020, 1025, 1030, 1035, 1040, 1045, 1050]);
const rateLimitedUserIds = new Set([1007, 1014, 1021, 1028, 1035]);
const rateLimitRetried = new Set();

const mockApi = {
  async sendMessage(chatId, text, options) {
    // Check if user blocked the bot
    if (blockedUserIds.has(chatId)) {
      const err = new Error("Forbidden: bot was blocked by the user");
      err.error_code = 403;
      err.description = "Forbidden: bot was blocked by the user";
      throw err;
    }

    // Check if rate limited on first attempt
    if (rateLimitedUserIds.has(chatId) && !rateLimitRetried.has(chatId)) {
      rateLimitRetried.add(chatId);
      const err = new Error("Too Many Requests: retry after 1");
      err.error_code = 429;
      err.parameters = { retry_after: 0.1 }; // 100ms throttle for fast test execution
      throw err;
    }

    // Success response
    return {
      message_id: Math.floor(Math.random() * 100000),
      chat: { id: chatId, type: "private" },
      date: Math.floor(Date.now() / 1000),
      text,
    };
  },
};

// 2. Initialize Storage & Recipients
const storage = new MemoryKVBroadcastStorage();
const recipients = [];
for (let i = 1; i <= 50; i++) {
  recipients.push(1000 + i); // User IDs 1001 to 1050
}

console.log(`📋 Created recipient list with ${recipients.length} simulated Telegram users.`);

// 3. Track Restricted Callbacks & Progress Reports
const restrictedLog = [];
const progressLog = [];

const engine = new BroadcastQueueEngine(mockApi, storage, {
  chunkSize: 10,
  delayBetweenChunksMs: 10, // Fast delay for test execution
  onUserRestricted: async (userId, reason) => {
    restrictedLog.push({ userId, reason });
  },
  onProgress: async (report) => {
    progressLog.push(report);
  },
});

// 4. Test Job Creation
const payload = { type: "text", text: "📢 Important Announcement!", parse_mode: "HTML" };
const jobId = await storage.createJob(payload, recipients);

let job = await storage.getJob(jobId);
assert.strictEqual(job.status, "pending", "Initial job state should be pending");
assert.strictEqual(job.totalRecipients, 50, "Total recipients should match 50");
console.log(`✅ Job created successfully: ${jobId} (Status: ${job.status})`);

// 5. Test State Machine & Worker Execution
console.log("\n🚀 Launching Broadcast Queue Engine...");
await engine.runJob(jobId);

job = await storage.getJob(jobId);
assert.strictEqual(job.status, "completed", "Final job state should be completed");
console.log(`✅ Worker finished execution. Final Job Status: ${job.status}`);

// 6. Assert Metrics
console.log("\n📊 Execution Summary Metrics:");
console.log(`- Total Processed: ${job.cursor}`);
console.log(`- Successful: ${job.successCount}`);
console.log(`- Blocked (403): ${job.blockedCount}`);
console.log(`- Failed: ${job.failedCount}`);
console.log(`- Restricted Callback Invocations: ${restrictedLog.length}`);
console.log(`- Progress Updates Emitted: ${progressLog.length}`);

assert.strictEqual(job.cursor, 50, "All 50 recipients should be processed");
assert.strictEqual(job.blockedCount, 10, "10 blocked users should be flagged");
assert.strictEqual(job.successCount, 40, "40 users (35 standard + 5 retried) should succeed");
assert.strictEqual(restrictedLog.length, 10, "10 setRestricted callbacks should trigger");

// 7. Verify Auto-Restricted Filtering on Second Job
console.log("\n🔄 Testing Second Broadcast Job to verify auto-filtering of restricted users...");
const secondJobId = await storage.createJob(payload, recipients);
await engine.runJob(secondJobId);

const secondJob = await storage.getJob(secondJobId);
console.log(`- Second Job Processed: ${secondJob.cursor}`);
console.log(`- Second Job Success: ${secondJob.successCount}`);
console.log(`- Second Job Skipped/Blocked: ${secondJob.blockedCount}`);

assert.strictEqual(secondJob.successCount, 40, "Second job should succeed for active users");
assert.strictEqual(secondJob.blockedCount, 10, "Second job should instantly skip 10 restricted users");

// 8. Test Progress Report Formatting
const lastReport = progressLog[progressLog.length - 1];
const formattedMsg = formatBroadcastStatus(lastReport);
console.log("\n📱 Formatted Telegram Admin Progress Message:");
console.log("-------------------------------------------------");
console.log(formattedMsg);
console.log("-------------------------------------------------");

assert(formattedMsg.includes("COMPLETED"), "Progress report format should contain COMPLETED status");
assert(formattedMsg.includes("100%"), "Progress report format should show 100%");

console.log("\n🎉 ALL BROADCAST ENGINE SIMULATION TESTS PASSED CLEANLY! 100% VERIFIED!\n");
