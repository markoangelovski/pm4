import { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { PmspaClient } from "../src/integrations/pmspa/pmspa-client.js";
import { PmspaCrypto } from "../src/integrations/pmspa/pmspa-crypto.js";
import { DNS_LOOKUP } from "../src/integrations/pmspa/pmspa-host-guard.js";
import { PMSPA_FETCH } from "../src/integrations/pmspa/pmspa-transport.js";
import { createTestApp } from "./create-test-app.js";
import {
  accessTokenFor,
  closeTestClients,
  deleteTestUsers,
  insertUser,
  testDb,
  testRedis,
  type UserRow
} from "./support/auth-test-utils.js";
import {
  FakePmspa,
  fakeLookup,
  type FakePmspaAccount
} from "./support/fake-pmspa.js";
import { findProjectRow, insertProject } from "./support/project-test-utils.js";

const errorType = (slug: string) => `${process.env.WEB_APP_URL}/errors/${slug}`;

const PMSPA_URL = "https://pmspa.test";
const PMSPA_HOST = "pmspa.test";
const UNSPLASH_AVATAR = "https://images.unsplash.com/photo-1?w=150";

const accountX = (): FakePmspaAccount => ({
  id: "65f1a0c0ffee00000000000a",
  email: "x@pmspa.test",
  password: "secret",
  avatarUrl: UNSPLASH_AVATAR,
  role: "admin"
});
const accountY = (): FakePmspaAccount => ({
  id: "65f1a0c0ffee00000000000b",
  email: "y@pmspa.test",
  password: "secret",
  avatarUrl: "https://example.com/y.png",
  role: "user"
});

const NOT_CONFIGURED = {
  status: "not-configured",
  url: null,
  email: null,
  account: null,
  lastCheckedAt: null,
  lastSyncAt: null,
  rateLimit: null
};

interface AccountBody {
  id: string;
  email: string;
  avatarUrl: string | null;
  role: string;
}

/** Any response body these tests read: a connection or a Problem. */
interface Body {
  status: string | number;
  url: string | null;
  email: string | null;
  account: AccountBody | null;
  lastCheckedAt: string | null;
  lastSyncAt: string | null;
  type: string;
  errors?: { field: string; message: string }[];
  retryAfterSeconds?: number;
  linkCount?: number;
  accountEmail?: string;
}

interface Res {
  status: number;
  body: Body;
}

async function send(req: request.Test): Promise<Res> {
  const response = await req;
  return { status: response.status, body: response.body as Body };
}

interface ConnectionRow {
  status: string;
  pmspa_user_id: string | null;
  url: string;
  email: string;
  password_enc: Buffer;
  last_checked_at: Date;
  last_sync_at: Date | null;
}

async function findConnection(userId: string): Promise<ConnectionRow | null> {
  const result = await testDb().query<ConnectionRow>(
    `SELECT status, encode(pmspa_user_id, 'hex') AS pmspa_user_id, url, email,
            password_enc, last_checked_at, last_sync_at
     FROM pmspa_connections WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] ?? null;
}

/** A project link of `userId`'s project to a PMSPA project of account `pmspaUserId`. */
async function insertProjectLink(
  userId: string,
  projectId: string,
  pmspaUserId: string
): Promise<void> {
  await testDb().query(
    `INSERT INTO pmspa_project_links
       (synced_at, origin, project_id, user_id, pmspa_user_id, pmspa_id, pm4_hash, pmspa_hash)
     VALUES (now(), 'imported', $1, $2, decode($3, 'hex'), decode($4, 'hex'),
             decode('0011223344556677', 'hex'), decode('8899aabbccddeeff', 'hex'))`,
    [projectId, userId, pmspaUserId, "65f1a0c0ffee0000000000f1"]
  );
}

async function countProjectLinks(userId: string): Promise<number> {
  const result = await testDb().query<{ n: number }>(
    "SELECT count(*)::int AS n FROM pmspa_project_links WHERE user_id = $1",
    [userId]
  );
  return result.rows[0].n;
}

const tokenKey = (userId: string) => `pmspa:token:${userId}`;
const accountKey = (userId: string) => `pmspa:account:${userId}`;
const pauseKey = `pmspa:pause:${PMSPA_HOST}`;

/** `value` in every text encoding a careless store might use. */
const encodings = (value: string): Buffer[] =>
  (["utf8", "hex", "base64", "base64url"] as const).map((e) =>
    Buffer.from(Buffer.from(value).toString(e))
  );

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("PMSPA connection API (feat-int-conn-api)", () => {
  let app: NestExpressApplication;
  let fake: FakePmspa;
  const userIds: string[] = [];

  beforeAll(async () => {
    // The app keeps one fetch; it forwards to the current test's fake.
    const fetchViaFake: typeof globalThis.fetch = (input, init) =>
      fake.fetch(input, init);
    app = await createTestApp([
      { provide: PMSPA_FETCH, useValue: fetchViaFake },
      { provide: DNS_LOOKUP, useValue: fakeLookup }
    ]);
  });

  beforeEach(async () => {
    fake = new FakePmspa();
    fake.accounts = [accountX(), accountY()];
    await testRedis().del(pauseKey);
  });

  afterAll(async () => {
    const keys = userIds.flatMap((id) => [tokenKey(id), accountKey(id)]);
    if (keys.length > 0) await testRedis().del(...keys);
    await testRedis().del(pauseKey);
    await deleteTestUsers();
    await closeTestClients();
    await app.close();
  });

  const newUser = async (): Promise<UserRow> => {
    const user = await insertUser();
    userIds.push(user.id);
    return user;
  };

  /** Supertest with `user`'s bearer token; resolves to a typed response. */
  const as = (user: UserRow) => {
    const server = app.getHttpServer();
    const auth = `Bearer ${accessTokenFor(user.id)}`;
    return {
      get: () =>
        send(
          request(server)
            .get("/api/v1/integrations/pmspa")
            .set("Authorization", auth)
        ),
      put: (body: object) =>
        send(
          request(server)
            .put("/api/v1/integrations/pmspa")
            .set("Authorization", auth)
            .send(body)
        ),
      test: () =>
        send(
          request(server)
            .post("/api/v1/integrations/pmspa/test")
            .set("Authorization", auth)
        ),
      delete: () =>
        send(
          request(server)
            .delete("/api/v1/integrations/pmspa")
            .set("Authorization", auth)
        )
    };
  };

  /** Saves a connection to `PMSPA_URL` as account X (or `email`) with password `secret`. */
  const connect = async (user: UserRow, email = "x@pmspa.test") => {
    const res = await as(user).put({
      url: PMSPA_URL,
      email,
      password: "secret"
    });
    expect(res.status).toBe(200);
    return res;
  };

  const logins = () => fake.callsTo("POST", "/v1/auth/login").length;

  it("AC-1 API-INT-001: no connection → 200 not-configured", async () => {
    const a = await newUser();

    const res = await as(a).get();

    expect(res.status).toBe(200);
    expect(res.body).toEqual(NOT_CONFIGURED);
  });

  it("AC-2 API-INT-002 FR-INT-004: saving valid credentials → connected with the account; no password or token in any response", async () => {
    const a = await newUser();
    const before = Date.now();

    const saved = await as(a).put({
      url: PMSPA_URL,
      email: "x@pmspa.test",
      password: "secret"
    });

    expect(saved.status).toBe(200);
    expect(saved.body).toEqual({
      status: "connected",
      url: PMSPA_URL,
      email: "x@pmspa.test",
      account: {
        id: accountX().id,
        email: "x@pmspa.test",
        avatarUrl: UNSPLASH_AVATAR,
        role: "admin"
      },
      lastCheckedAt: expect.any(String) as string,
      lastSyncAt: null,
      rateLimit: null
    });
    const checkedAt = Date.parse(saved.body.lastCheckedAt!);
    expect(checkedAt).toBeGreaterThanOrEqual(before - 1000);
    expect(checkedAt).toBeLessThanOrEqual(Date.now() + 1000);

    const read = await as(a).get();
    expect(read.status).toBe(200);
    expect(read.body).toEqual(saved.body);

    expect(fake.issuedTokens.length).toBeGreaterThan(0);
    for (const text of [
      JSON.stringify(saved.body),
      JSON.stringify(read.body)
    ]) {
      expect(text).not.toContain("secret");
      for (const token of fake.issuedTokens) expect(text).not.toContain(token);
    }
  });

  it("AC-3 FR-INT-003: the password and the token are stored encrypted", async () => {
    const a = await newUser();
    await connect(a);

    const row = await findConnection(a.id);
    expect(row).not.toBeNull();
    for (const encoded of encodings("secret")) {
      expect(row!.password_enc.includes(encoded)).toBe(false);
    }
    expect(app.get(PmspaCrypto).decrypt(row!.password_enc)).toBe("secret");

    const cached = await testRedis().getBuffer(tokenKey(a.id));
    expect(cached).not.toBeNull();
    const token = fake.issuedTokens.at(-1)!;
    for (const encoded of encodings(token)) {
      expect(cached!.includes(encoded)).toBe(false);
    }
  });

  it("AC-4 FR-INT-002 FR-INT-004: rejected credentials and an unreachable PMSPA are stored with their status", async () => {
    const wrong = await newUser();
    const rejected = await as(wrong).put({
      url: PMSPA_URL,
      email: "x@pmspa.test",
      password: "wrong"
    });
    expect(rejected.status).toBe(200);
    expect(rejected.body.status).toBe("invalid-credentials");
    expect(rejected.body.account).toBeNull();
    expect((await findConnection(wrong.id))?.status).toBe(
      "invalid-credentials"
    );

    const offline = await newUser();
    fake.unreachable = true;
    const unreachable = await as(offline).put({
      url: PMSPA_URL,
      email: "x@pmspa.test",
      password: "secret"
    });
    expect(unreachable.status).toBe(200);
    expect(unreachable.body.status).toBe("unreachable");
    expect(unreachable.body.account).toBeNull();
    expect((await findConnection(offline.id))?.status).toBe("unreachable");
  });

  it.each([
    [{ url: "http://pmspa.test" }, "url"],
    [{ url: "https://localhost" }, "url"],
    [{ url: "https://10.0.0.5" }, "url"],
    [{ url: "https://internal.test" }, "url"],
    [{ url: "pmspa.test" }, "url"],
    [{ email: "nope" }, "email"],
    [{ password: undefined }, "password"]
  ])(
    "AC-5 API-INT-002 FR-INT-002: %o → 400 naming %s, nothing stored",
    async (change, field) => {
      const a = await newUser();
      const body = {
        url: PMSPA_URL,
        email: "x@pmspa.test",
        password: "secret",
        ...change
      };

      const res = await as(a).put(body);

      expect(res.status).toBe(400);
      expect(res.body.errors?.map((e) => e.field)).toContain(field);
      expect(await findConnection(a.id)).toBeNull();
      expect(fake.calls).toEqual([]);
    }
  );

  it("AC-6 API-INT-002: saving without a password keeps the stored one", async () => {
    const a = await newUser();
    await connect(a);
    const before = fake.calls.length;

    const res = await as(a).put({ url: PMSPA_URL, email: "x@pmspa.test" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("connected");
    const login = fake.calls
      .slice(before)
      .find((c) => c.method === "POST" && c.path === "/v1/auth/login");
    expect(login?.body).toEqual({ email: "x@pmspa.test", password: "secret" });
  });

  it("AC-7 FR-INT-002: another account with links → 409 pmspa-account-switch; confirmed → the old links go, the PM4 project stays", async () => {
    const a = await newUser();
    await connect(a);
    const project = await insertProject(a.id, { title: "Nvidia" });
    await insertProjectLink(a.id, project.id, accountX().id);
    const rowBefore = await findConnection(a.id);

    const refused = await as(a).put({
      url: PMSPA_URL,
      email: "y@pmspa.test",
      password: "secret"
    });

    expect(refused.status).toBe(409);
    expect(refused.body.type).toBe(errorType("pmspa-account-switch"));
    expect(refused.body.linkCount).toBe(1);
    expect(refused.body.accountEmail).toBe("y@pmspa.test");
    expect(await findConnection(a.id)).toEqual(rowBefore);
    expect(await countProjectLinks(a.id)).toBe(1);
    expect((await as(a).get()).body.account?.id).toBe(accountX().id);

    const confirmed = await as(a).put({
      url: PMSPA_URL,
      email: "y@pmspa.test",
      password: "secret",
      confirmAccountSwitch: true
    });

    expect(confirmed.status).toBe(200);
    expect(confirmed.body.status).toBe("connected");
    expect(confirmed.body.account?.id).toBe(accountY().id);
    expect((await findConnection(a.id))?.pmspa_user_id).toBe(accountY().id);
    expect(await countProjectLinks(a.id)).toBe(0);
    expect(await findProjectRow(project.id)).not.toBeNull();
  });

  it("AC-8 FR-INT-004: an avatar that isn't on images.unsplash.com → avatarUrl null", async () => {
    const a = await newUser();

    const res = await connect(a, "y@pmspa.test");

    expect(res.body.account).toEqual({
      id: accountY().id,
      email: "y@pmspa.test",
      avatarUrl: null,
      role: "user"
    });
  });

  it("AC-9 API-INT-003: Test logs in again and writes the status; a changed password → invalid-credentials; no row → 404", async () => {
    const a = await newUser();
    const saved = await connect(a);
    const loginsBefore = logins();
    await wait(20);

    const tested = await as(a).test();

    expect(tested.status).toBe(200);
    expect(tested.body.status).toBe("connected");
    expect(logins()).toBe(loginsBefore + 1);
    expect(Date.parse(tested.body.lastCheckedAt!)).toBeGreaterThan(
      Date.parse(saved.body.lastCheckedAt!)
    );

    fake.accounts[0].password = "changed";
    const rejected = await as(a).test();

    expect(rejected.status).toBe(200);
    expect(rejected.body.status).toBe("invalid-credentials");
    expect(rejected.body.account).toBeNull();

    const none = await newUser();
    expect((await as(none).test()).status).toBe(404);
  });

  it("AC-10 API-INT-004 FR-INT-005: Disconnect deletes the row and the cached token and account, keeps the links, and is idempotent", async () => {
    const a = await newUser();
    await connect(a);
    const project = await insertProject(a.id, { title: "Tesla" });
    await insertProjectLink(a.id, project.id, accountX().id);

    const res = await as(a).delete();

    expect(res.status).toBe(204);
    expect((await as(a).get()).body).toEqual(NOT_CONFIGURED);
    expect(await testRedis().exists(tokenKey(a.id), accountKey(a.id))).toBe(0);
    expect(await countProjectLinks(a.id)).toBe(1);
    expect((await as(a).delete()).status).toBe(204);
  });

  it("AC-11 FR-INT-003: an expired token → one new login, the call is resent once and succeeds", async () => {
    const a = await newUser();
    await connect(a);
    const cachedBefore = await testRedis().getBuffer(tokenKey(a.id));
    fake.expireTokens();
    const loginsBefore = logins();

    const res = await app
      .get(PmspaClient)
      .request(a.id, { method: "GET", path: "/v1/projects" });

    // The fake has no /v1/projects yet: 404 is PMSPA's answer to a valid token.
    expect(res.status).toBe(404);
    expect(logins()).toBe(loginsBefore + 1);
    expect(fake.callsTo("GET", "/v1/projects")).toHaveLength(2);
    const cachedAfter = await testRedis().getBuffer(tokenKey(a.id));
    expect(cachedAfter).not.toBeNull();
    expect(cachedAfter!.equals(cachedBefore!)).toBe(false);
  });

  it("AC-12 FR-INT-004: a call updates the status only when it changes", async () => {
    const a = await newUser();
    await connect(a);
    const client = app.get(PmspaClient);
    const call = () =>
      client.request(a.id, { method: "GET", path: "/v1/projects" });

    fake.unreachable = true;
    await expect(call()).rejects.toMatchObject({ slug: "pmspa-unreachable" });
    expect((await findConnection(a.id))?.status).toBe("unreachable");

    fake.unreachable = false;
    await call();
    const reconnected = await findConnection(a.id);
    expect(reconnected?.status).toBe("connected");

    await wait(20);
    await call();
    const unchanged = await findConnection(a.id);
    expect(unchanged?.status).toBe("connected");
    expect(unchanged?.last_checked_at.getTime()).toBe(
      reconnected?.last_checked_at.getTime()
    );
  });

  it("AC-13 FR-INT-014: a 429 → 503 pmspa-rate-limited, and the host stays paused for every user", async () => {
    const a = await newUser();
    const b = await newUser();
    await connect(a);
    fake.rateLimitOnce = 600;

    const limited = await as(a).test();

    expect(limited.status).toBe(503);
    expect(limited.body.type).toBe(errorType("pmspa-rate-limited"));
    expect(limited.body.retryAfterSeconds).toBe(600);

    const callsBefore = fake.calls.length;
    const paused = await as(b).put({
      url: PMSPA_URL,
      email: "x@pmspa.test",
      password: "secret"
    });

    expect(paused.status).toBe(503);
    expect(paused.body.type).toBe(errorType("pmspa-rate-limited"));
    expect(fake.calls.length).toBe(callsBefore);
  });

  it("AC-14 API-INT-001…004: another user never sees the connection; every endpoint needs a token", async () => {
    const a = await newUser();
    const b = await newUser();
    await connect(a);

    expect((await as(b).get()).body).toEqual(NOT_CONFIGURED);

    const server = app.getHttpServer();
    const path = "/api/v1/integrations/pmspa";
    // Lazy: supertest starts and closes its own listener per request.
    const anonymous = [
      () => request(server).get(path),
      () =>
        request(server)
          .put(path)
          .send({ url: PMSPA_URL, email: "x@pmspa.test", password: "secret" }),
      () => request(server).post(`${path}/test`),
      () => request(server).delete(path)
    ];
    for (const call of anonymous) expect((await call()).status).toBe(401);
    expect((await findConnection(a.id))?.status).toBe("connected");
  });

  it("AC-18 FR-INT-003: a save or Test that doesn't connect clears the cached token and account", async () => {
    const a = await newUser();
    const cached = () => testRedis().exists(tokenKey(a.id), accountKey(a.id));

    await connect(a);
    expect(await cached()).toBe(2);
    const wrong = await as(a).put({
      url: PMSPA_URL,
      email: "x@pmspa.test",
      password: "wrong"
    });
    expect(wrong.body.status).toBe("invalid-credentials");
    expect(await cached()).toBe(0);

    await connect(a);
    expect(await cached()).toBe(2);
    fake.unreachable = true;
    const offline = await as(a).put({
      url: PMSPA_URL,
      email: "x@pmspa.test",
      password: "secret"
    });
    expect(offline.body.status).toBe("unreachable");
    expect(await cached()).toBe(0);
    fake.unreachable = false;

    await connect(a);
    expect(await cached()).toBe(2);
    fake.accounts[0].password = "changed";
    const rejected = await as(a).test();
    expect(rejected.body.status).toBe("invalid-credentials");
    expect(await cached()).toBe(0);
    fake.accounts[0].password = "secret";

    await connect(a);
    expect(await cached()).toBe(2);
    fake.accounts[0].id = "65f1a0c0ffee00000000000c";
    const switched = await as(a).test();
    expect(switched.status).toBe(200);
    expect(switched.body.status).toBe("invalid-credentials");
    expect(await cached()).toBe(0);
  });

  it("AC-19 FR-INT-003 FR-INT-004: a stored password that no longer decrypts counts as invalid credentials", async () => {
    const a = await newUser();
    await connect(a);
    await testDb().query(
      "UPDATE pmspa_connections SET password_enc = $1 WHERE user_id = $2",
      [Buffer.alloc(40, 9), a.id]
    );
    // The token key goes so `request` has to log in; the account key stays to show it's cleared.
    await testRedis().del(tokenKey(a.id));
    expect(await testRedis().exists(accountKey(a.id))).toBe(1);
    const rowBefore = await findConnection(a.id);
    const callsBefore = fake.calls.length;

    const unsaved = await as(a).put({ url: PMSPA_URL, email: "x@pmspa.test" });
    expect(unsaved.status).toBe(400);
    expect(unsaved.body.errors?.map((e) => e.field)).toContain("password");
    expect(await findConnection(a.id)).toEqual(rowBefore);

    await expect(
      app
        .get(PmspaClient)
        .request(a.id, { method: "GET", path: "/v1/projects" })
    ).rejects.toMatchObject({ slug: "pmspa-invalid-credentials" });
    expect((await findConnection(a.id))?.status).toBe("invalid-credentials");
    expect(await testRedis().exists(tokenKey(a.id), accountKey(a.id))).toBe(0);

    await testRedis().set(accountKey(a.id), "{}");
    const tested = await as(a).test();
    expect(tested.status).toBe(200);
    expect(tested.body.status).toBe("invalid-credentials");
    expect(await testRedis().exists(tokenKey(a.id), accountKey(a.id))).toBe(0);
    expect(fake.calls.length).toBe(callsBefore);

    const saved = await connect(a);
    expect(saved.body.status).toBe("connected");
  });
});
