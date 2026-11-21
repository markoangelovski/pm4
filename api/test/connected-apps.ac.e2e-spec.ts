import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { createTestApp } from "./create-test-app.js";
import {
  accessTokenFor,
  closeTestClients,
  deleteTestUsers,
  insertUser,
  pkceChallenge,
  testDb,
  testRedis,
  type UserRow
} from "./support/auth-test-utils.js";

type Json = Record<string, unknown>;
const bodyOf = (response: { body: unknown }): Json => response.body as Json;

const DCR_REDIRECT = "http://127.0.0.1:3333/cb";
const APP_REDIRECT = "http://127.0.0.1:40000/cb";

interface Item {
  id: string;
  client: { name: string; clientIdHost: string };
  scopes: string[];
  connectedAt: string;
  lastUsedAt: string | null;
  expired: boolean;
}

interface Account {
  user: UserRow;
  token: string;
}

interface Connected {
  clientId: string;
  redirectUri: string;
  verifier: string;
  code: string;
  grantId: string;
}

function uniqueIp(): string {
  return `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
}

describe("Connected apps (feat-mcp-oauth-api)", () => {
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

  // ---------- helpers ----------

  const newAccount = async (): Promise<Account> => {
    const user = await insertUser();
    return { user, token: accessTokenFor(user.id) };
  };

  async function dcrClient(
    redirectUris: string[] = [DCR_REDIRECT],
    name = "Agent X"
  ): Promise<string> {
    const response = await request(app.getHttpServer())
      .post("/oauth/register")
      .set("X-Forwarded-For", uniqueIp())
      .type("json")
      .send(JSON.stringify({ client_name: name, redirect_uris: redirectUris }));
    expect(response.status).toBe(201);
    const id = bodyOf(response).client_id as string;
    createdClientIds.push(id);
    return id;
  }

  const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

  /** authorize → Allow; the grant's id comes from the database. */
  async function connect(
    { user, token }: Account,
    clientId: string
  ): Promise<Connected> {
    const verifier = randomBytes(32).toString("base64url");
    const authorize = await request(app.getHttpServer())
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
    expect(authorize.status).toBe(302);
    const requestId = new URL(authorize.headers.location).searchParams.get(
      "request"
    );
    expect(requestId).toHaveLength(43);
    const allow = await request(app.getHttpServer())
      .post(`/api/v1/oauth/consent/${requestId}/allow`)
      .set(authHeader(token));
    expect(allow.status).toBe(200);
    const code = new URL(bodyOf(allow).redirectUrl as string).searchParams.get(
      "code"
    )!;
    const row = await testDb().query<{ id: string }>(
      "SELECT id FROM oauth_grants WHERE user_id = $1 AND client_id = $2",
      [user.id, clientId]
    );
    return {
      clientId,
      redirectUri: APP_REDIRECT,
      verifier,
      code,
      grantId: row.rows[0].id
    };
  }

  const tokenCall = (form: Record<string, string>) =>
    request(app.getHttpServer())
      .post("/oauth/token")
      .set("X-Forwarded-For", uniqueIp())
      .type("form")
      .send(form);

  const exchange = (c: Connected) =>
    tokenCall({
      grant_type: "authorization_code",
      code: c.code,
      redirect_uri: c.redirectUri,
      client_id: c.clientId,
      code_verifier: c.verifier
    });

  const refresh = (refreshToken: string, clientId: string) =>
    tokenCall({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId
    });

  /** connect + code exchange; returns the refresh token too. */
  async function connectAndExchange(
    account: Account,
    clientId: string
  ): Promise<Connected & { refreshToken: string }> {
    const c = await connect(account, clientId);
    const response = await exchange(c);
    expect(response.status).toBe(200);
    return { ...c, refreshToken: bodyOf(response).refresh_token as string };
  }

  const list = async (token: string): Promise<Item[]> => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/connected-apps")
      .set(authHeader(token));
    expect(response.status).toBe(200);
    return bodyOf(response).items as Item[];
  };

  const grantIds = async (userId: string): Promise<string[]> =>
    (
      await testDb().query<{ id: string }>(
        "SELECT id FROM oauth_grants WHERE user_id = $1",
        [userId]
      )
    ).rows.map((row) => row.id);

  const expectInvalidGrant = (response: {
    status: number;
    body: unknown;
  }): void => {
    expect(response.status).toBe(400);
    expect(bodyOf(response).error).toBe("invalid_grant");
  };

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  // ---------- list ----------

  it("AC-29 FR-MCP-009: GET /connected-apps lists the user's grants newest first with usage from Redis", async () => {
    const a = await newAccount();
    const b = await newAccount();
    const first = await dcrClient([DCR_REDIRECT], "First App");
    const second = await dcrClient(["http://127.0.0.1:4545/cb"], "Second App");
    const older = await connect(a, first);
    const newer = await connect(a, second);
    const foreign = await connect(b, await dcrClient([DCR_REDIRECT], "B App"));

    let items = await list(a.token);
    expect(items.map((item) => item.id)).toEqual(
      [older.grantId, newer.grantId].reverse()
    );
    expect(Object.keys(items[0]).sort()).toEqual(
      ["client", "connectedAt", "expired", "id", "lastUsedAt", "scopes"].sort()
    );
    expect(items[0]).toMatchObject({
      id: newer.grantId,
      client: { name: "Second App", clientIdHost: "127.0.0.1:4545" },
      scopes: ["pm4:read", "pm4:write"],
      lastUsedAt: null,
      expired: false
    });
    expect(items[1]).toMatchObject({
      id: older.grantId,
      client: { name: "First App", clientIdHost: "127.0.0.1:3333" },
      lastUsedAt: null,
      expired: false
    });
    expect(Number.isNaN(Date.parse(items[0].connectedAt))).toBe(false);
    expect(items.map((item) => item.id)).not.toContain(foreign.grantId);
    expect((await list(b.token)).map((item) => item.id)).toEqual([
      foreign.grantId
    ]);

    const exchanged = await exchange(older);
    expect(exchanged.status).toBe(200);
    items = await list(a.token);
    const afterExchange = items.find((item) => item.id === older.grantId)!;
    expect(afterExchange.expired).toBe(false);
    const usedAt = Date.parse(afterExchange.lastUsedAt!);
    expect(Math.abs(usedAt - Date.now())).toBeLessThan(60_000);

    await sleep(1100);
    const refreshed = await refresh(
      bodyOf(exchanged).refresh_token as string,
      first
    );
    expect(refreshed.status).toBe(200);
    items = await list(a.token);
    const afterRefresh = items.find((item) => item.id === older.grantId)!;
    expect(Date.parse(afterRefresh.lastUsedAt!)).toBeGreaterThan(usedAt);
  });

  it("AC-30 FR-MCP-009: a grant whose Redis family is gone is expired with no lastUsedAt", async () => {
    const a = await newAccount();
    const c = await connectAndExchange(a, await dcrClient());
    await testRedis().del(`mcp:family:${c.grantId}`);

    const items = await list(a.token);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: c.grantId,
      expired: true,
      lastUsedAt: null
    });
  });

  // ---------- revoke ----------

  it("AC-31 FR-MCP-009: DELETE /connected-apps/{id} revokes the grant; foreign and unknown ids → 404", async () => {
    const a = await newAccount();
    const b = await newAccount();
    const c = await connectAndExchange(a, await dcrClient());
    const foreign = await connect(b, await dcrClient());
    const del = (id: string, token: string) =>
      request(app.getHttpServer())
        .delete(`/api/v1/connected-apps/${id}`)
        .set(authHeader(token));

    const response = await del(c.grantId, a.token);
    expect(response.status).toBe(204);
    expect((await list(a.token)).map((item) => item.id)).not.toContain(
      c.grantId
    );
    expectInvalidGrant(await refresh(c.refreshToken, c.clientId));
    const ttl = await testRedis().ttl(`mcp:revoked:${c.grantId}`);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(900);

    expect((await del(foreign.grantId, a.token)).status).toBe(404);
    expect((await del(randomUUID(), a.token)).status).toBe(404);
    expect((await del("abc", a.token)).status).toBe(404);
    expect(await grantIds(b.user.id)).toEqual([foreign.grantId]);
  });

  it("AC-32 FR-MCP-009: logout-all ends every grant of the user only", async () => {
    const a = await newAccount();
    const b = await newAccount();
    const first = await connectAndExchange(a, await dcrClient());
    const second = await connectAndExchange(a, await dcrClient());
    const foreign = await connect(b, await dcrClient());

    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/logout-all")
      .set(authHeader(a.token));
    expect(response.status).toBe(204);

    expect(await grantIds(a.user.id)).toEqual([]);
    for (const c of [first, second]) {
      expect(await testRedis().exists(`mcp:revoked:${c.grantId}`)).toBe(1);
      expectInvalidGrant(await refresh(c.refreshToken, c.clientId));
    }
    expect(await grantIds(b.user.id)).toEqual([foreign.grantId]);
    expect(await testRedis().exists(`mcp:revoked:${foreign.grantId}`)).toBe(0);
  });

  it("AC-33 FR-MCP-009: deleting the account removes its grants and marks them revoked", async () => {
    const a = await newAccount();
    const first = await connectAndExchange(a, await dcrClient());
    const second = await connect(a, await dcrClient());
    expect(await grantIds(a.user.id)).toHaveLength(2);

    const response = await request(app.getHttpServer())
      .delete("/api/v1/me")
      .set(authHeader(a.token));
    expect(response.status).toBe(204);

    expect(await grantIds(a.user.id)).toEqual([]);
    for (const c of [first, second]) {
      expect(await testRedis().exists(`mcp:revoked:${c.grantId}`)).toBe(1);
    }
  });
});
