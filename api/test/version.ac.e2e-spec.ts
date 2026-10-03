import { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import packageJson from "../package.json" with { type: "json" };
import { createTestApp } from "./create-test-app.js";

describe("GET /api/v1/version (feat-shell-sidebar-branding)", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("AC-1 API-SYS-003: public, 200 with exactly the api/package.json version", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/version");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ version: packageJson.version });
  });

  it("AC-2 API-SYS-003: /version without the /api/v1 prefix is 404", async () => {
    const response = await request(app.getHttpServer()).get("/version");

    expect(response.status).toBe(404);
  });
});
