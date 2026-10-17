import { Injectable, Logger } from "@nestjs/common";
import { Redis } from "../../redis/redis.js";
import type { PmspaAccountDto } from "./dto/pmspa-connection-response.dto.js";
import { PmspaCrypto } from "./pmspa-crypto.js";

/** The cached PMSPA token expires before PMSPA's own 24 h expiry (D5). */
const TOKEN_TTL_SECONDS = 82800;

const keys = {
  token: (userId: string) => `pmspa:token:${userId}`,
  account: (userId: string) => `pmspa:account:${userId}`,
  pause: (host: string) => `pmspa:pause:${host}`
};

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
  async getToken(userId: string): Promise<string | null> {
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

  async setToken(userId: string, token: string): Promise<void> {
    await this.client.set(
      keys.token(userId),
      this.crypto.encrypt(token).toString("base64"),
      "EX",
      TOKEN_TTL_SECONDS
    );
  }

  async getAccount(userId: string): Promise<PmspaAccountDto | null> {
    const raw = await this.client.get(keys.account(userId));
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as PmspaAccountDto;
    } catch {
      return null;
    }
  }

  /** No expiry: kept until disconnect (API-INT-001). */
  async setAccount(userId: string, account: PmspaAccountDto): Promise<void> {
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
}
