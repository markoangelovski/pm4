import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfigService } from "../../config/app-config.service.js";
import type { Redis } from "../../redis/redis.js";
import { FakePmspa } from "../../../test/support/fake-pmspa.js";
import { PmspaClient } from "./pmspa-client.js";
import type {
  PmspaConnectionRepository,
  PmspaConnectionRow
} from "./pmspa-connection.repository.js";
import { PmspaCrypto } from "./pmspa-crypto.js";
import type { PmspaHostGuard } from "./pmspa-host-guard.js";
import { PmspaStore } from "./pmspa-store.js";
import { PmspaTransport } from "./pmspa-transport.js";

const USER = "11111111-1111-4111-8111-111111111111";
const URL_ = "https://pmspa.test";
const XID = "65a1b2c3d4e5f6a7b8c9d0e1";
const OWNER = { url: URL_, email: "x@pmspa.test" };

function setup(status: PmspaConnectionRow["status"] = "connected") {
  const mem = new Map<string, string>();
  const redis = {
    client: {
      get: (k: string) => Promise.resolve(mem.get(k) ?? null),
      set: (k: string, v: string) => (mem.set(k, v), Promise.resolve("OK")),
      del: (...ks: string[]) => (
        ks.forEach((k) => mem.delete(k)),
        Promise.resolve(1)
      ),
      pttl: () => Promise.resolve(-2)
    }
  } as unknown as Redis;
  const crypto = new PmspaCrypto({
    pmspaEncryptionKey: Buffer.alloc(32, 7)
  } as unknown as AppConfigService);
  const store = new PmspaStore(redis, crypto);
  const fake = new FakePmspa();
  fake.accounts.push({
    id: XID,
    email: "x@pmspa.test",
    password: "secret",
    avatarUrl: "http://evil.test/a.png",
    role: "user"
  });
  const transport = new PmspaTransport(
    { check: () => Promise.resolve("ok") } as unknown as PmspaHostGuard,
    store,
    fake.fetch
  );
  let row: PmspaConnectionRow | null = {
    userId: USER,
    url: URL_,
    email: "x@pmspa.test",
    passwordEnc: crypto.encrypt("secret"),
    status,
    pmspaUserId: XID,
    lastCheckedAt: new Date(),
    lastSyncAt: null
  };
  const repo = {
    find: vi.fn(() => Promise.resolve(row)),
    setStatusFor: vi.fn(
      (
        _u: string,
        _o: { url: string; email: string },
        s: PmspaConnectionRow["status"]
      ) => {
        if (row) row.status = s;
        return Promise.resolve(true);
      }
    )
  };
  const client = new PmspaClient(
    transport,
    store,
    repo as unknown as PmspaConnectionRepository,
    crypto
  );
  return {
    client,
    fake,
    repo,
    store,
    crypto,
    clearRow: () => (row = null),
    setRow: (r: Partial<PmspaConnectionRow>) => Object.assign(row!, r)
  };
}

const who = { method: "POST", path: "/v1/auth" } as const;

describe("PmspaClient", () => {
  let s: ReturnType<typeof setup>;
  beforeEach(() => {
    s = setup();
  });

  it("check: connected with the account; non-unsplash avatar is null", async () => {
    const r = await s.client.check(URL_, "x@pmspa.test", "secret");
    expect(r).toMatchObject({
      status: "connected",
      account: { id: XID, avatarUrl: null, role: "user" }
    });
  });

  it("check: wrong password or unknown user is invalid-credentials", async () => {
    await expect(s.client.check(URL_, "x@pmspa.test", "no")).resolves.toEqual({
      status: "invalid-credentials"
    });
    await expect(s.client.check(URL_, "y@pmspa.test", "no")).resolves.toEqual({
      status: "invalid-credentials"
    });
  });

  it("check: unreachable, and a rate limit throws", async () => {
    s.fake.unreachable = true;
    await expect(
      s.client.check(URL_, "x@pmspa.test", "secret")
    ).resolves.toEqual({ status: "unreachable" });
    s.fake.unreachable = false;
    s.fake.rateLimitOnce = 5;
    await expect(
      s.client.check(URL_, "x@pmspa.test", "secret")
    ).rejects.toMatchObject({ status: 503 });
  });

  it("request: not connected without a row", async () => {
    s.clearRow();
    await expect(s.client.request(USER, who)).rejects.toMatchObject({
      status: 409
    });
  });

  it("request: logs in once, then reuses the cached token", async () => {
    await s.client.request(USER, who);
    await s.client.request(USER, who);
    expect(s.fake.callsTo("POST", "/v1/auth/login")).toHaveLength(1);
  });

  it("request: a re-login does not cache when the connection's email changed meanwhile", async () => {
    const row = await s.repo.find();
    s.repo.find
      .mockResolvedValueOnce(row)
      .mockResolvedValueOnce({ ...row!, email: "other@pmspa.test" });
    const res = await s.client.request(USER, who);
    expect(res.status).toBe(200);
    await expect(s.store.getToken(USER, OWNER)).resolves.toBeNull();
    await expect(s.store.getAccount(USER, OWNER)).resolves.toBeNull();
  });

  it("request: a re-login does not cache when the connection was removed meanwhile", async () => {
    const row = await s.repo.find();
    s.repo.find.mockResolvedValueOnce(row).mockResolvedValueOnce(null);
    const res = await s.client.request(USER, who);
    expect(res.status).toBe(200);
    await expect(s.store.getToken(USER, OWNER)).resolves.toBeNull();
    await expect(s.store.getAccount(USER, OWNER)).resolves.toBeNull();
  });

  it("request: logs in again once after a token error", async () => {
    await s.client.request(USER, who);
    s.fake.expireTokens();
    const res = await s.client.request(USER, who);
    expect(res.status).toBe(200);
    expect(s.fake.callsTo("POST", "/v1/auth/login")).toHaveLength(2);
  });

  it("request: invalid credentials update the status and clear the cache", async () => {
    s.setRow({ passwordEnc: s.crypto.encrypt("changed") });
    await expect(s.client.request(USER, who)).rejects.toMatchObject({
      status: 409
    });
    expect(s.repo.setStatusFor).toHaveBeenCalledWith(
      USER,
      OWNER,
      "invalid-credentials"
    );
    await expect(s.store.getToken(USER, OWNER)).resolves.toBeNull();
  });

  it("request: an undecryptable password is invalid credentials without calling PMSPA", async () => {
    s.setRow({ passwordEnc: Buffer.from("garbage") });
    await expect(s.client.request(USER, who)).rejects.toMatchObject({
      status: 409
    });
    expect(s.repo.setStatusFor).toHaveBeenCalledWith(
      USER,
      OWNER,
      "invalid-credentials"
    );
    expect(s.fake.callsTo("POST", "/v1/auth/login")).toHaveLength(0);
    await expect(s.store.getToken(USER, OWNER)).resolves.toBeNull();
  });

  it("request: an undecryptable password after an expired token is invalid credentials", async () => {
    await s.client.request(USER, who);
    s.fake.expireTokens();
    s.setRow({ passwordEnc: Buffer.from("garbage") });
    await expect(s.client.request(USER, who)).rejects.toMatchObject({
      status: 409
    });
    expect(s.fake.callsTo("POST", "/v1/auth/login")).toHaveLength(1);
    expect(s.repo.setStatusFor).toHaveBeenCalledWith(
      USER,
      OWNER,
      "invalid-credentials"
    );
    await expect(s.store.getToken(USER, OWNER)).resolves.toBeNull();
  });

  it("request: unreachable sets the status; a response restores connected", async () => {
    s.fake.unreachable = true;
    await expect(s.client.request(USER, who)).rejects.toMatchObject({
      status: 502
    });
    expect(s.repo.setStatusFor).toHaveBeenCalledWith(
      USER,
      OWNER,
      "unreachable"
    );
    s.fake.unreachable = false;
    await s.client.request(USER, who);
    expect(s.repo.setStatusFor).toHaveBeenLastCalledWith(
      USER,
      OWNER,
      "connected"
    );
  });
});
