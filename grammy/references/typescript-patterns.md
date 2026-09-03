# grammY TypeScript Architectural Patterns Reference

> **Target Version:** grammY `v1.46.0` & `v2.0.0-beta.x` with TypeScript 5.x+  
> **Scope:** Strict TS Configuration, Dependency Injection, Result-Type Error Handling, and Pre-Flight Dependency Checks

---

## Table of Contents
- [1. Strict TypeScript Config Baseline](#1-strict-typescript-config-baseline)
- [2. Dependency Injection Pattern for Storage & I/O Boundaries](#2-dependency-injection-pattern-for-storage--io-boundaries)
- [3. Error Handling & Result-Type Pattern](#3-error-handling--result-type-pattern)
- [4. Dependency Version Pre-Flight Check Protocol](#4-dependency-version-pre-flight-check-protocol)

---

## 1. Strict TypeScript Config Baseline

When building TypeScript grammY bots—especially for serverless runtimes (Cloudflare Workers, Deno, Supabase Functions)—maintain a strict TypeScript baseline to prevent runtime type coercion and undefined dereference bugs.

### Standard `tsconfig.json` Baseline:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"]
}
```

---

## 2. Dependency Injection Pattern for Storage & I/O Boundaries

Always define abstract TypeScript interfaces for storage, external APIs, and database adapters before creating concrete implementations. This decouples bot handlers from specific infrastructure choices (e.g. Redis vs. Deno KV vs. Cloudflare Workers KV).

> See [`references/broadcast.md`](broadcast.md) for a worked example of a decoupled storage interface (`BroadcastKVStorage`).

### Pattern Structure:

```typescript
// 1. Define the Storage Boundary Interface First
export interface UserSessionRepository {
  getUser(userId: number | bigint): Promise<UserData | null>;
  saveUser(userId: number | bigint, data: Partial<UserData>): Promise<void>;
  incrementInteraction(userId: number | bigint): Promise<number>;
}

export interface UserData {
  userId: number | bigint;
  language: string;
  interactionCount: number;
  updatedAt: number;
}

// 2. Inject Interface into Feature Composers (Dependency Injection)
import { Composer, Context } from "grammy";

export function createUserFeature<C extends Context>(repo: UserSessionRepository): Composer<C> {
  const composer = new Composer<C>();

  composer.command("profile", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const count = await repo.incrementInteraction(userId);
    const user = await repo.getUser(userId);

    await ctx.reply(
      `<b>User Profile</b>\n` +
      `ID: <code>${userId}</code>\n` +
      `Interactions: <code>${count}</code>\n` +
      `Language: <code>${user?.language ?? "en"}</code>`,
      { parse_mode: "HTML" }
    );
  });

  return composer;
}

// 3. Instantiate Concrete Implementation at Entrypoint
export class MemoryUserRepository implements UserSessionRepository {
  private store = new Map<string, UserData>();

  async getUser(userId: number | bigint): Promise<UserData | null> {
    return this.store.get(userId.toString()) ?? null;
  }

  async saveUser(userId: number | bigint, data: Partial<UserData>): Promise<void> {
    const existing = await this.getUser(userId) ?? {
      userId,
      language: "en",
      interactionCount: 0,
      updatedAt: Date.now(),
    };
    this.store.set(userId.toString(), { ...existing, ...data, updatedAt: Date.now() });
  }

  async incrementInteraction(userId: number | bigint): Promise<number> {
    const user = await this.getUser(userId);
    const newCount = (user?.interactionCount ?? 0) + 1;
    await this.saveUser(userId, { interactionCount: newCount });
    return newCount;
  }
}
```

---

## 3. Error Handling & Result-Type Pattern

Avoid silent `try / catch` blocks that swallow errors or return dummy fallback values without explicit error propagation. Use explicit `Result<T, E>` types for domain operations and error boundaries for grammY middleware.

### Result Type Implementation:

```typescript
export type Result<T, E = Error> = 
  | { ok: true; value: T } 
  | { ok: false; error: E };

export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });

// Safe Async Wrapper
export async function toResult<T>(promise: Promise<T>): Promise<Result<T, Error>> {
  try {
    const data = await promise;
    return Ok(data);
  } catch (err) {
    return Err(err instanceof Error ? err : new Error(String(err)));
  }
}
```

### Usage in Bot Handlers:

```typescript
import { Context } from "grammy";

async function fetchExternalData(query: string): Promise<Result<string, Error>> {
  if (!query) return Err(new Error("Query string cannot be empty"));
  
  // Perform network call wrapped safely
  return toResult(
    fetch(`https://api.example.com/search?q=${encodeURIComponent(query)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.text();
      })
  );
}

export async function handleSearchCommand(ctx: Context) {
  const query = ctx.match;
  if (typeof query !== "string") return;

  const result = await fetchExternalData(query);

  if (!result.ok) {
    console.error(`[Search Error] Failed for query "${query}":`, result.error.message);
    await ctx.reply(`⚠️ Search failed: ${result.error.message}`);
    return;
  }

  await ctx.reply(`Search Result:\n${result.value}`);
}
```

---

## 4. Dependency Version Pre-Flight Check Protocol

Before adding or installing any npm/JSR dependency into a grammY project context, perform a version pre-flight check to verify package availability and resolve exact versions dynamically rather than assuming package versions from memory.

### Pre-Flight Shell Command:

```bash
# Query registry for latest published version before modifying package.json
npm view <package-name> version

# Inspect available tags (e.g. beta, next, latest)
npm view <package-name> dist-tags

# Example: Pre-flight check for grammY plugins
npm view @grammyjs/runner version
npm view @grammyjs/conversations version
```

### Rule Guidelines:
1. Always resolve exact package versions via `npm view` prior to writing installation commands or `package.json` updates.
2. Verify package runtime compatibility (e.g. check if the package relies on Node.js native `fs` or `net` before installing into Cloudflare Workers / Deno environments).
