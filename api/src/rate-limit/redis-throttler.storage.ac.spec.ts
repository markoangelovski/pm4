import { Logger } from "@nestjs/common";
import { vi } from "vitest";
import { Redis } from "../redis/redis.js";
import {
  RATE_LIMIT_HIT_COMMAND,
  RedisThrottlerStorage
} from "./redis-throttler.storage.js";

type HitCommand = (key: string, ttl: number) => Promise<[number, number]>;

describe("RedisThrottlerStorage (feat-api-rate-limit)", () => {
  let hit: ReturnType<typeof vi.fn<HitCommand>>;
  let storage: RedisThrottlerStorage;

  beforeEach(() => {
    hit = vi.fn<HitCommand>();
    // The fake client already has the command that `defineCommand` would add.
    const client = {
      defineCommand: vi.fn(),
      [RATE_LIMIT_HIT_COMMAND]: hit
    };
    storage = new RedisThrottlerStorage({ client } as unknown as Redis);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const increment = (limit = 10) =>
    storage.increment("rl:user:u:1", 60_000, limit, 60_000, "default");

  it("AC-15 NFR-004: under the limit → hits and seconds to expiry, not blocked; the command gets (key, ttl)", async () => {
    hit.mockResolvedValue([10, 30_000]);

    await expect(increment()).resolves.toEqual({
      totalHits: 10,
      timeToExpire: 30,
      isBlocked: false,
      timeToBlockExpire: 0
    });
    expect(hit).toHaveBeenCalledWith("rl:user:u:1", 60_000);
  });

  it("AC-15 NFR-004: over the limit → blocked until the key expires (seconds rounded up)", async () => {
    hit.mockResolvedValue([11, 29_001]);

    await expect(increment()).resolves.toEqual({
      totalHits: 11,
      timeToExpire: 30,
      isBlocked: true,
      timeToBlockExpire: 30
    });
  });

  it("AC-15 NFR-004: a key about to expire → at least 1 second", async () => {
    hit.mockResolvedValue([1, 0]);

    const record = await increment();
    expect(record.timeToExpire).toBe(1);
    expect(record.isBlocked).toBe(false);
  });

  it("AC-16 NFR-004: the command rejects → allowed (not blocked, 0 hits) and a warning logged", async () => {
    const warn = vi
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => undefined);
    hit.mockRejectedValue(new Error("ECONNREFUSED"));

    const record = await increment();
    expect(record.isBlocked).toBe(false);
    expect(record.totalHits).toBe(0);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Rate limit check skipped")
    );
  });

  it("AC-16 NFR-004: the command never settles → allowed after 500 ms", async () => {
    vi.useFakeTimers();
    vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    hit.mockReturnValue(new Promise<[number, number]>(() => undefined));

    const pending = increment();
    let settled = false;
    void pending.then(() => (settled = true));

    await vi.advanceTimersByTimeAsync(499);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toMatchObject({
      isBlocked: false,
      totalHits: 0
    });
  });
});
