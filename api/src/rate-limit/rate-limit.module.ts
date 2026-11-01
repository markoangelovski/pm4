import { Module } from "@nestjs/common";
import { ThrottlerModule, ThrottlerModuleOptions } from "@nestjs/throttler";
import { Redis } from "../redis/redis.js";
import { RedisModule } from "../redis/redis.module.js";
import { RedisThrottlerStorage } from "./redis-throttler.storage.js";
import { DEFAULT_RATE_LIMITS, RATE_LIMITS } from "./rate-limits.js";

/** Rate limiting (security.md#api-hardening): Redis counters, the guard is registered in `AuthModule`. */
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [Redis],
      useFactory: (redis: Redis): ThrottlerModuleOptions => ({
        throttlers: [
          {
            name: "default",
            ttl: DEFAULT_RATE_LIMITS.windowMs,
            limit: DEFAULT_RATE_LIMITS.limits.user
          }
        ],
        storage: new RedisThrottlerStorage(redis),
        setHeaders: false
      })
    })
  ],
  providers: [{ provide: RATE_LIMITS, useValue: DEFAULT_RATE_LIMITS }],
  exports: [RATE_LIMITS]
})
export class RateLimitModule {}
