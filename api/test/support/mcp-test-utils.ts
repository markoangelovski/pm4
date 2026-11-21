import { hkdfSync, randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { signJwt } from "./auth-test-utils.js";

// Helpers for the /mcp tests (feat-mcp-tools-api, *Test support*).

const ISSUER = process.env.API_PUBLIC_URL ?? "http://localhost:3001";

/** The MCP signing key: HKDF-SHA256 of `JWT_ACCESS_SECRET` with info "pm4-mcp" (as mcp-oauth.ac.e2e-spec.ts verifies). */
const mcpKey = (): Buffer =>
  Buffer.from(
    hkdfSync(
      "sha256",
      process.env.JWT_ACCESS_SECRET!,
      Buffer.alloc(0),
      "pm4-mcp",
      32
    )
  );

/**
 * An MCP access token for `userId` (HS256, `iss` the issuer, `aud` issuer + "/mcp",
 * `scope` "pm4:read" or "pm4:read pm4:write"; default write, 900 s).
 * `secret: "web"` signs with `JWT_ACCESS_SECRET` instead of the MCP key.
 */
export function mcpAccessTokenFor(
  userId: string,
  opts: {
    scope?: "read" | "write";
    grantId?: string;
    aud?: string;
    expiresIn?: number;
    secret?: "mcp" | "web";
  } = {}
): string {
  const iat = Math.floor(Date.now() / 1000);
  const secret =
    opts.secret === "web" ? process.env.JWT_ACCESS_SECRET! : mcpKey();
  return signJwt(
    {
      iss: ISSUER,
      aud: opts.aud ?? `${ISSUER}/mcp`,
      sub: userId,
      gid: opts.grantId ?? randomUUID(),
      client_id: "https://client.example/app.json",
      scope: opts.scope === "read" ? "pm4:read" : "pm4:read pm4:write",
      iat,
      exp: iat + (opts.expiresIn ?? 900)
    },
    secret as string
  );
}

/** POST /mcp as an MCP client sends it; `token: null` sends no Authorization header. */
export function mcpPost(
  app: INestApplication,
  token: string | null,
  body: unknown,
  headers: Record<string, string> = {}
): request.Test {
  const req = request(app.getHttpServer() as Server)
    .post("/mcp")
    .set("Content-Type", "application/json")
    .set("Accept", "application/json, text/event-stream")
    .set("MCP-Protocol-Version", "2025-11-25");
  if (token !== null) req.set("Authorization", `Bearer ${token}`);
  return req.set(headers).send(body as object);
}

/**
 * `tools/call` → the tool result. `json` is `content[0].text` parsed when the call is not an error.
 * A JSON-RPC error (not a tool result) fails the test.
 */
export async function callTool(
  app: INestApplication,
  token: string,
  name: string,
  args: Record<string, unknown>
): Promise<{ isError: boolean; text: string; json: unknown }> {
  const response = await mcpPost(app, token, {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name, arguments: args }
  });
  const body = response.body as {
    result?: { content: { type: string; text: string }[]; isError?: boolean };
    error?: unknown;
  };
  if (!body.result) {
    throw new Error(
      `tools/call ${name}: HTTP ${response.status}, no result: ${JSON.stringify(response.body)}`
    );
  }
  const isError = body.result.isError === true;
  const text = body.result.content[0]?.text ?? "";
  return { isError, text, json: isError ? undefined : JSON.parse(text) };
}
