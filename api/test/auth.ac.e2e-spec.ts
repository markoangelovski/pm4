import { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import type { GoogleProfile } from "../src/auth/google-oidc.js";
import {
  FAKE_GOOGLE_AUTHORIZE_URL,
  FakeGoogleOidc
} from "./fake-google-oidc.js";
import {
  closeTestClients,
  createAuthTestApp,
  deleteTestUsers,
  deleteUser,
  findUserByEmail,
  findUserById,
  googleProfile,
  pkceChallenge,
  sha256Hex,
  testRedis
} from "./support/auth-test-utils.js";

const WEB = process.env.WEB_APP_URL!;
const OWNER_EMAIL = "owner@example.com";
const REFRESH_TTL_SECONDS = 30 * 24 * 3600; // REFRESH_TOKEN_TTL default (30d)

interface TokenPair {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
}

interface StartOptions {
  returnTo?: string;
  timeZone?: string;
}

describe("Auth: Google sign-in, login codes, refresh and sign-out (feat-auth-api-session)", () => {
  const fake = new FakeGoogleOidc();
  let app: NestExpressApplication;
  let allowListApp: NestExpressApplication;

  beforeAll(async () => {
    await deleteTestUsers([OWNER_EMAIL]);
    app = await createAuthTestApp(fake);
    // Same Postgres and Redis, but sign-in restricted to the owner (AC-14, AC-18).
    allowListApp = await createAuthTestApp(fake, {
      AUTH_ALLOWED_EMAILS: "Owner@Example.com"
    });
  });

  afterAll(async () => {
    await deleteTestUsers([OWNER_EMAIL]);
    await closeTestClients();
    await allowListApp?.close();
    await app?.close();
  });

  // ---------- flow helpers ----------

  /** API-AUTH-001: returns the response and the state handed to Google. */
  async function start(
    target: NestExpressApplication,
    options: StartOptions = {}
  ) {
    const response = await request(target.getHttpServer())
      .get("/api/v1/auth/google")
      .query(options);
    expect(response.status, "GET /api/v1/auth/google").toBe(302);
    return { response, state: fake.lastState };
  }

  /** API-AUTH-002 with `query` (already encoded). */
  function callback(target: NestExpressApplication, query: string) {
    return request(target.getHttpServer()).get(
      `/api/v1/auth/google/callback?${query}`
    );
  }

  /** Start + Google returns `profile` + callback. Returns the callback's Location. */
  async function completeGoogle(
    profile: GoogleProfile | Error,
    options: StartOptions = {},
    target = app
  ): Promise<{ location: string; state: string }> {
    const { state } = await start(target, options);
    fake.nextResult = profile;
    const response = await callback(
      target,
      `code=google-code&state=${encodeURIComponent(state)}`
    );
    expect(response.status).toBe(302);
    return { location: response.headers.location, state };
  }

  /** The login code from a success redirect. */
  function loginCodeFrom(location: string): string {
    const url = new URL(location);
    expect(`${url.origin}${url.pathname}`).toBe(`${WEB}/auth/callback`);
    const code = url.searchParams.get("code");
    expect(code).toBeTruthy();
    return code!;
  }

  function exchangeCode(code: unknown, target = app) {
    return request(target.getHttpServer())
      .post("/api/v1/auth/token")
      .send({ code });
  }

  /** The whole sign-in: Google → login code → token pair. */
  async function signIn(
    profile: GoogleProfile,
    options: StartOptions = {},
    target = app
  ): Promise<TokenPair> {
    const { location } = await completeGoogle(profile, options, target);
    const response = await exchangeCode(loginCodeFrom(location), target);
    expect(response.status).toBe(200);
    return response.body as TokenPair;
  }

  function refresh(refreshToken: string, target = app) {
    return request(target.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({ refreshToken });
  }

  function logout(refreshToken: string) {
    return request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .send({ refreshToken });
  }

  function getMe(accessToken: string) {
    return request(app.getHttpServer())
      .get("/api/v1/me")
      .set("Authorization", `Bearer ${accessToken}`);
  }

  /** The sign-in failure redirect, with `returnTo` only when given. */
  function signInError(error: string, returnTo?: string): string {
    const url = new URL("/auth/sign-in", WEB);
    url.searchParams.set("error", error);
    if (returnTo !== undefined) url.searchParams.set("returnTo", returnTo);
    return url.href;
  }

  // ---------- API-AUTH-001 / 002: sign-in ----------

  it("AC-7 FR-AUTH-001: GET /auth/google → 302 to Google with state and PKCE challenge; state stored ≤ 10 min", async () => {
    const { response, state } = await start(app, {
      returnTo: "/app/projects",
      timeZone: "Europe/Zagreb"
    });

    expect(response.status).toBe(302);
    const location = new URL(response.headers.location);
    expect(`${location.origin}${location.pathname}`).toBe(
      FAKE_GOOGLE_AUTHORIZE_URL
    );
    const call = fake.authorizationCalls.at(-1)!;
    expect(location.searchParams.get("state")).toBe(call.state);
    expect(call.state).toBe(state);
    expect(call.state.length).toBeGreaterThan(0);
    expect(call.codeChallenge.length).toBeGreaterThan(0);

    const ttl = await testRedis().ttl(`oauth:state:${state}`);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(600);
  });

  it("AC-8 FR-AUTH-001: new user, happy path: callback → login code → tokens → GET /me", async () => {
    const profile = googleProfile();
    const { location, state } = await completeGoogle(profile, {
      returnTo: "/app/projects",
      timeZone: "Europe/Zagreb"
    });

    const code = loginCodeFrom(location);
    expect(location).toBe(
      `${WEB}/auth/callback?code=${encodeURIComponent(code)}&returnTo=%2Fapp%2Fprojects`
    );

    // PKCE: the verifier given to Google's token call matches the challenge.
    const authorization = fake.authorizationCalls.at(-1)!;
    const exchange = fake.exchangeCalls.at(-1)!;
    expect(exchange.check.state).toBe(state);
    expect(pkceChallenge(exchange.check.codeVerifier)).toBe(
      authorization.codeChallenge
    );
    // The callback URL handed to Google is GOOGLE_CALLBACK_URL + the raw query.
    expect(exchange.callbackUrl.href).toBe(
      `${process.env.GOOGLE_CALLBACK_URL}?code=google-code&state=${encodeURIComponent(state)}`
    );

    const tokenResponse = await exchangeCode(code);
    expect(tokenResponse.status).toBe(200);
    const tokens = tokenResponse.body as TokenPair;
    expect(Object.keys(tokens).sort()).toEqual([
      "accessToken",
      "accessTokenExpiresAt",
      "refreshToken"
    ]);
    expect(tokens.refreshToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(new Date(tokens.accessTokenExpiresAt).toISOString()).toBe(
      tokens.accessTokenExpiresAt
    );
    expect(
      Math.abs(
        Date.parse(tokens.accessTokenExpiresAt) - (Date.now() + 15 * 60_000)
      )
    ).toBeLessThan(60_000);

    const me = await getMe(tokens.accessToken);
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({
      email: profile.email,
      displayName: profile.name,
      avatarUrl: profile.picture,
      timeZone: "Europe/Zagreb"
    });
  });

  it.each([
    ["//evil.com", "//evil.com"],
    ["https://evil.com", "https://evil.com"],
    ["/a\\b", "/a\\b"],
    ["2049 chars", `/${"a".repeat(2048)}`]
  ])(
    "AC-9 FR-AUTH-001: returnTo %s and timeZone Mars/Base are dropped, not rejected",
    async (_, returnTo) => {
      const { response } = await start(app, {
        returnTo,
        timeZone: "Mars/Base"
      });
      expect(response.status).toBe(302);

      const profile = googleProfile();
      fake.nextResult = profile;
      const cb = await callback(
        app,
        `code=google-code&state=${encodeURIComponent(fake.lastState)}`
      );
      expect(cb.status).toBe(302);
      const location = cb.headers.location;
      const code = loginCodeFrom(location);
      expect(location).toBe(
        `${WEB}/auth/callback?code=${encodeURIComponent(code)}`
      );

      const tokens = (await exchangeCode(code)).body as TokenPair;
      const me = await getMe(tokens.accessToken);
      expect(me.body).toMatchObject({ timeZone: "UTC" });
    }
  );

  it.each([
    ["+01:00", "UTC"],
    ["-0530", "UTC"],
    ["Etc/GMT-1", "Etc/GMT-1"]
  ])(
    "AC-9 FR-AUTH-006: timeZone %s → the new user's timeZone is %s (UTC offsets aren't IANA names)",
    async (timeZone, expected) => {
      const tokens = await signIn(googleProfile(), { timeZone });
      const me = await getMe(tokens.accessToken);
      expect(me.body).toMatchObject({ timeZone: expected });
    }
  );

  it("AC-10 FR-AUTH-002: a known identity syncs email, name and avatar but keeps its id and time zone", async () => {
    const first = googleProfile();
    const firstTokens = await signIn(first, { timeZone: "Europe/Zagreb" });
    const before = (await getMe(firstTokens.accessToken)).body as {
      id: string;
    };

    const changed = googleProfile({
      subject: first.subject,
      name: "Ada King",
      picture: "https://lh3.googleusercontent.com/a/ada-king"
    });
    const tokens = await signIn(changed, { timeZone: "America/New_York" });

    const me = await getMe(tokens.accessToken);
    expect(me.body).toMatchObject({
      id: before.id,
      email: changed.email,
      displayName: "Ada King",
      avatarUrl: "https://lh3.googleusercontent.com/a/ada-king",
      timeZone: "Europe/Zagreb"
    });
  });

  it("AC-10 FR-AUTH-002: an empty name becomes the email's local part; an http:// picture becomes null", async () => {
    const first = googleProfile();
    await signIn(first);

    const changed = googleProfile({
      subject: first.subject,
      email: first.email.replace(/^[^@]+/, "ada.lovelace"),
      name: "   ",
      picture: "http://example.com/ada.png"
    });
    const tokens = await signIn(changed);

    const me = await getMe(tokens.accessToken);
    expect(me.body).toMatchObject({
      email: changed.email,
      displayName: "ada.lovelace",
      avatarUrl: null
    });
  });

  it("AC-11 FR-AUTH-001: Google access_denied → error=cancelled; another Google error → error=failed (with returnTo)", async () => {
    const { state: denied } = await start(app, { returnTo: "/app/projects" });
    const cancelled = await callback(
      app,
      `error=access_denied&state=${encodeURIComponent(denied)}`
    );
    expect(cancelled.status).toBe(302);
    expect(cancelled.headers.location).toBe(
      signInError("cancelled", "/app/projects")
    );

    const { state: broken } = await start(app, { returnTo: "/app/projects" });
    const failed = await callback(
      app,
      `error=server_error&state=${encodeURIComponent(broken)}`
    );
    expect(failed.status).toBe(302);
    expect(failed.headers.location).toBe(
      signInError("failed", "/app/projects")
    );
  });

  it("AC-12 FR-AUTH-001: no state, an unknown state, or a reused state → error=failed without returnTo", async () => {
    fake.nextResult = googleProfile();

    const noState = await callback(app, "code=google-code");
    expect(noState.status).toBe(302);
    expect(noState.headers.location).toBe(signInError("failed"));

    const unknown = await callback(app, "code=google-code&state=unknown-state");
    expect(unknown.status).toBe(302);
    expect(unknown.headers.location).toBe(signInError("failed"));

    const { state } = await completeGoogle(googleProfile(), {
      returnTo: "/app/projects"
    });
    const reused = await callback(
      app,
      `code=google-code&state=${encodeURIComponent(state)}`
    );
    expect(reused.status).toBe(302);
    expect(reused.headers.location).toBe(signInError("failed"));
  });

  it("AC-13 FR-AUTH-001: a failed code exchange → error=failed (with returnTo)", async () => {
    const { location } = await completeGoogle(new Error("invalid_grant"), {
      returnTo: "/app/projects"
    });

    expect(location).toBe(signInError("failed", "/app/projects"));
  });

  it("AC-13 FR-AUTH-001: an unverified Google email → error=failed and no user row", async () => {
    const profile = googleProfile({ emailVerified: false });

    const { location } = await completeGoogle(profile, {
      returnTo: "/app/projects"
    });

    expect(location).toBe(signInError("failed", "/app/projects"));
    expect(await findUserByEmail(profile.email)).toBeNull();
  });

  it("AC-14 FR-AUTH-002: with an allow-list, another email → error=not-allowed and no user row created or changed", async () => {
    const stranger = googleProfile();
    const { location } = await completeGoogle(
      stranger,
      { returnTo: "/app/projects" },
      allowListApp
    );
    expect(new URL(location).searchParams.get("error")).toBe("not-allowed");
    expect(location.startsWith(`${WEB}/auth/sign-in?`)).toBe(true);
    expect(await findUserByEmail(stranger.email)).toBeNull();

    // A known user (signed up while sign-up was open) isn't changed either.
    const known = googleProfile();
    await signIn(known);
    const before = await findUserByEmail(known.email);
    const { location: knownLocation } = await completeGoogle(
      { ...known, name: "Someone Else" },
      {},
      allowListApp
    );
    expect(new URL(knownLocation).searchParams.get("error")).toBe(
      "not-allowed"
    );
    expect(await findUserByEmail(known.email)).toEqual(before);
  });

  it("AC-14 FR-AUTH-002: with an allow-list, the listed email (any case) signs in", async () => {
    const owner = googleProfile({ email: OWNER_EMAIL });

    const { location } = await completeGoogle(owner, {}, allowListApp);

    loginCodeFrom(location);
    expect(await findUserByEmail(OWNER_EMAIL)).not.toBeNull();
  });

  // ---------- API-AUTH-003: login code ----------

  it("AC-15 FR-AUTH-001: a login code lives ≤ 60 s and works once; unknown codes → 401", async () => {
    const { location } = await completeGoogle(googleProfile());
    const code = loginCodeFrom(location);

    const ttl = await testRedis().ttl(`auth:code:${sha256Hex(code)}`);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);

    expect((await exchangeCode(code)).status).toBe(200);
    expect((await exchangeCode(code)).status).toBe(401);
    expect((await exchangeCode("an-unknown-login-code")).status).toBe(401);
  });

  it("AC-15 FR-AUTH-001: POST /auth/token with a missing or an extra body field → 400", async () => {
    const server = app.getHttpServer();

    const missing = await request(server).post("/api/v1/auth/token").send({});
    expect(missing.status).toBe(400);

    const extra = await request(server)
      .post("/api/v1/auth/token")
      .send({ code: "some-code", extra: true });
    expect(extra.status).toBe(400);
  });

  // ---------- API-AUTH-004: refresh ----------

  it("AC-16 FR-AUTH-003: refresh rotates the token; reusing a rotated token revokes the session", async () => {
    const { refreshToken: r1 } = await signIn(googleProfile());

    const second = await refresh(r1);
    expect(second.status).toBe(200);
    const r2 = (second.body as TokenPair).refreshToken;
    expect(r2).not.toBe(r1);

    const third = await refresh(r2);
    expect(third.status).toBe(200);
    const r3 = (third.body as TokenPair).refreshToken;

    expect((await refresh(r1)).status).toBe(401);
    expect((await refresh(r3)).status).toBe(401);
  });

  it("AC-26 FR-AUTH-003: two concurrent refreshes with one token → one 200, one 401, and the session is revoked", async () => {
    const { refreshToken: r1 } = await signIn(googleProfile());

    const responses = await Promise.all([refresh(r1), refresh(r1)]);
    const statuses = responses.map((response) => response.status).sort();
    expect(statuses).toEqual([200, 401]);

    const winner = responses.find((response) => response.status === 200)!;
    const r2 = (winner.body as TokenPair).refreshToken;
    expect((await refresh(r2)).status).toBe(401);
  });

  it("AC-17 FR-AUTH-003: an unknown refresh token → 401; refresh keys live REFRESH_TOKEN_TTL", async () => {
    expect((await refresh("an-unknown-refresh-token")).status).toBe(401);

    const { refreshToken: r1 } = await signIn(googleProfile());
    const firstTtl = await testRedis().ttl(`auth:refresh:${sha256Hex(r1)}`);
    expect(firstTtl).toBeGreaterThan(REFRESH_TTL_SECONDS - 60);
    expect(firstTtl).toBeLessThanOrEqual(REFRESH_TTL_SECONDS);

    const r2 = ((await refresh(r1)).body as TokenPair).refreshToken;
    const rotatedTtl = await testRedis().ttl(`auth:refresh:${sha256Hex(r2)}`);
    expect(rotatedTtl).toBeGreaterThan(REFRESH_TTL_SECONDS - 60);
    expect(rotatedTtl).toBeLessThanOrEqual(REFRESH_TTL_SECONDS);
  });

  it("AC-18 FR-AUTH-002: refresh for an email the allow-list excludes → 401 and the session is revoked", async () => {
    const profile = googleProfile();
    const tokens = await signIn(profile);
    const { id: userId } = (await getMe(tokens.accessToken)).body as {
      id: string;
    };

    expect((await refresh(tokens.refreshToken, allowListApp)).status).toBe(401);
    expect((await refresh(tokens.refreshToken, app)).status).toBe(401);
    expect(await testRedis().smembers(`auth:families:${userId}`)).toEqual([]);
  });

  it("AC-19 FR-AUTH-003: refresh after the user row was deleted → 401", async () => {
    const profile = googleProfile();
    const tokens = await signIn(profile);
    const user = await findUserByEmail(profile.email);
    await deleteUser(user!.id);

    expect(await findUserById(user!.id)).toBeNull();
    expect((await refresh(tokens.refreshToken)).status).toBe(401);
  });

  // ---------- API-AUTH-005 / 006: sign-out ----------

  it("AC-20 FR-AUTH-004: logout revokes only that session; an unknown token → 204", async () => {
    const profile = googleProfile();
    const laptop = await signIn(profile);
    const phone = await signIn(profile);

    expect((await logout(laptop.refreshToken)).status).toBe(204);
    expect((await refresh(laptop.refreshToken)).status).toBe(401);
    expect((await refresh(phone.refreshToken)).status).toBe(200);
    expect((await logout("an-unknown-refresh-token")).status).toBe(204);
  });

  it("AC-21 FR-AUTH-007: logout-all revokes every session of the user only; needs a bearer token", async () => {
    const a = googleProfile();
    const aLaptop = await signIn(a);
    const aPhone = await signIn(a);
    const b = await signIn(googleProfile());

    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/logout-all")
      .set("Authorization", `Bearer ${aLaptop.accessToken}`);
    expect(response.status).toBe(204);

    expect((await refresh(aLaptop.refreshToken)).status).toBe(401);
    expect((await refresh(aPhone.refreshToken)).status).toBe(401);
    expect((await refresh(b.refreshToken)).status).toBe(200);

    const anonymous = await request(app.getHttpServer()).post(
      "/api/v1/auth/logout-all"
    );
    expect(anonymous.status).toBe(401);
  });
});
