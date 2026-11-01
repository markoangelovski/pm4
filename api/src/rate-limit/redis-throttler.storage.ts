import type { ThrottlerStorage } from "@nestjs/throttler";
// Not re-exported from the package index (6.7.x).
import type { ThrottlerStorageRecord } from "@nestjs/throttler/dist/throttler-storage-record.interface.js";
import { Redis } from "../redis/redis.js";

export const RATE_LIMIT_REDIS_TIMEOUT_MS = 500;

/** `defineCommand` name, `numberOfKeys: 1`. */
export const RATE_LIMIT_HIT_COMMAND = "rateLimitHit";

/** Fixed-window counters in Redis, one Lua script per hit (feat-api-rate-limit D1, D4, D6). */
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: Redis) {}

  increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string
  ): Promise<ThrottlerStorageRecord> {
    void [this.redis, key, ttl, limit, blockDuration, throttlerName];
    throw new Error("not implemented (feat-api-rate-limit)");
  }
}
