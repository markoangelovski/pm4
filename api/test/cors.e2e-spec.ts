import { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { createTestApp } from "./create-test-app.js";

describe("CORS", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("allows the configured origin", async () => {
    const response = await request(app.getHttpServer())
      .get("/health")
      .set("Origin", "http://localhost:3000");

    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3000"
    );
  });

  it("does not allow an unconfigured origin", async () => {
    const response = await request(app.getHttpServer())
      .get("/health")
      .set("Origin", "https://evil.test");

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
