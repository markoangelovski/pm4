import { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { createTestApp } from "./create-test-app.js";

describe("GET /favicon.ico", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("serves the PM4 icon outside the /api/v1 prefix", async () => {
    const response = await request(app.getHttpServer()).get("/favicon.ico");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/icon/);
    expect(Number(response.headers["content-length"])).toBeGreaterThan(0);
  });
});
