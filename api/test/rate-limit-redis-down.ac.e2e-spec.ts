import { vi } from "vitest";
import { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import {
  accessTokenFor,
  closeTestClients,
  deleteTestUsers,
  insertUser
} from "./support/auth-test-utils.js";

/**
 * As health-redis-down.e2e-spec.ts: REDIS_URL is read when the app is built,
 * so it's overridden and the module graph re-imported before `createTestApp`.
 */
describe("Rate limiting with Redis unreachable (feat-api-rate-limit)", () => {
  let app: NestExpressApplication;
  const originalRedisUrl = process.env.REDIS_URL;

  beforeAll(async () => {
    vi.resetModules();
    // Port 1: nothing accepts connections there.
    process.env.REDIS_URL = "redis://127.0.0.1:1";

    const { createTestApp } = await import("./create-test-app.js");
    app = await createTestApp();
  });

  afterAll(async () => {
    await app?.close();
    process.env.REDIS_URL = originalRedisUrl;
    await deleteTestUsers();
    await closeTestClients();
  });

  it("AC-12 NFR-004: a signed-in request is allowed (fail open)", async () => {
    const user = await insertUser();

    const response = await request(app.getHttpServer())
      .get("/api/v1/projects")
      .set("Authorization", `Bearer ${accessTokenFor(user.id)}`);

    expect(response.status).toBe(200);
  }, 15_000);
});
