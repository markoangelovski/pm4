import { randomBytes, randomInt } from "node:crypto";
import { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { createTestApp } from "./create-test-app.js";
import {
  accessTokenFor,
  closeTestClients,
  deleteTestUsers,
  insertUser,
  pkceChallenge,
  testDb
} from "./support/auth-test-utils.js";

type Json = Record<string, unknown>;
const bodyOf = (response: { body: unknown }): Json => response.body as Json;

const LOGO = "https://agent.example.com/logo.png";
const APP_REDIRECT = "https://agent.example.com/cb";

function uniqueIp(): string {
  return `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
}

describe("MCP app logos (feat-mcp-logos)", () => {
  let app: NestExpressApplication;
  const createdClientIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    if (createdClientIds.length) {
      await testDb().query("DELETE FROM oauth_clients WHERE id = ANY($1)", [
        createdClientIds
      ]);
    }
    await deleteTestUsers();
    await closeTestClients();
    await app?.close();
  });

  const register = async (body: Json) => {
    const response = await request(app.getHttpServer())
      .post("/oauth/register")
      .set("X-Forwarded-For", uniqueIp())
      .type("json")
      .send(JSON.stringify({ client_name: "Logo App", ...body }));
    const id = bodyOf(response).client_id;
    if (typeof id === "string") createdClientIds.push(id);
    return response;
  };

  const storedLogo = async (clientId: string) =>
    (
      await testDb().query<{ logo_uri: string | null }>(
        "SELECT logo_uri FROM oauth_clients WHERE id = $1",
        [clientId]
      )
    ).rows[0].logo_uri;

  /** authorize → returns the pending request id. */
  async function authorize(clientId: string): Promise<string> {
    const verifier = randomBytes(32).toString("base64url");
    const response = await request(app.getHttpServer())
      .get("/oauth/authorize")
      .set("X-Forwarded-For", uniqueIp())
      .query({
        response_type: "code",
        client_id: clientId,
        redirect_uri: APP_REDIRECT,
        code_challenge: pkceChallenge(verifier),
        code_challenge_method: "S256",
        state: "xyz"
      })
      .redirects(0);
    expect(response.status).toBe(302);
    const id = new URL(response.headers.location).searchParams.get("request");
    expect(id).toHaveLength(43);
    return id as string;
  }

  const connectedItems = async (token: string) => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/connected-apps")
      .set({ Authorization: `Bearer ${token}` });
    expect(response.status).toBe(200);
    return bodyOf(response).items as Json[];
  };

  async function allowAndList(clientId: string) {
    const user = await insertUser();
    const token = accessTokenFor(user.id);
    const requestId = await authorize(clientId);
    const allow = await request(app.getHttpServer())
      .post(`/api/v1/oauth/consent/${requestId}/allow`)
      .set({ Authorization: `Bearer ${token}` });
    expect(allow.status).toBe(200);
    return { token, items: await connectedItems(token), requestId };
  }

  it("AC-6 FR-MCP-003: register echoes a logo_uri on the redirect host and stores it", async () => {
    const response = await register({
      redirect_uris: ["https://agent.example.com/cb"],
      logo_uri: LOGO
    });
    expect(response.status).toBe(201);
    expect(bodyOf(response).logo_uri).toBe(LOGO);
    expect(await storedLogo(bodyOf(response).client_id as string)).toBe(LOGO);
  });

  it("AC-7 FR-MCP-003: a logo_uri on another host or a loopback redirect → 201 without logo_uri, stored null", async () => {
    const otherHost = await register({
      redirect_uris: ["https://agent.example.com/cb"],
      logo_uri: "https://cdn.example.net/logo.png"
    });
    expect(otherHost.status).toBe(201);
    expect(Object.keys(bodyOf(otherHost))).not.toContain("logo_uri");
    expect(await storedLogo(bodyOf(otherHost).client_id as string)).toBeNull();

    const loopback = await register({
      redirect_uris: ["http://127.0.0.1:3333/cb"],
      logo_uri: "https://127.0.0.1:3333/logo.png"
    });
    expect(loopback.status).toBe(201);
    expect(Object.keys(bodyOf(loopback))).not.toContain("logo_uri");
    expect(await storedLogo(bodyOf(loopback).client_id as string)).toBeNull();
  });

  it("AC-8 FR-MCP-003: an allowed client's connected app has its logoUri; the consent request has none", async () => {
    const registered = await register({
      redirect_uris: ["https://agent.example.com/cb"],
      logo_uri: LOGO
    });
    expect(registered.status).toBe(201);
    const clientId = bodyOf(registered).client_id as string;

    const user = await insertUser();
    const token = accessTokenFor(user.id);
    const requestId = await authorize(clientId);
    const consent = await request(app.getHttpServer())
      .get(`/api/v1/oauth/consent/${requestId}`)
      .set({ Authorization: `Bearer ${token}` });
    expect(consent.status).toBe(200);
    expect(JSON.stringify(consent.body)).not.toContain("logoUri");

    const allow = await request(app.getHttpServer())
      .post(`/api/v1/oauth/consent/${requestId}/allow`)
      .set({ Authorization: `Bearer ${token}` });
    expect(allow.status).toBe(200);
    const items = await connectedItems(token);
    expect(items).toHaveLength(1);
    expect(items[0].logoUri).toBe(LOGO);
  });

  it("AC-9 FR-MCP-003: a client without logo_uri, allowed → logoUri null", async () => {
    const registered = await register({
      redirect_uris: ["https://agent.example.com/cb"]
    });
    expect(registered.status).toBe(201);
    const { items } = await allowAndList(
      bodyOf(registered).client_id as string
    );
    expect(items).toHaveLength(1);
    expect(items[0].logoUri).toBeNull();
  });
});
