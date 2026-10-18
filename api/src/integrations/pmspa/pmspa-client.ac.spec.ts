import { describe, expect, it, vi } from "vitest";
import type { AppConfigService } from "../../config/app-config.service.js";
import type { Redis } from "../../redis/redis.js";
import { FakePmspa } from "../../../test/support/fake-pmspa.js";
import type { PmspaAccountDto } from "./dto/pmspa-connection-response.dto.js";
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
const A = "https://pmspa.test";
const B = "https://other-pmspa.test";
const X = "65a1b2c3d4e5f6a7b8c9d0e1";
const Y = "65a1b2c3d4e5f6a7b8c9d0e2";
const ACCOUNT: PmspaAccountDto = {
  id: X,
  email: "a@pmspa.test",
  avatarUrl: null,
  role: "user"
};

/** A Redis fake over a Map, and a store with a fixed key. */
function storeSetup() {
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
  return { mem, crypto, store: new PmspaStore(redis, crypto) };
}

/** `PmspaClient` on the fake PMSPA, the store above and a repository fake; the row has no cached token. */
function clientSetup(row: Partial<PmspaConnectionRow>) {
  const { store, crypto } = storeSetup();
  const fake = new FakePmspa();
  fake.accounts.push({
    id: X,
    email: "a@pmspa.test",
    password: "secret",
    avatarUrl: null,
    role: "user"
  });
  const transport = new PmspaTransport(
    { check: () => Promise.resolve("ok") } as unknown as PmspaHostGuard,
    store,
    fake.fetch
  );
  const conn: PmspaConnectionRow = {
    userId: USER,
    url: A,
    email: "a@pmspa.test",
    passwordEnc: crypto.encrypt("secret"),
    status: "unreachable",
    pmspaUserId: X,
    lastCheckedAt: new Date(),
    lastSyncAt: null,
    ...row
  };
  const repo = {
    find: vi.fn(() => Promise.resolve(conn)),
    setStatus: vi.fn(() => Promise.resolve()),
    setStatusFor: vi.fn(() => Promise.resolve(true))
  };
  const spies = {
    setToken: vi.spyOn(store, "setToken"),
    setAccount: vi.spyOn(store, "setAccount"),
    clear: vi.spyOn(store, "clear")
  };
  const client = new PmspaClient(
    transport,
    store,
    repo as unknown as PmspaConnectionRepository,
    crypto
  );
  return { client, fake, repo, spies };
}

const who = { method: "POST", path: "/v1/auth" } as const;

describe("PMSPA token per connection (feat-int-followups)", () => {
  it("AC-4 FR-INT-003: the cached token and account read back only for the URL and email they were cached for; the old form is a miss", async () => {
    const { mem, crypto, store } = storeSetup();
    const owner = { url: A, email: "a@pmspa.test" };
    await store.setToken(USER, "token-a", owner);
    await store.setAccount(USER, ACCOUNT, owner);

    await expect(store.getToken(USER, owner)).resolves.toBe("token-a");
    await expect(store.getAccount(USER, owner)).resolves.toEqual(ACCOUNT);

    for (const other of [
      { url: A, email: "b@pmspa.test" },
      { url: B, email: "a@pmspa.test" }
    ]) {
      await expect(store.getToken(USER, other)).resolves.toBeNull();
      await expect(store.getAccount(USER, other)).resolves.toBeNull();
    }
    expect(mem.has(`pmspa:token:${USER}`)).toBe(true);
    expect(mem.has(`pmspa:account:${USER}`)).toBe(true);

    // Cached before the deploy: an encrypted bare token, the account without URL and email.
    mem.set(
      `pmspa:token:${USER}`,
      crypto.encrypt("token-old").toString("base64")
    );
    mem.set(`pmspa:account:${USER}`, JSON.stringify(ACCOUNT));
    await expect(store.getToken(USER, owner)).resolves.toBeNull();
    await expect(store.getAccount(USER, owner)).resolves.toBeNull();
  });

  it("AC-5 FR-INT-003: request caches for the row's URL and email, writes the status only while the row still has them, and rejects a re-login as another account", async () => {
    const owner = { url: A, email: "a@pmspa.test" };

    // Login, who-am-I X and the call succeed.
    const ok = clientSetup({});
    await expect(ok.client.request(USER, who)).resolves.toMatchObject({
      status: 200
    });
    expect(ok.spies.setToken).toHaveBeenCalledWith(
      USER,
      expect.any(String),
      owner
    );
    expect(ok.spies.setAccount).toHaveBeenCalledWith(
      USER,
      expect.objectContaining({ id: X }),
      owner
    );
    expect(ok.repo.setStatusFor).toHaveBeenCalledWith(USER, owner, "connected");

    // A 422 login while a Save or Test changed the row: the status write misses, the cache stays.
    const stale = clientSetup({ email: "gone@pmspa.test" });
    stale.repo.setStatusFor.mockResolvedValue(false);
    await expect(stale.client.request(USER, who)).rejects.toMatchObject({
      status: 409,
      slug: "pmspa-invalid-credentials"
    });
    expect(stale.repo.setStatusFor).toHaveBeenCalledWith(
      USER,
      { url: A, email: "gone@pmspa.test" },
      "invalid-credentials"
    );
    expect(stale.spies.clear).not.toHaveBeenCalled();

    // Who-am-I answers another account than the row's (D5).
    const switched = clientSetup({});
    switched.fake.accounts[0].id = Y;
    await expect(switched.client.request(USER, who)).rejects.toMatchObject({
      status: 409,
      slug: "pmspa-invalid-credentials"
    });
    expect(switched.repo.setStatusFor).toHaveBeenCalledWith(
      USER,
      owner,
      "invalid-credentials"
    );
    expect(switched.spies.clear).toHaveBeenCalledWith(USER);
    expect(switched.spies.setToken).not.toHaveBeenCalled();

    // No account saved yet: any account goes on.
    const first = clientSetup({ pmspaUserId: null });
    first.fake.accounts[0].id = Y;
    await expect(first.client.request(USER, who)).resolves.toMatchObject({
      status: 200
    });
  });
});
