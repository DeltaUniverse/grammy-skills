/**
 * High-Performance KV-Backed Broadcast Engine Pattern for grammY
 */

export class MemoryKVBroadcastStorage {
  constructor() {
    this.jobs = new Map();
    this.recipients = new Map();
    this.restrictedUsers = new Map();
  }

  async createJob(payload, recipientIds) {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const job = {
      id: jobId,
      status: "pending",
      payload,
      cursor: 0,
      totalRecipients: recipientIds.length,
      successCount: 0,
      failedCount: 0,
      blockedCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.jobs.set(jobId, job);

    const chunkSize = 50;
    const chunks = [];
    for (let i = 0; i < recipientIds.length; i += chunkSize) {
      chunks.push(recipientIds.slice(i, i + chunkSize));
    }
    this.recipients.set(jobId, chunks);

    return jobId;
  }

  async getJob(jobId) {
    const job = this.jobs.get(jobId);
    return job ? { ...job } : null;
  }

  async updateJobStatus(jobId, status) {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.status = status;
    job.updatedAt = Date.now();
    if (status === "completed" || status === "stopped") {
      job.completedAt = Date.now();
    }
  }

  async getRecipientsChunk(jobId, cursor, limit) {
    const chunks = this.recipients.get(jobId) || [];
    const chunkSize = 50;
    const chunkIndex = Math.floor(cursor / chunkSize);
    const chunk = chunks[chunkIndex] || [];
    
    const offsetInChunk = cursor % chunkSize;
    return chunk.slice(offsetInChunk, offsetInChunk + limit);
  }

  async updateJobProgress(jobId, progress) {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.cursor = progress.cursor;
    job.successCount = progress.successCount;
    job.failedCount = progress.failedCount;
    job.blockedCount = progress.blockedCount;
    job.updatedAt = Date.now();
  }

  async markUserRestricted(userId, reason) {
    this.restrictedUsers.set(String(userId), {
      restricted: true,
      reason,
      updatedAt: Date.now(),
    });
  }

  async isUserActive(userId) {
    const record = this.restrictedUsers.get(String(userId));
    return !record || !record.restricted;
  }
}

export class BroadcastQueueEngine {
  constructor(api, storage, options = {}) {
    this.api = api;
    this.storage = storage;
    this.options = {
      chunkSize: options.chunkSize ?? 10,
      delayBetweenChunksMs: options.delayBetweenChunksMs ?? 50,
      onUserRestricted: options.onUserRestricted,
      onProgress: options.onProgress,
    };
  }

  async runJob(jobId) {
    let job = await this.storage.getJob(jobId);
    if (!job || job.status === "completed" || job.status === "stopped") return;

    await this.storage.updateJobStatus(jobId, "running");

    const chunkSize = this.options.chunkSize;
    const delayMs = this.options.delayBetweenChunksMs;

    while (true) {
      job = await this.storage.getJob(jobId);
      if (!job || job.status !== "running") break;

      if (job.cursor >= job.totalRecipients) {
        await this.storage.updateJobStatus(jobId, "completed");
        break;
      }

      const recipients = await this.storage.getRecipientsChunk(jobId, job.cursor, chunkSize);
      if (recipients.length === 0) {
        await this.storage.updateJobStatus(jobId, "completed");
        break;
      }

      let chunkSuccess = 0;
      let chunkFailed = 0;
      let chunkBlocked = 0;

      for (const userId of recipients) {
        const isActive = await this.storage.isUserActive(userId);
        if (!isActive) {
          chunkBlocked++;
          continue;
        }

        try {
          await this.dispatchMessage(userId, job.payload);
          chunkSuccess++;
        } catch (err) {
          if (err.error_code === 429 || err.parameters?.retry_after) {
            const waitSeconds = err.parameters?.retry_after ?? 1;
            console.warn(`[Broadcast Engine] ⚠️ Rate limit hit on user ${userId}. Throttling for ${waitSeconds}s`);
            await new Promise((r) => setTimeout(r, waitSeconds * 1000));
            
            try {
              await this.dispatchMessage(userId, job.payload);
              chunkSuccess++;
            } catch (retryErr) {
              chunkFailed++;
            }
          } else if (this.isUserBlockedError(err)) {
            chunkBlocked++;
            const reason = err.description || "Forbidden: bot was blocked by the user";
            await this.storage.markUserRestricted(userId, reason);
            if (this.options.onUserRestricted) {
              await this.options.onUserRestricted(userId, reason);
            }
          } else {
            chunkFailed++;
          }
        }
      }

      const newCursor = job.cursor + recipients.length;
      const newSuccess = job.successCount + chunkSuccess;
      const newFailed = job.failedCount + chunkFailed;
      const newBlocked = job.blockedCount + chunkBlocked;

      const isCompleted = newCursor >= job.totalRecipients;
      const currentStatus = isCompleted ? "completed" : "running";

      await this.storage.updateJobProgress(jobId, {
        cursor: newCursor,
        successCount: newSuccess,
        failedCount: newFailed,
        blockedCount: newBlocked,
      });

      if (isCompleted) {
        await this.storage.updateJobStatus(jobId, "completed");
      }

      if (this.options.onProgress) {
        const elapsed = Date.now() - job.createdAt;
        const remaining = isCompleted ? 0 : (newCursor > 0 ? Math.round((elapsed / newCursor) * (job.totalRecipients - newCursor)) : 0);

        await this.options.onProgress({
          jobId,
          status: currentStatus,
          total: job.totalRecipients,
          processed: newCursor,
          successful: newSuccess,
          failed: newFailed,
          blocked: newBlocked,
          percent: Math.min(100, Math.round((newCursor / job.totalRecipients) * 100)),
          elapsedMs: elapsed,
          estimatedRemainingMs: remaining,
        });
      }

      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  async dispatchMessage(targetId, payload) {
    if (payload.type === "text") {
      await this.api.sendMessage(targetId, payload.text, {
        parse_mode: payload.parse_mode,
        reply_markup: payload.reply_markup,
      });
    } else if (payload.type === "photo") {
      await this.api.sendPhoto(targetId, payload.photo, {
        caption: payload.caption,
        parse_mode: payload.parse_mode,
        reply_markup: payload.reply_markup,
      });
    } else if (payload.type === "copy_message") {
      await this.api.copyMessage(targetId, payload.from_chat_id, payload.message_id);
    }
  }

  isUserBlockedError(err) {
    if (!err || typeof err !== "object") return false;
    const desc = String(err.description || "").toLowerCase();
    const code = err.error_code;
    return (
      code === 403 ||
      desc.includes("bot was blocked by the user") ||
      desc.includes("user is deactivated") ||
      desc.includes("chat not found") ||
      desc.includes("can't initiate conversation")
    );
  }
}

export function formatBroadcastStatus(report) {
  const barLen = 10;
  const filled = Math.round((report.percent / 100) * barLen);
  const bar = "▓".repeat(filled) + "░".repeat(barLen - filled);

  return (
    `<b>📢 Broadcast Status: ${report.status.toUpperCase()}</b>\n\n` +
    `Progress: [<code>${bar}</code>] <b>${report.percent}%</b>\n` +
    `Processed: <code>${report.processed}</code> / <code>${report.total}</code>\n` +
    `✅ Successful: <code>${report.successful}</code>\n` +
    `🚫 Blocked/Kicked: <code>${report.blocked}</code>\n` +
    `❌ Failed: <code>${report.failed}</code>\n\n` +
    `⏱ Elapsed: <code>${Math.round(report.elapsedMs / 1000)}s</code> | Est. Remaining: <code>${Math.round(report.estimatedRemainingMs / 1000)}s</code>`
  );
}
