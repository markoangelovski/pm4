import { randomUUID } from "node:crypto";
import { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { RATE_LIMITS, type RateLimits } from "../src/rate-limit/rate-limits.js";
import { createTestApp, TEST_RATE_LIMITS } from "./create-test-app.js";
import {
  accessTokenFor,
  closeTestClients,
  deleteTestUsers,
  insertUser,
  testRedis
} from "./support/auth-test-utils.js";
import { mcpAccessTokenFor, mcpPost } from "./support/mcp-test-utils.js";

const WEB = process.env.WEB_APP_URL!;
const ISSUER = process.env.API_PUBLIC_URL ?? "http://localhost:3001";
const errorType = (slug: string) => `${WEB}/errors/${slug}`;

const METADATA = `Bearer resource_metadata="${ISSUER}/.well-known/oauth-protected-resource/mcp"`;

/** The JSON bodies these tests read: an `initialize` result or a Problem. */
const bodyOf = (response: { body: unknown }) =>
  response.body as {
    type?: string;
    result: {
      serverInfo: { name: string };
      capabilities: { tools?: unknown };
    };
  };

const INITIALIZE = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "test-client", version: "1.0.0" }
  }
};

describe("The MCP endpoint (feat-mcp-tools-api)", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await deleteTestUsers();
    await closeTestClients();
    await app.close();
  });

  it("AC-1 FR-MCP-001: initialize with a write token → 200 JSON, server pm4, tools capability, no session header", async () => {
    const user = await insertUser();

    const response = await mcpPost(
      app,
      mcpAccessTokenFor(user.id, { scope: "write" }),
      INITIALIZE
    );

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/^application\/json/);
    expect(bodyOf(response).result.serverInfo.name).toBe("pm4");
    expect(bodyOf(response).result.capabilities.tools).toBeDefined();
    expect(response.headers["mcp-session-id"]).toBeUndefined();
  });

  describe("AC-2 FR-MCP-007: a missing or invalid token → 401 with WWW-Authenticate", () => {
    it("AC-2 FR-MCP-007: no token → 401 unauthorized, the header names the resource metadata only", async () => {
      const response = await mcpPost(app, null, INITIALIZE);

      expect(response.status).toBe(401);
      expect(bodyOf(response).type).toBe(errorType("unauthorized"));
      expect(response.headers["www-authenticate"]).toBe(METADATA);
    });

    it("AC-2 FR-MCP-007: a bad token → 401 unauthorized with error=invalid_token", async () => {
      const user = await insertUser();
      const revokedGid = randomUUID();
      await testRedis().set(`mcp:revoked:${revokedGid}`, "1", "EX", 300);

      const cases: [string, string][] = [
        ["a web access token", accessTokenFor(user.id)],
        [
          "an expired MCP token",
          mcpAccessTokenFor(user.id, { expiresIn: -60 })
        ],
        [
          "a wrong audience",
          mcpAccessTokenFor(user.id, { aud: "http://other.example/mcp" })
        ],
        [
          "an MCP-shaped token signed with the web secret",
          mcpAccessTokenFor(user.id, { secret: "web" })
        ],
        ["a revoked grant", mcpAccessTokenFor(user.id, { grantId: revokedGid })]
      ];

      for (const [label, token] of cases) {
        const response = await mcpPost(app, token, INITIALIZE);
        expect(response.status, label).toBe(401);
        expect(bodyOf(response).type, label).toBe(errorType("unauthorized"));
        expect(response.headers["www-authenticate"], label).toBe(
          `${METADATA}, error="invalid_token"`
        );
      }
    });
  });

  it("AC-3 API-MCP-012: POST /api/v1/mcp → 404; GET and DELETE /mcp → 405 with Allow: POST", async () => {
    const user = await insertUser();
    const token = mcpAccessTokenFor(user.id);
    const server = app.getHttpServer();

    const prefixed = await request(server)
      .post("/api/v1/mcp")
      .set("Authorization", `Bearer ${token}`)
      .send(INITIALIZE);
    expect(prefixed.status).toBe(404);

    const get = await request(server)
      .get("/mcp")
      .set("Authorization", `Bearer ${token}`);
    expect(get.status).toBe(405);
    expect(get.headers.allow).toBe("POST");

    const del = await request(server)
      .delete("/mcp")
      .set("Authorization", `Bearer ${token}`);
    expect(del.status).toBe(405);
    expect(del.headers.allow).toBe("POST");
  });

  it("AC-4 API-MCP-012: an Origin outside CORS_ORIGINS → 403 forbidden; the web origin and no Origin → 200", async () => {
    const user = await insertUser();
    const token = mcpAccessTokenFor(user.id);

    const evil = await mcpPost(app, token, INITIALIZE, {
      Origin: "https://evil.example"
    });
    expect(evil.status).toBe(403);
    expect(bodyOf(evil).type).toBe(errorType("forbidden"));

    const web = await mcpPost(app, token, INITIALIZE, { Origin: WEB });
    expect(web.status).toBe(200);

    const none = await mcpPost(app, token, INITIALIZE);
    expect(none.status).toBe(200);
  });

  it("AC-5 NFR-004: with mcp: 2 the third POST of a user → 429 rate-limited with Retry-After; another user is unaffected", async () => {
    const limits: RateLimits = {
      ...TEST_RATE_LIMITS,
      limits: { ...TEST_RATE_LIMITS.limits, mcp: 2 }
    };
    const limitedApp = await createTestApp([
      { provide: RATE_LIMITS, useValue: limits }
    ]);
    try {
      const a = await insertUser();
      const b = await insertUser();
      const tokenA = mcpAccessTokenFor(a.id);

      expect((await mcpPost(limitedApp, tokenA, INITIALIZE)).status).toBe(200);
      expect((await mcpPost(limitedApp, tokenA, INITIALIZE)).status).toBe(200);

      const third = await mcpPost(limitedApp, tokenA, INITIALIZE);
      expect(third.status).toBe(429);
      expect(bodyOf(third).type).toBe(errorType("rate-limited"));
      expect(third.headers["retry-after"]).toMatch(/^\d+$/);

      const other = await mcpPost(
        limitedApp,
        mcpAccessTokenFor(b.id),
        INITIALIZE
      );
      expect(other.status).toBe(200);
    } finally {
      await limitedApp.close();
    }
  });
});
