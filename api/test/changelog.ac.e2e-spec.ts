import { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { createTestApp } from "./create-test-app.js";

describe("GET /api/v1/changelog (feat-shell-documentation)", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("AC-7 API-SYS-004: public, 200 with an items array", async () => {
    const response = await request(app.getHttpServer()).get(
      "/api/v1/changelog"
    );

    expect(response.status).toBe(200);
    const body = response.body as { items: unknown };
    expect(Array.isArray(body.items)).toBe(true);
  });

  it("AC-7 API-SYS-004: /changelog without the /api/v1 prefix is 404", async () => {
    const response = await request(app.getHttpServer()).get("/changelog");

    expect(response.status).toBe(404);
  });
});
