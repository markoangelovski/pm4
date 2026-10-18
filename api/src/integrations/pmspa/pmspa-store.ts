import { Injectable, Logger } from "@nestjs/common";
import { Redis } from "../../redis/redis.js";
import type {
  PmspaAccountDto,
  PmspaRateLimitDto
} from "./dto/pmspa-connection-response.dto.js";
import { PmspaCrypto } from "./pmspa-crypto.js";

/** The cached PMSPA token expires before PMSPA's own 24 h expiry (D5). */
const TOKEN_TTL_SECONDS = 82800;

const keys = {
  token: (userId: string) => `pmspa:token:${userId}`,
  account: (userId: string) => `pmspa:account:${userId}`,
  pause: (host: string) => `pmspa:pause:${host}`,
  lock: (userId: string) => `pmspa:lock:${userId}`,
  rate: (host: string) => `pmspa:rate:${host}`
};

/** Whose cached token or account it is: the connection's URL and email when it was cached (OQ-208). */
export interface PmspaOwner {
  url: string;
  email: string;
}

/**
 * Redis-backed PMSPA state (feat-int-conn-api D5): the encrypted token
 * cache, the last who-am-I account and the per-host rate-limit pause.
 * Tokens are stored encrypted (FR-INT-003), never in clear.
 */
@Injectable()
export class PmspaStore {
  private readonly logger = new Logger(PmspaStore.name);

  constructor(
    private readonly redis: Redis,
    private readonly crypto: PmspaCrypto
  ) {}

  private get client() {
    return this.redis.client;
  }

  /** The cached token, or null when missing or no longer decryptable. */
  async getToken(userId: string, owner: PmspaOwner): Promise<string | null> {
    void owner;
    const raw = await this.client.get(keys.token(userId));
    if (raw === null) return null;
    try {
      return this.crypto.decrypt(Buffer.from(raw, "base64"));
    } catch {
      // Wrong key or a changed blob: the cache is only a cache, so drop it and
      // re-login. Log the user id only, never the cached value or the error.
      this.logger.warn(
        `Cached PMSPA token for user ${userId} can't be decrypted; dropped it.`
      );
      await this.client.del(keys.token(userId));
      return null;
    }
  }

  async setToken(
    userId: string,
    token: string,
    owner: PmspaOwner
  ): Promise<void> {
    void owner;
    await this.client.set(
      keys.token(userId),
      this.crypto.encrypt(token).toString("base64"),
      "EX",
      TOKEN_TTL_SECONDS
    );
  }

  async getAccount(
    userId: string,
    owner: PmspaOwner
  ): Promise<PmspaAccountDto | null> {
    void owner;
    const raw = await this.client.get(keys.account(userId));
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as PmspaAccountDto;
    } catch {
      return null;
    }
  }

  /** No expiry: kept until disconnect (API-INT-001). */
  async setAccount(
    userId: string,
    account: PmspaAccountDto,
    owner: PmspaOwner
  ): Promise<void> {
    void owner;
    await this.client.set(keys.account(userId), JSON.stringify(account));
  }

  /** Removes the token and the account. */
  async clear(userId: string): Promise<void> {
    await this.client.del(keys.token(userId), keys.account(userId));
  }

  /** Remaining pause in whole seconds, rounded up; 0 = not paused. */
  async pausedFor(host: string): Promise<number> {
    const ms = await this.client.pttl(keys.pause(host));
    if (ms <= 0) return 0;
    return Math.ceil(ms / 1000);
  }

  /** Sets the pause, or extends it; a shorter pause never shortens a longer one. */
  async pause(host: string, seconds: number): Promise<void> {
    const ms = Math.ceil(seconds * 1000);
    const current = await this.client.pttl(keys.pause(host));
    if (current >= ms) return;
    await this.client.set(keys.pause(host), "1", "PX", ms);
  }

  /** Takes the user's import/sync lock for 5 minutes (D4). True when it was free. */
  async lock(userId: string): Promise<boolean> {
    const res = await this.client.set(
      keys.lock(userId),
      "1",
      "PX",
      300000,
      "NX"
    );
    return res === "OK";
  }

  async unlock(userId: string): Promise<void> {
    await this.client.del(keys.lock(userId));
  }

  /**
   * PMSPA's last rate-limit answer for `host`, or null (none, expired, or not JSON).
   * While the host is paused it reads as spent until the pause ends, the same as a PMSPA read answers then (D1).
   */
  async getRateLimit(host: string): Promise<PmspaRateLimitDto | null> {
    const raw = await this.client.get(keys.rate(host));
    if (raw === null) return null;
    let rateLimit: PmspaRateLimitDto;
    try {
      rateLimit = JSON.parse(raw) as PmspaRateLimitDto;
    } catch {
      return null;
    }
    return this.withPause(host, rateLimit);
  }

  /**
   * Kept until `resetAt`: `SET key JSON PX (Date.parse(resetAt) − Date.now())`; nothing when that's ≤ 0.
   * An answer stored while the host is paused (one that overlapped the 429) is kept as spent until the pause ends.
   */
  async setRateLimit(
    host: string,
    rateLimit: PmspaRateLimitDto
  ): Promise<void> {
    const kept = await this.withPause(host, rateLimit);
    const ttl = Date.parse(kept.resetAt) - Date.now();
    if (ttl <= 0) return;
    await this.client.set(keys.rate(host), JSON.stringify(kept), "PX", ttl);
  }

  /** `remaining: 0` and `resetAt` no earlier than the pause's end while `host` is paused; as is otherwise. */
  private async withPause(
    host: string,
    rateLimit: PmspaRateLimitDto
  ): Promise<PmspaRateLimitDto> {
    const ms = await this.client.pttl(keys.pause(host));
    if (ms <= 0) return rateLimit;
    const pauseEnd = Date.now() + ms;
    return {
      ...rateLimit,
      remaining: 0,
      resetAt: new Date(
        Math.max(Date.parse(rateLimit.resetAt), pauseEnd)
      ).toISOString()
    };
  }
}
