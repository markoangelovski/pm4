import { Logger } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AppConfigService } from "../../config/app-config.service.js";
import type { Redis } from "../../redis/redis.js";
import type { PmspaAccountDto } from "./dto/pmspa-connection-response.dto.js";
import { PmspaCrypto } from "./pmspa-crypto.js";
import { PmspaStore } from "./pmspa-store.js";

const USER = "11111111-1111-4111-8111-111111111111";
const ACCOUNT: PmspaAccountDto = {
  id: "65a1b2c3d4e5f6a7b8c9d0e1",
  email: "ada@example.com",
  avatarUrl: null,
  role: "user"
};
const OWNER = { url: "https://pmspa.test", email: "ada@example.com" };

function setup() {
  const client = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    pttl: vi.fn()
  };
  const redis = { client } as unknown as Redis;
  const config = {
    pmspaEncryptionKey: Buffer.alloc(32, 7)
  } as unknown as AppConfigService;
  const crypto = new PmspaCrypto(config);
  const store = new PmspaStore(redis, crypto);
  return { client, store, crypto };
}

describe("PmspaStore", () => {
  it("stores the token encrypted with a 23 h TTL and reads it back", async () => {
    const { client, store } = setup();
    await store.setToken(USER, "secret-token", OWNER);

    const [key, value, mode, ttl] = client.set.mock.calls[0] as unknown[];
    expect(key).toBe(`pmspa:token:${USER}`);
    expect(value).not.toContain("secret-token");
    expect(mode).toBe("EX");
    expect(ttl).toBe(82800);

    client.get.mockResolvedValueOnce(value);
    await expect(store.getToken(USER, OWNER)).resolves.toBe("secret-token");
  });

  it("returns null for a missing token and for an undecryptable one", async () => {
    const { client, store } = setup();
    client.get.mockResolvedValueOnce(null);
    await expect(store.getToken(USER, OWNER)).resolves.toBeNull();

    const other = new PmspaCrypto({
      pmspaEncryptionKey: Buffer.alloc(32, 9)
    } as unknown as AppConfigService);
    client.get.mockResolvedValueOnce(
      other.encrypt("secret").toString("base64")
    );
    await expect(store.getToken(USER, OWNER)).resolves.toBeNull();
  });

  it("drops an undecryptable token, warns without the value and returns null", async () => {
    const { client, store } = setup();
    const warn = vi
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => {});
    const stored = new PmspaCrypto({
      pmspaEncryptionKey: Buffer.alloc(32, 9)
    } as unknown as AppConfigService)
      .encrypt("secret")
      .toString("base64");
    client.get.mockResolvedValueOnce(stored);

    await expect(store.getToken(USER, OWNER)).resolves.toBeNull();
    expect(client.del).toHaveBeenCalledWith(`pmspa:token:${USER}`);
    expect(warn).toHaveBeenCalledTimes(1);
    const message = String(warn.mock.calls[0]?.[0]);
    expect(message).toContain(USER);
    expect(message).not.toContain(stored);
    expect(message).not.toContain("secret");
    warn.mockRestore();
  });

  it("returns null for a missing token without warning or deleting", async () => {
    const { client, store } = setup();
    const warn = vi
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => {});
    client.get.mockResolvedValueOnce(null);
    await expect(store.getToken(USER, OWNER)).resolves.toBeNull();
    expect(warn).not.toHaveBeenCalled();
    expect(client.del).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("stores the account without expiry and reads it back", async () => {
    const { client, store } = setup();
    await store.setAccount(USER, ACCOUNT, OWNER);
    expect(client.set).toHaveBeenCalledWith(
      `pmspa:account:${USER}`,
      JSON.stringify(ACCOUNT)
    );

    client.get.mockResolvedValueOnce(JSON.stringify(ACCOUNT));
    await expect(store.getAccount(USER, OWNER)).resolves.toEqual(ACCOUNT);
    client.get.mockResolvedValueOnce(null);
    await expect(store.getAccount(USER, OWNER)).resolves.toBeNull();
  });

  it("clear deletes the token and the account", async () => {
    const { client, store } = setup();
    await store.clear(USER);
    expect(client.del).toHaveBeenCalledWith(
      `pmspa:token:${USER}`,
      `pmspa:account:${USER}`
    );
  });

  it("pausedFor rounds the remaining time up to seconds and is 0 when not paused", async () => {
    const { client, store } = setup();
    client.pttl.mockResolvedValueOnce(-2);
    await expect(store.pausedFor("pmspa.example.com")).resolves.toBe(0);
    client.pttl.mockResolvedValueOnce(1);
    await expect(store.pausedFor("pmspa.example.com")).resolves.toBe(1);
    client.pttl.mockResolvedValueOnce(900_001);
    await expect(store.pausedFor("pmspa.example.com")).resolves.toBe(901);
    expect(client.pttl).toHaveBeenCalledWith("pmspa:pause:pmspa.example.com");
  });

  it("pause sets the host pause with PX", async () => {
    const { client, store } = setup();
    client.pttl.mockResolvedValueOnce(-2);
    await store.pause("pmspa.example.com", 120);
    expect(client.set).toHaveBeenCalledWith(
      "pmspa:pause:pmspa.example.com",
      "1",
      "PX",
      120_000
    );
  });

  it("pause never shortens a longer current pause", async () => {
    const { client, store } = setup();
    client.pttl.mockResolvedValueOnce(600_000);
    await store.pause("pmspa.example.com", 60);
    expect(client.set).not.toHaveBeenCalled();
  });

  it("pause extends a shorter current pause", async () => {
    const { client, store } = setup();
    client.pttl.mockResolvedValueOnce(30_000);
    await store.pause("pmspa.example.com", 900);
    expect(client.set).toHaveBeenCalledWith(
      "pmspa:pause:pmspa.example.com",
      "1",
      "PX",
      900_000
    );
  });

  describe("rate limit (feat-int-budget D1)", () => {
    const HOST = "pmspa.example.com";
    const inMs = (ms: number) => new Date(Date.now() + ms).toISOString();
    const answer = (remaining: number, resetInMs: number) => ({
      limit: 100,
      remaining,
      resetAt: inMs(resetInMs),
      observedAt: new Date().toISOString()
    });

    it("stores the answer until its reset and reads it back when the host isn't paused", async () => {
      const { client, store } = setup();
      client.pttl.mockResolvedValue(-2);
      const rate = answer(40, 60_000);
      await store.setRateLimit(HOST, rate);
      const [key, value, mode, ttl] = client.set.mock.calls[0] as unknown[];
      expect(key).toBe(`pmspa:rate:${HOST}`);
      expect(JSON.parse(value as string)).toEqual(rate);
      expect(mode).toBe("PX");
      expect(ttl).toBeGreaterThan(59_000);

      client.get.mockResolvedValueOnce(value);
      await expect(store.getRateLimit(HOST)).resolves.toEqual(rate);
    });

    it("an answer stored while paused is kept as spent until the pause ends", async () => {
      const { client, store } = setup();
      client.pttl.mockResolvedValue(600_000);
      await store.setRateLimit(HOST, answer(3, 240_000));
      const [, value, , ttl] = client.set.mock.calls[0] as unknown[];
      const kept = JSON.parse(value as string) as {
        remaining: number;
        resetAt: string;
      };
      expect(kept.remaining).toBe(0);
      expect(Date.parse(kept.resetAt) - Date.now()).toBeGreaterThan(599_000);
      expect(ttl).toBeGreaterThan(599_000);
    });

    it("reads as spent until the pause ends while the host is paused", async () => {
      const { client, store } = setup();
      client.get.mockResolvedValueOnce(JSON.stringify(answer(95, 60_000)));
      client.pttl.mockResolvedValueOnce(300_000);
      const read = await store.getRateLimit(HOST);
      expect(read).toMatchObject({ limit: 100, remaining: 0 });
      expect(Date.parse(read!.resetAt) - Date.now()).toBeGreaterThan(299_000);
      expect(client.pttl).toHaveBeenCalledWith(`pmspa:pause:${HOST}`);
    });

    it("a pause shorter than the answer's reset keeps the reset", async () => {
      const { client, store } = setup();
      const rate = answer(10, 600_000);
      client.get.mockResolvedValueOnce(JSON.stringify(rate));
      client.pttl.mockResolvedValueOnce(60_000);
      await expect(store.getRateLimit(HOST)).resolves.toEqual({
        ...rate,
        remaining: 0
      });
    });
  });

  it("lock sets the key NX with a 5 min expiry; unlock deletes it", async () => {
    const { client, store } = setup();
    client.set.mockResolvedValueOnce("OK").mockResolvedValueOnce(null);
    await expect(store.lock(USER)).resolves.toBe(true);
    expect(client.set).toHaveBeenCalledWith(
      `pmspa:lock:${USER}`,
      "1",
      "PX",
      300000,
      "NX"
    );
    await expect(store.lock(USER)).resolves.toBe(false);
    await store.unlock(USER);
    expect(client.del).toHaveBeenCalledWith(`pmspa:lock:${USER}`);
  });
});
