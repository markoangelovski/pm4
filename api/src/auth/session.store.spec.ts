import { AppConfigService } from "../config/app-config.service.js";
import { Redis } from "../redis/redis.js";
import {
  hashSecret,
  ROTATE_COMMAND,
  ROTATE_SCRIPT,
  SessionStore
} from "./session.store.js";

/**
 * Just enough of ioredis for SessionStore, in memory (TTLs recorded, not
 * enforced). The rotate Lua script is mirrored in JS (`rotateScript`); the
 * real script runs against Redis in the e2e acceptance tests (AC-16, AC-26).
 */
class FakeRedisClient {
  readonly strings = new Map<string, string>();
  readonly sets = new Map<string, Set<string>>();
  readonly ttls = new Map<string, number>();
  readonly commands = new Map<string, { numberOfKeys: number; lua: string }>();
  readonly deleted: string[] = [];

  defineCommand(
    name: string,
    definition: { numberOfKeys: number; lua: string }
  ) {
    this.commands.set(name, definition);
    (this as unknown as Record<string, unknown>)[name] = (...args: string[]) =>
      this.rotateScript(args);
  }

  /** JS mirror of ROTATE_SCRIPT, synchronous like a Redis script. */
  private rotateScript([
    refreshKey,
    rotatedKey,
    newRefreshKey,
    hash,
    newHash,
    ttl
  ]: string[]): Promise<[string, string] | null> {
    const decode = <T>(raw: string | undefined) =>
      raw === undefined ? null : (JSON.parse(raw) as T);
    const entry = decode<{ userId: string; familyId: string }>(
      this.strings.get(refreshKey)
    );
    this.strings.delete(refreshKey);
    if (!entry) {
      const reused = this.strings.get(rotatedKey);
      const family = reused
        ? decode<{ userId: string; current: string }>(
            this.strings.get(`auth:family:${reused}`)
          )
        : null;
      if (reused && family) {
        this.strings.delete(`auth:refresh:${family.current}`);
        this.strings.delete(`auth:family:${reused}`);
        this.sets.get(`auth:families:${family.userId}`)?.delete(reused);
      }
      return Promise.resolve(null);
    }
    const { userId, familyId } = entry;
    const family = decode<{ current: string }>(
      this.strings.get(`auth:family:${familyId}`)
    );
    if (!family || family.current !== hash) return Promise.resolve(null);
    const seconds = Number(ttl);
    const write = (key: string, value: string) => {
      this.strings.set(key, value);
      this.ttls.set(key, seconds);
    };
    write(newRefreshKey, JSON.stringify({ userId, familyId }));
    write(
      `auth:family:${familyId}`,
      JSON.stringify({ userId, current: newHash })
    );
    write(rotatedKey, familyId);
    const setKey = `auth:families:${userId}`;
    this.sets.set(setKey, (this.sets.get(setKey) ?? new Set()).add(familyId));
    this.ttls.set(setKey, seconds);
    return Promise.resolve([userId, familyId]);
  }

  get(key: string) {
    return Promise.resolve(this.strings.get(key) ?? null);
  }
  set(key: string, value: string, _ex: "EX", ttl: number) {
    this.strings.set(key, value);
    this.ttls.set(key, ttl);
    return Promise.resolve("OK");
  }
  getdel(key: string) {
    const value = this.strings.get(key) ?? null;
    this.strings.delete(key);
    return Promise.resolve(value);
  }
  del(key: string) {
    this.deleted.push(key);
    const existed = this.strings.delete(key) || this.sets.delete(key);
    return Promise.resolve(existed ? 1 : 0);
  }
  sadd(key: string, member: string) {
    const set = this.sets.get(key) ?? new Set<string>();
    set.add(member);
    this.sets.set(key, set);
    return Promise.resolve(1);
  }
  srem(key: string, member: string) {
    const set = this.sets.get(key);
    set?.delete(member);
    if (set?.size === 0) this.sets.delete(key);
    return Promise.resolve(1);
  }
  smembers(key: string) {
    return Promise.resolve([...(this.sets.get(key) ?? [])]);
  }
  expire(key: string, ttl: number) {
    this.ttls.set(key, ttl);
    return Promise.resolve(1);
  }
  multi() {
    const queued: (() => Promise<unknown>)[] = [];
    const chain = new Proxy(
      {},
      {
        get: (_, name: string) => {
          if (name === "exec") {
            return async () => {
              const results: [null, unknown][] = [];
              for (const run of queued) results.push([null, await run()]);
              return results;
            };
          }
          return (...args: unknown[]) => {
            queued.push(() =>
              (
                this as unknown as Record<
                  string,
                  (...a: unknown[]) => Promise<unknown>
                >
              )[name](...args)
            );
            return chain;
          };
        }
      }
    );
    return chain;
  }
}

const REFRESH_TTL = 30 * 24 * 3600;

describe("SessionStore", () => {
  let client: FakeRedisClient;
  let store: SessionStore;

  beforeEach(() => {
    client = new FakeRedisClient();
    store = new SessionStore(
      { client } as unknown as Redis,
      { refreshTokenTtlSeconds: REFRESH_TTL } as AppConfigService
    );
  });

  it("defines the rotate script with its three keys", () => {
    expect(client.commands.get(ROTATE_COMMAND)).toEqual({
      numberOfKeys: 3,
      lua: ROTATE_SCRIPT
    });
    expect(ROTATE_SCRIPT).toContain("redis.call('GETDEL', KEYS[1])");
  });

  it("stores the OAuth state for 600 s and hands it out once", async () => {
    const entry = { codeVerifier: "v", returnTo: "/app", timeZone: null };
    await store.saveState("s", entry);

    expect(client.ttls.get("oauth:state:s")).toBe(600);
    await expect(store.takeState("s")).resolves.toEqual(entry);
    await expect(store.takeState("s")).resolves.toBeNull();
  });

  it("stores login codes hashed for 60 s, single use", async () => {
    const code = await store.createLoginCode("user-1");

    expect(code).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(client.ttls.get(`auth:code:${hashSecret(code)}`)).toBe(60);
    await expect(store.takeLoginCode(code)).resolves.toBe("user-1");
    await expect(store.takeLoginCode(code)).resolves.toBeNull();
  });

  it("starts a family with a hashed refresh token and the user's set", async () => {
    const token = await store.startFamily("user-1");
    const hash = hashSecret(token);

    const { familyId } = JSON.parse(
      client.strings.get(`auth:refresh:${hash}`)!
    ) as { familyId: string };
    expect(JSON.parse(client.strings.get(`auth:family:${familyId}`)!)).toEqual({
      userId: "user-1",
      current: hash
    });
    expect([...client.sets.get("auth:families:user-1")!]).toEqual([familyId]);
    expect(client.ttls.get(`auth:refresh:${hash}`)).toBe(REFRESH_TTL);
    expect(client.ttls.get("auth:families:user-1")).toBe(REFRESH_TTL);
  });

  it("rotates a live token and detects reuse of a rotated one", async () => {
    const r1 = await store.startFamily("user-1");
    const second = await store.rotate(r1);
    expect(second).toMatchObject({ userId: "user-1" });
    const r2 = second!.refreshToken;
    expect(r2).not.toBe(r1);

    const third = await store.rotate(r2);
    expect(third).not.toBeNull();

    await expect(store.rotate(r1)).resolves.toBeNull();
    await expect(store.rotate(third!.refreshToken)).resolves.toBeNull();
    expect(client.sets.get("auth:families:user-1")?.size ?? 0).toBe(0);
  });

  it("rotate returns null for an unknown token", async () => {
    await expect(store.rotate("unknown")).resolves.toBeNull();
  });

  it("rotate returns null when the token isn't its family's current one", async () => {
    const token = await store.startFamily("user-1");
    const hash = hashSecret(token);
    const { familyId } = JSON.parse(
      client.strings.get(`auth:refresh:${hash}`)!
    ) as { familyId: string };
    client.strings.set(
      `auth:family:${familyId}`,
      JSON.stringify({ userId: "user-1", current: "other" })
    );

    await expect(store.rotate(token)).resolves.toBeNull();
  });

  it("revokeByToken revokes the family of a live or a rotated token, and ignores unknown ones", async () => {
    const live = await store.startFamily("user-1");
    await store.revokeByToken(live);
    await expect(store.rotate(live)).resolves.toBeNull();

    const old = await store.startFamily("user-1");
    const { refreshToken: current } = (await store.rotate(old))!;
    await store.revokeByToken(old);
    await expect(store.rotate(current)).resolves.toBeNull();

    await expect(store.revokeByToken("unknown")).resolves.toBeUndefined();
  });

  it("revokeAll revokes only that user's families", async () => {
    const a1 = await store.startFamily("user-a");
    const a2 = await store.startFamily("user-a");
    const b = await store.startFamily("user-b");

    await store.revokeAll("user-a");

    await expect(store.rotate(a1)).resolves.toBeNull();
    await expect(store.rotate(a2)).resolves.toBeNull();
    await expect(store.rotate(b)).resolves.not.toBeNull();
    expect(client.sets.get("auth:families:user-a")?.size ?? 0).toBe(0);
  });

  it("revokeAll drops ids of expired families and never deletes the set", async () => {
    const live = await store.startFamily("user-a");
    client.sets.get("auth:families:user-a")!.add("expired-family");

    await store.revokeAll("user-a");

    await expect(store.rotate(live)).resolves.toBeNull();
    expect(client.sets.get("auth:families:user-a")?.size ?? 0).toBe(0);
    expect(client.deleted).not.toContain("auth:families:user-a");
  });
});
