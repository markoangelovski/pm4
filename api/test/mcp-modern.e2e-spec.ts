import { NestExpressApplication } from "@nestjs/platform-express";
import { createTestApp } from "./create-test-app.js";
import {
  closeTestClients,
  deleteTestUsers,
  insertUser
} from "./support/auth-test-utils.js";
import { mcpAccessTokenFor, mcpPost } from "./support/mcp-test-utils.js";

// The modern (2026-07-28) path through createMcpHandler; the acceptance tests use 2025-11-25 (feat-mcp-tools-api review, finding 3).
const MODERN = "2026-07-28";
const META = {
  "io.modelcontextprotocol/protocolVersion": MODERN,
  "io.modelcontextprotocol/clientCapabilities": {}
};

describe("The MCP endpoint, 2026-07-28 requests", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await deleteTestUsers();
    await closeTestClients();
    await app.close();
  });

  it("tools/list with a read token → JSON with the five read tools", async () => {
    const user = await insertUser();

    const response = await mcpPost(
      app,
      mcpAccessTokenFor(user.id, { scope: "read" }),
      { jsonrpc: "2.0", id: 1, method: "tools/list", params: { _meta: META } },
      { "MCP-Protocol-Version": MODERN, "Mcp-Method": "tools/list" }
    );

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.headers["content-type"]).toMatch(/^application\/json/);
    const tools = (response.body as { result: { tools: { name: string }[] } })
      .result.tools;
    expect(tools.map((t) => t.name).sort()).toEqual(
      [
        "get_day",
        "list_time_logs",
        "report_summary",
        "search_projects",
        "search_tasks"
      ].sort()
    );
  });
});
