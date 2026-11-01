import { Logger } from "@nestjs/common";
import type { ThrottlerStorage } from "@nestjs/throttler";
// Not re-exported from the package index (6.7.x).
import type { ThrottlerStorageRecord } from "@nestjs/throttler/dist/throttler-storage-record.interface.js";
import { Redis } from "../redis/redis.js";

export const RATE_LIMIT_REDIS_TIMEOUT_MS = 500;

/** `defineCommand` name, `numberOfKeys: 1`. */
export const RATE_LIMIT_HIT_COMMAND = "rateLimitHit";

export const RATE_LIMIT_HIT_SCRIPT = `
local hits = redis.call('INCR', KEYS[1])
local pttl = redis.call('PTTL', KEYS[1])
if pttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  pttl = tonumber(ARGV[1])
end
return { hits, pttl }
`;

type HitCommand = (key: string, ttl: number) => Promise<[number, number]>;

/** Fixed-window counters in Redis, one Lua script per hit (feat-api-rate-limit D1, D4, D6). */
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(RedisThrottlerStorage.name);

  constructor(private readonly redis: Redis) {
    // Idempotent per client: ioredis keeps one definition per command name.
    this.redis.client.defineCommand(RATE_LIMIT_HIT_COMMAND, {
      numberOfKeys: 1,
      lua: RATE_LIMIT_HIT_SCRIPT
    });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    // The window is the block: the key's expiry ends both.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _blockDuration: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _throttlerName: string
  ): Promise<ThrottlerStorageRecord> {
    let timer: NodeJS.Timeout | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                `Redis timed out after ${RATE_LIMIT_REDIS_TIMEOUT_MS}ms`
              )
            ),
          RATE_LIMIT_REDIS_TIMEOUT_MS
        );
      });
      const hit = (this.redis.client as unknown as Record<string, HitCommand>)[
        RATE_LIMIT_HIT_COMMAND
      ](key, ttl);
      const [hits, pttl] = await Promise.race([hit, timeout]);
      const seconds = Math.max(1, Math.ceil(pttl / 1000));
      const blocked = hits > limit;
      return {
        totalHits: hits,
        timeToExpire: seconds,
        isBlocked: blocked,
        timeToBlockExpire: blocked ? seconds : 0
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Rate limit check skipped: ${message}`);
      return {
        totalHits: 0,
        timeToExpire: 0,
        isBlocked: false,
        timeToBlockExpire: 0
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
