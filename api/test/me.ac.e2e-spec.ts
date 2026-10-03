import { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { createTestApp } from "./create-test-app.js";
import {
  accessTokenFor,
  closeTestClients,
  deleteTestUsers,
  deleteUser,
  expiredAccessTokenFor,
  insertUser,
  signJwt,
  unsignedJwt
} from "./support/auth-test-utils.js";

describe("Default-deny guard and GET /api/v1/me (feat-auth-api-session)", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await deleteTestUsers();
    await closeTestClients();
    await app.close();
  });

  it("AC-1 API-USR-001: without Authorization → 401 problem+json unauthorized", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/me");

    expect(response.status).toBe(401);
    expect(response.headers["content-type"]).toContain(
      "application/problem+json"
    );
    expect(response.body).toMatchObject({
      type: `${process.env.WEB_APP_URL}/errors/unauthorized`,
      status: 401
    });
  });

  describe("AC-2 API-USR-001: an invalid access token → 401", () => {
    let userId: string;

    beforeAll(async () => {
      userId = (await insertUser()).id;
    });

    const now = () => Math.floor(Date.now() / 1000);
    const cases: [string, () => string][] = [
      ["a malformed token", () => "not-a-jwt"],
      [
        "a token signed with another secret",
        () =>
          signJwt(
            { sub: userId, iat: now(), exp: now() + 900 },
            "another-secret-that-is-at-least-32-characters"
          )
      ],
      [
        "an alg: none token",
        () => unsignedJwt({ sub: userId, iat: now(), exp: now() + 900 })
      ],
      ["an expired token", () => expiredAccessTokenFor(userId)]
    ];

    it.each(cases)("AC-2 API-USR-001: %s → 401", async (_, token) => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/me")
        .set("Authorization", `Bearer ${token()}`);

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        type: `${process.env.WEB_APP_URL}/errors/unauthorized`
      });
    });
  });

  it("AC-3 API-USR-001: a valid token → 200 with exactly the Me fields", async () => {
    const user = await insertUser({
      display_name: "Grace Hopper",
      avatar_url: "https://lh3.googleusercontent.com/a/grace",
      time_zone: "Europe/Zagreb"
    });

    const response = await request(app.getHttpServer())
      .get("/api/v1/me")
      .set("Authorization", `Bearer ${accessTokenFor(user.id)}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: user.id,
      email: user.email,
      displayName: "Grace Hopper",
      avatarUrl: "https://lh3.googleusercontent.com/a/grace",
      timeZone: "Europe/Zagreb",
      createdAt: user.created_at.toISOString()
    });
  });

  it("AC-4 API-USR-001: a valid token whose user was deleted → 401", async () => {
    const user = await insertUser();
    const token = accessTokenFor(user.id);
    await deleteUser(user.id);

    const response = await request(app.getHttpServer())
      .get("/api/v1/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  it("AC-5 API-SYS-003: /health and /api/v1/version stay public; unknown routes still 404", async () => {
    const server = app.getHttpServer();

    expect((await request(server).get("/health")).status).toBe(200);
    expect((await request(server).get("/api/v1/version")).status).toBe(200);
    expect((await request(server).get("/api/v1/does-not-exist")).status).toBe(
      404
    );
  });
});
