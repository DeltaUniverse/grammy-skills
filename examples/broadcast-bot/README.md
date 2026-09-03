# High-Performance Broadcast Bot Example for grammY

This example demonstrates how to implement a queue-backed, rate-limit resilient broadcast engine for Telegram bots built with **grammY**.

## Features Demonstrated

1. **Queue State Machine (`pending` $\rightarrow$ `running` $\rightarrow$ `paused` / `stopped` / `completed`)**: Clean status transitions and cursor tracking.
2. **Decoupled KV Storage**: In-memory and KV-ready storage adapter (`MemoryKVBroadcastStorage`).
3. **Chunked Dispatching & Rate Limiting**: Batched recipient dispatch with automatic `429 Too Many Requests` retry and throttling.
4. **Auto-Restricted User Cleanup (`onUserRestricted`)**: Intercepts `403 Forbidden` errors to flag dead/blocked accounts in KV and avoid quota waste.
5. **Live Progress Reporting**: Formats progress bars and ETA metrics for admin visibility.

## Running the Simulation Test

Execute the automated test suite to verify job creation, chunk processing, rate-limit auto-throttling, blocked user cleanup, and formatted progress reports:

```bash
npm test
# or
node test-simulation.mjs
```
