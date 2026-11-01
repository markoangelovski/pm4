import { randomInt } from "node:crypto";
import { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { GoogleOidc } from "../src/auth/google-oidc.js";
import { RATE_LIMITS, type RateLimits } from "../src/rate-limit/rate-limits.js";
import { createTestApp } from "./create-test-app.js";
import {
  FAKE_GOOGLE_AUTHORIZE_URL,
  FakeGoogleOidc
} from "./fake-google-oidc.js";
import {
  accessTokenFor,
  closeTestClients,
  deleteTestUsers,
  insertUser,
  testRedis
} from "./support/auth-test-utils.js";

const WEB = process.env.WEB_APP_URL!;
const RATE_LIMITED_TYPE = `${WEB}/errors/rate-limited`;

/** Small limits, so each case needs only a few requests (spec *Acceptance criteria*). */
const SMALL_LIMITS: RateLimits = {
  windowMs: 60_000,
  limits: { google: 2, callback: 2, token: 2, refresh: 3, logout: 3, user: 4 }
};

/** AC-11: a 1 s window and one request per user. */
const SHORT_WINDOW: RateLimits = {
  windowMs: 1000,
  limits: { ...SMALL_LIMITS.limits, user: 1 }
};

/** A fresh client IP per case, so cases (and runs sharing Redis) never share a counter. */
function uniqueIp(): string {
  return `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
}

/** The sign-in failure redirect, with `returnTo` only when given. */
function signInError(error: string, returnTo?: string): string {
  const url = new URL("/auth/sign-in", WEB);
  url.searchParams.set("error", error);
  if (returnTo !== undefined) url.searchParams.set("returnTo", returnTo);
  return url.href;
}

/** Deletes every rate-limit counter, so a re-run within the window starts at 0. */
async function clearCounters(): Promise<void> {
  const redis = testRedis();
  let cursor = "0";
  do {
    const [next, keys] = await redis.scan(
      cursor,
      "MATCH",
      "rl:*",
      "COUNT",
      500
    );
    if (keys.length) await redis.del(...keys);
    cursor = next;
  } while (cursor !== "0");
}

describe("Rate limiting (feat-api-rate-limit)", () => {
  const fake = new FakeGoogleOidc();
  let app: NestExpressApplication;
  let shortWindowApp: NestExpressApplication;

  beforeAll(async () => {
    await clearCounters();
    app = await createTestApp([
      { provide: GoogleOidc, useValue: fake },
      { provide: RATE_LIMITS, useValue: SMALL_LIMITS }
    ]);
    shortWindowApp = await createTestApp([
      { provide: RATE_LIMITS, useValue: SHORT_WINDOW }
    ]);
  });

  afterAll(async () => {
    await deleteTestUsers();
    await clearCounters();
    await closeTestClients();
    await shortWindowApp?.close();
    await app?.close();
  });

  // ---------- helpers ----------

  /** A signed-in user: its id and access token. */
  async function newUser(): Promise<{ id: string; token: string }> {
    const user = await insertUser();
    return { id: user.id, token: accessTokenFor(user.id) };
  }

  function get(
    path: string,
    token: string | null,
    ip: string,
    target = app
  ): request.Test {
    const req = request(target.getHttpServer())
      .get(path)
      .set("X-Forwarded-For", ip);
    return token === null ? req : req.set("Authorization", `Bearer ${token}`);
  }

  function post(path: string, body: object, ip: string): request.Test {
    return request(app.getHttpServer())
      .post(path)
      .set("X-Forwarded-For", ip)
      .send(body);
  }

  const exchange = (ip: string) =>
    post("/api/v1/auth/token", { code: "unknown-login-code" }, ip);
  const refresh = (ip: string) =>
    post("/api/v1/auth/refresh", { refreshToken: "unknown-refresh-token" }, ip);
  const logout = (ip: string) =>
    post("/api/v1/auth/logout", { refreshToken: "unknown-refresh-token" }, ip);

  async function statuses(
    send: () => request.Test,
    times: number
  ): Promise<number[]> {
    const result: number[] = [];
    for (let i = 0; i < times; i++) result.push((await send()).status);
    return result;
  }

  // ---------- per user ----------

  it("AC-1 NFR-004: the 5th request of a user in the window → 429 rate-limited with retryAfterSeconds and Retry-After; the key expires within the window", async () => {
    const a = await newUser();
    const ip = uniqueIp();

    expect(
      await statuses(() => get("/api/v1/projects", a.token, ip), 4)
    ).toEqual([200, 200, 200, 200]);

    const response = await get("/api/v1/projects", a.token, ip);
    expect(response.status).toBe(429);
    expect(response.headers["content-type"]).toMatch(
      /^application\/problem\+json/
    );
    const body = response.body as { type: string; retryAfterSeconds: unknown };
    expect(body.type).toBe(RATE_LIMITED_TYPE);
    expect(Number.isInteger(body.retryAfterSeconds)).toBe(true);
    const seconds = body.retryAfterSeconds as number;
    expect(seconds).toBeGreaterThanOrEqual(1);
    expect(seconds).toBeLessThanOrEqual(60);
    expect(response.headers["retry-after"]).toBe(String(seconds));

    const pttl = await testRedis().pttl(`rl:user:u:${a.id}`);
    expect(pttl).toBeGreaterThan(0);
    expect(pttl).toBeLessThanOrEqual(60_000);
  });

  it("AC-2 NFR-004: one counter per user across endpoints", async () => {
    const a = await newUser();
    const ip = uniqueIp();

    for (const path of [
      "/api/v1/projects",
      "/api/v1/projects",
      "/api/v1/tasks",
      "/api/v1/tasks"
    ]) {
      expect((await get(path, a.token, ip)).status, path).toBe(200);
    }
    expect((await get("/api/v1/notes", a.token, ip)).status).toBe(429);
  });

  it("AC-3 NFR-004: counted per user, not per IP", async () => {
    const a = await newUser();
    const b = await newUser();
    const ip = uniqueIp();

    await statuses(() => get("/api/v1/projects", a.token, ip), 4);
    expect((await get("/api/v1/projects", a.token, ip)).status).toBe(429);

    expect((await get("/api/v1/projects", b.token, ip)).status).toBe(200);
    expect((await get("/api/v1/projects", a.token, uniqueIp())).status).toBe(
      429
    );
  });

  it("AC-4 NFR-004: requests without a valid token → 401 every time, never 429", async () => {
    const ip = uniqueIp();

    expect(await statuses(() => get("/api/v1/projects", null, ip), 6)).toEqual([
      401, 401, 401, 401, 401, 401
    ]);
    expect(
      await statuses(() => get("/api/v1/projects", "not-a-jwt", ip), 6)
    ).toEqual([401, 401, 401, 401, 401, 401]);
  });

  // ---------- auth routes, per IP ----------

  it("AC-5 NFR-004: POST /auth/token is limited per IP: 2 × 401, then 429; another IP → 401", async () => {
    const ip = uniqueIp();

    expect(await statuses(() => exchange(ip), 2)).toEqual([401, 401]);
    const limited = await exchange(ip);
    expect(limited.status).toBe(429);
    expect((limited.body as { type: string }).type).toBe(RATE_LIMITED_TYPE);
    expect(limited.headers["retry-after"]).toMatch(/^\d+$/);

    expect((await exchange(uniqueIp())).status).toBe(401);
  });

  it("AC-6 NFR-004: each auth route has its own counter per IP", async () => {
    const ip = uniqueIp();
    expect(await statuses(() => exchange(ip), 3)).toEqual([401, 401, 429]);

    expect(await statuses(() => refresh(ip), 4)).toEqual([401, 401, 401, 429]);
    expect(await statuses(() => logout(ip), 4)).toEqual([204, 204, 204, 429]);
  });

  it("AC-7 NFR-004: GET /auth/google over the limit → 302 to the sign-in page with error=rate-limited and a valid returnTo", async () => {
    const ip = uniqueIp();
    const start = (returnTo: string) =>
      get(
        `/api/v1/auth/google?returnTo=${encodeURIComponent(returnTo)}`,
        null,
        ip
      );

    for (let i = 0; i < 2; i++) {
      const response = await start("/app/projects");
      expect(response.status).toBe(302);
      expect(response.headers.location).toMatch(
        new RegExp(`^${FAKE_GOOGLE_AUTHORIZE_URL.replace(/[.?]/g, "\\$&")}`)
      );
    }

    const limited = await start("/app/projects");
    expect(limited.status).toBe(302);
    expect(limited.headers.location).toBe(
      `${WEB}/auth/sign-in?error=rate-limited&returnTo=%2Fapp%2Fprojects`
    );

    const evil = await start("//evil.test");
    expect(evil.status).toBe(302);
    expect(evil.headers.location).toBe(signInError("rate-limited"));
  });

  it("AC-8 NFR-004: GET /auth/google/callback over the limit → 302 to the sign-in page with error=rate-limited", async () => {
    const ip = uniqueIp();
    const callback = () =>
      get("/api/v1/auth/google/callback?code=x&state=y", null, ip);

    for (let i = 0; i < 2; i++) {
      const response = await callback();
      expect(response.status).toBe(302);
      expect(new URL(response.headers.location).searchParams.get("error")).toBe(
        "failed"
      );
    }

    const limited = await callback();
    expect(limited.status).toBe(302);
    expect(limited.headers.location).toBe(signInError("rate-limited"));
  });

  it("AC-9 NFR-004: /health and GET /api/v1/version are never rate limited", async () => {
    const ip = uniqueIp();

    const health = await statuses(() => get("/health", null, ip), 10);
    expect(health).not.toContain(429);
    const version = await statuses(() => get("/api/v1/version", null, ip), 10);
    expect(version).not.toContain(429);
  });

  it("AC-10 NFR-004: an X-Forwarded-For IPv4 with a :port counts as the same client", async () => {
    expect((await exchange("203.0.113.7:51234")).status).toBe(401);
    expect((await exchange("203.0.113.7:51235")).status).toBe(401);
    expect((await exchange("203.0.113.7")).status).toBe(429);
  });

  it("AC-11 NFR-004: the window resets: 200, 429, then 200 after the window", async () => {
    const a = await newUser();
    const ip = uniqueIp();
    const send = () => get("/api/v1/projects", a.token, ip, shortWindowApp);

    expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(429);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect((await send()).status).toBe(200);
  });
});
