import {
  createHmac,
  hkdfSync,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual
} from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse
} from "node:http";
import type { AddressInfo } from "node:net";
import { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { RATE_LIMITS, type RateLimits } from "../src/rate-limit/rate-limits.js";
import { createTestApp, TEST_RATE_LIMITS } from "./create-test-app.js";
import { FakeGoogleOidc } from "./fake-google-oidc.js";
import {
  accessTokenFor,
  closeTestClients,
  createAuthTestApp,
  deleteTestUsers,
  insertUser,
  pkceChallenge,
  sha256Hex,
  testDb,
  testRedis,
  type UserRow
} from "./support/auth-test-utils.js";

const WEB = process.env.WEB_APP_URL!;
const ISSUER = process.env.API_PUBLIC_URL ?? "http://localhost:3001";
const RESOURCE = `${ISSUER}/mcp`;
const errorType = (slug: string) => `${WEB}/errors/${slug}`;

type Json = Record<string, unknown>;
const bodyOf = (response: { body: unknown }): Json => response.body as Json;

const DCR_REDIRECT = "http://127.0.0.1:3333/cb";
const ALLOWED_ONLY = "owner-only@example.com";

/** A fresh client IP per case, so no case shares a rate-limit counter. */
function uniqueIp(): string {
  return `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
}

// ---------- the MCP key and token reading (D1) ----------

const mcpKey = Buffer.from(
  hkdfSync(
    "sha256",
    process.env.JWT_ACCESS_SECRET!,
    Buffer.alloc(0),
    "pm4-mcp",
    32
  )
);

/** The claims of an HS256 JWT signed with `key`, or null when the signature differs. */
function verifyHs256(token: string, key: Buffer | string): Json | null {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) return null;
  const expected = createHmac("sha256", key)
    .update(`${header}.${payload}`)
    .digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }
  return JSON.parse(Buffer.from(payload, "base64url").toString()) as Json;
}

// ---------- a local CIMD server ----------

interface Doc {
  status?: number;
  headers?: Record<string, string>;
  body: string;
}

describe("OAuth authorization server for MCP (feat-mcp-oauth-api)", () => {
  const fake = new FakeGoogleOidc();
  let app: NestExpressApplication;
  let allowListApp: NestExpressApplication;
  let registerLimitedApp: NestExpressApplication;
  let authorizeLimitedApp: NestExpressApplication;
  let tokenLimitedApp: NestExpressApplication;
  let docServer: Server;
  let docBase: string;
  const docs = new Map<string, Doc>();
  const hits = new Map<string, number>();
  const createdClientIds: string[] = [];

  const limited = (scope: string, limit: number): RateLimits => ({
    ...TEST_RATE_LIMITS,
    limits: { ...TEST_RATE_LIMITS.limits, [scope]: limit }
  });

  beforeAll(async () => {
    docServer = createServer((req: IncomingMessage, res: ServerResponse) => {
      const path = req.url ?? "/";
      hits.set(path, (hits.get(path) ?? 0) + 1);
      const doc = docs.get(path);
      if (!doc) {
        res.writeHead(404).end();
        return;
      }
      res
        .writeHead(doc.status ?? 200, {
          "Content-Type": "application/json",
          ...doc.headers
        })
        .end(doc.body);
    });
    await new Promise<void>((resolve) =>
      docServer.listen(0, "127.0.0.1", resolve)
    );
    docBase = `http://127.0.0.1:${(docServer.address() as AddressInfo).port}`;

    app = await createTestApp();
    registerLimitedApp = await createTestApp([
      { provide: RATE_LIMITS, useValue: limited("oauthRegister", 2) }
    ]);
    authorizeLimitedApp = await createTestApp([
      { provide: RATE_LIMITS, useValue: limited("oauthAuthorize", 1) }
    ]);
    tokenLimitedApp = await createTestApp([
      { provide: RATE_LIMITS, useValue: limited("oauthToken", 1) }
    ]);
    allowListApp = await createAuthTestApp(fake, {
      AUTH_ALLOWED_EMAILS: ALLOWED_ONLY
    });
  });

  afterAll(async () => {
    if (createdClientIds.length) {
      await testDb().query("DELETE FROM oauth_clients WHERE id = ANY($1)", [
        createdClientIds
      ]);
    }
    await deleteTestUsers();
    await closeTestClients();
    await allowListApp?.close();
    await tokenLimitedApp?.close();
    await authorizeLimitedApp?.close();
    await registerLimitedApp?.close();
    await app?.close();
    await new Promise<void>((resolve) => docServer.close(() => resolve()));
  });

  // ---------- helpers ----------

  const newUser = async (): Promise<{ user: UserRow; token: string }> => {
    const user = await insertUser();
    return { user, token: accessTokenFor(user.id) };
  };

  const registerClient = (
    target: NestExpressApplication,
    body: unknown,
    ip = uniqueIp()
  ) =>
    request(target.getHttpServer())
      .post("/oauth/register")
      .set("X-Forwarded-For", ip)
      .type("json")
      .send(JSON.stringify(body));

  /** A DCR client; returns its id. */
  async function dcrClient(
    redirectUris: string[] = [DCR_REDIRECT],
    name = "Agent X"
  ): Promise<string> {
    const response = await registerClient(app, {
      client_name: name,
      redirect_uris: redirectUris
    });
    expect(response.status).toBe(201);
    const id = bodyOf(response).client_id as string;
    createdClientIds.push(id);
    return id;
  }

  /** Serves a CIMD document at a unique path; returns its URL. */
  function serveDoc(
    build: (url: string) => Doc,
    path = `/client-${randomUUID()}.json`
  ): string {
    const url = `${docBase}${path}`;
    docs.set(path, build(url));
    return url;
  }

  const validDoc = (url: string, extra: Json = {}): Doc => ({
    body: JSON.stringify({
      client_id: url,
      client_name: "Doc App",
      redirect_uris: ["http://127.0.0.1:4444/cb"],
      ...extra
    })
  });

  const newVerifier = () => randomBytes(32).toString("base64url");

  interface AuthorizeOptions {
    clientId?: string;
    redirectUri?: string;
    verifier?: string;
    params?: Record<string, string | undefined>;
    ip?: string;
    target?: NestExpressApplication;
  }

  /** GET /oauth/authorize with a valid query unless overridden (`undefined` omits a key). */
  function authorize(options: AuthorizeOptions = {}) {
    const query: Record<string, string | undefined> = {
      response_type: "code",
      client_id: options.clientId,
      redirect_uri: options.redirectUri ?? DCR_REDIRECT,
      code_challenge: pkceChallenge(options.verifier ?? newVerifier()),
      code_challenge_method: "S256",
      state: "xyz",
      ...options.params
    };
    const clean = Object.fromEntries(
      Object.entries(query).filter(([, value]) => value !== undefined)
    ) as Record<string, string>;
    return request((options.target ?? app).getHttpServer())
      .get("/oauth/authorize")
      .set("X-Forwarded-For", options.ip ?? uniqueIp())
      .query(clean)
      .redirects(0);
  }

  const locationOf = (response: { headers: Record<string, unknown> }): URL =>
    new URL(response.headers.location as string);

  /** Authorize for a DCR client; returns the pending request's id. */
  async function pendingRequest(
    clientId: string,
    options: AuthorizeOptions = {}
  ): Promise<string> {
    const response = await authorize({ ...options, clientId });
    expect(response.status).toBe(302);
    const id = locationOf(response).searchParams.get("request");
    expect(id, "consent request id").toHaveLength(43);
    return id!;
  }

  const consentCall = (
    method: "get" | "post",
    id: string,
    token?: string,
    action?: "allow" | "deny"
  ) => {
    const path = `/api/v1/oauth/consent/${id}${action ? `/${action}` : ""}`;
    const req = request(app.getHttpServer())[method](path);
    return token === undefined
      ? req
      : req.set("Authorization", `Bearer ${token}`);
  };

  interface Connection {
    clientId: string;
    redirectUri: string;
    verifier: string;
    code: string;
    grantId: string;
  }

  /** authorize → Allow; returns the code and the new grant's id. */
  async function connect(
    userId: string,
    token: string,
    clientId: string,
    redirectUri = "http://127.0.0.1:40000/cb",
    scope?: string
  ): Promise<Connection> {
    const verifier = newVerifier();
    const id = await pendingRequest(clientId, {
      redirectUri,
      verifier,
      params: { scope }
    });
    const allow = await consentCall("post", id, token, "allow");
    expect(allow.status).toBe(200);
    const code = new URL(bodyOf(allow).redirectUrl as string).searchParams.get(
      "code"
    )!;
    const row = await testDb().query<{ id: string }>(
      "SELECT id FROM oauth_grants WHERE user_id = $1 AND client_id = $2",
      [userId, clientId]
    );
    return { clientId, redirectUri, verifier, code, grantId: row.rows[0].id };
  }

  const tokenCall = (
    form: Record<string, string | undefined>,
    target: NestExpressApplication = app
  ) =>
    request(target.getHttpServer())
      .post("/oauth/token")
      .set("X-Forwarded-For", uniqueIp())
      .type("form")
      .send(
        Object.fromEntries(
          Object.entries(form).filter(([, value]) => value !== undefined)
        ) as Record<string, string>
      );

  const exchange = (
    c: Connection,
    overrides: Record<string, string | undefined> = {}
  ) =>
    tokenCall({
      grant_type: "authorization_code",
      code: c.code,
      redirect_uri: c.redirectUri,
      client_id: c.clientId,
      code_verifier: c.verifier,
      ...overrides
    });

  const refreshCall = (
    refreshToken: string,
    clientId: string,
    target?: NestExpressApplication
  ) =>
    tokenCall(
      {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId
      },
      target
    );

  /** connect + code exchange; returns the tokens too. */
  async function connectAndExchange(
    userId: string,
    token: string,
    clientId: string,
    redirectUri?: string
  ): Promise<Connection & { accessToken: string; refreshToken: string }> {
    const c = await connect(userId, token, clientId, redirectUri);
    const response = await exchange(c);
    expect(response.status).toBe(200);
    return {
      ...c,
      accessToken: bodyOf(response).access_token as string,
      refreshToken: bodyOf(response).refresh_token as string
    };
  }

  const grantRows = async (userId: string) =>
    (
      await testDb().query<{ id: string; scope: string; client_name: string }>(
        "SELECT id, scope, client_name FROM oauth_grants WHERE user_id = $1",
        [userId]
      )
    ).rows;

  const expectInvalidGrant = (response: {
    status: number;
    body: unknown;
  }): void => {
    expect(response.status).toBe(400);
    expect(bodyOf(response).error).toBe("invalid_grant");
  };

  // ---------- discovery ----------

  it("AC-1 FR-MCP-002: the protected resource metadata is public at both root paths, not under /api/v1", async () => {
    const expected = {
      resource: RESOURCE,
      authorization_servers: [ISSUER],
      scopes_supported: ["pm4:read", "pm4:write"],
      bearer_methods_supported: ["header"],
      resource_name: "PM4"
    };
    for (const path of [
      "/.well-known/oauth-protected-resource/mcp",
      "/.well-known/oauth-protected-resource"
    ]) {
      const response = await request(app.getHttpServer()).get(path);
      expect(response.status, path).toBe(200);
      expect(response.body, path).toEqual(expected);
      expect(response.headers["cache-control"], path).toBe(
        "public, max-age=3600"
      );
    }
    const prefixed = await request(app.getHttpServer()).get(
      "/api/v1/.well-known/oauth-protected-resource/mcp"
    );
    expect(prefixed.status).toBe(404);
  });

  it("AC-2 FR-MCP-002: the authorization server metadata lists the endpoints and capabilities", async () => {
    const response = await request(app.getHttpServer()).get(
      "/.well-known/oauth-authorization-server"
    );
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      issuer: ISSUER,
      authorization_endpoint: `${ISSUER}/oauth/authorize`,
      token_endpoint: `${ISSUER}/oauth/token`,
      revocation_endpoint: `${ISSUER}/oauth/revoke`,
      registration_endpoint: `${ISSUER}/oauth/register`,
      scopes_supported: ["pm4:read", "pm4:write"],
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      revocation_endpoint_auth_methods_supported: ["none"],
      client_id_metadata_document_supported: true
    });
    expect(response.headers["cache-control"]).toBe("public, max-age=3600");
  });

  // ---------- registration ----------

  it("AC-8 FR-MCP-003: POST /oauth/register → 201 with the client, stored; old unused clients are purged", async () => {
    const owner = await insertUser();
    const old31Unused = randomUUID();
    const old31Granted = randomUUID();
    const old29 = randomUUID();
    const insertClient = (id: string, days: number) =>
      testDb().query(
        `INSERT INTO oauth_clients (id, client_name, redirect_uris, created_at)
         VALUES ($1, 'Old', ARRAY['http://127.0.0.1:1/cb'], now() - make_interval(days => $2))`,
        [id, days]
      );
    await insertClient(old31Unused, 31);
    await insertClient(old31Granted, 31);
    await insertClient(old29, 29);
    createdClientIds.push(old31Granted, old29);
    await testDb().query(
      `INSERT INTO oauth_grants (user_id, client_id, client_name, scope)
       VALUES ($1, $2, 'Old', 'read')`,
      [owner.id, old31Granted]
    );

    const before = Math.floor(Date.now() / 1000);
    const response = await registerClient(app, {
      client_name: "Agent X",
      redirect_uris: ["http://127.0.0.1:3333/cb"]
    });
    expect(response.status).toBe(201);
    expect(response.headers["cache-control"]).toBe("no-store");
    const body = bodyOf(response);
    expect(body.client_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
    createdClientIds.push(body.client_id as string);
    expect(body.client_id_issued_at as number).toBeGreaterThanOrEqual(
      before - 5
    );
    expect(body.client_id_issued_at as number).toBeLessThanOrEqual(before + 30);
    expect(body).toMatchObject({
      client_name: "Agent X",
      redirect_uris: ["http://127.0.0.1:3333/cb"],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"]
    });

    const rows = await testDb().query<{ id: string }>(
      "SELECT id FROM oauth_clients WHERE id = ANY($1)",
      [[body.client_id, old31Unused, old31Granted, old29]]
    );
    const ids = rows.rows.map((row) => row.id);
    expect(ids).toContain(body.client_id);
    expect(ids).not.toContain(old31Unused);
    expect(ids).toContain(old31Granted);
    expect(ids).toContain(old29);
  });

  it("AC-9 FR-MCP-003: register errors are OAuth JSON, 400, no-store", async () => {
    const ok = { client_name: "Agent X", redirect_uris: [DCR_REDIRECT] };
    const metadataErrors: [string, unknown][] = [
      ["no client_name", { redirect_uris: ok.redirect_uris }],
      ["101-char client_name", { ...ok, client_name: "n".repeat(101) }],
      [
        "client_secret_basic",
        { ...ok, token_endpoint_auth_method: "client_secret_basic" }
      ],
      ["response_types token", { ...ok, response_types: ["token"] }]
    ];
    const redirectErrors: [string, unknown][] = [
      ["no redirect_uris", { client_name: "Agent X" }],
      ["empty redirect_uris", { ...ok, redirect_uris: [] }],
      [
        "11 redirect_uris",
        {
          ...ok,
          redirect_uris: Array.from(
            { length: 11 },
            (_, i) => `https://a.example/cb${i}`
          )
        }
      ],
      [
        "http non-loopback",
        { ...ok, redirect_uris: ["http://example.com/cb"] }
      ],
      ["fragment", { ...ok, redirect_uris: ["https://a.example/cb#x"] }]
    ];
    const expectError = async (
      label: string,
      body: unknown,
      error: string
    ): Promise<void> => {
      const response = await registerClient(app, body);
      expect(response.status, label).toBe(400);
      expect(response.headers["content-type"], label).toMatch(
        /^application\/json/
      );
      expect(response.headers["cache-control"], label).toBe("no-store");
      expect(bodyOf(response).error, label).toBe(error);
    };
    for (const [label, body] of metadataErrors) {
      await expectError(label, body, "invalid_client_metadata");
    }
    for (const [label, body] of redirectErrors) {
      await expectError(label, body, "invalid_redirect_uri");
    }
  });

  it("AC-10 FR-MCP-003: the third registration from one IP → 429 rate-limited", async () => {
    const ip = uniqueIp();
    const body = { client_name: "Agent X", redirect_uris: [DCR_REDIRECT] };
    for (let i = 0; i < 2; i++) {
      const response = await registerClient(registerLimitedApp, body, ip);
      expect(response.status).toBe(201);
      createdClientIds.push(bodyOf(response).client_id as string);
    }
    const third = await registerClient(registerLimitedApp, body, ip);
    expect(third.status).toBe(429);
    expect(third.headers["content-type"]).toMatch(
      /^application\/problem\+json/
    );
    expect(bodyOf(third).type).toBe(errorType("rate-limited"));
  });

  // ---------- authorize ----------

  it("AC-11 FR-MCP-003: a CIMD client → 302 to the consent page; the document is cached", async () => {
    const url = serveDoc((u) => validDoc(u));
    const path = new URL(url).pathname;
    const first = await authorize({
      clientId: url,
      redirectUri: "http://127.0.0.1:4444/cb"
    });
    expect(first.status).toBe(302);
    const location = locationOf(first);
    expect(`${location.origin}${location.pathname}`).toBe(
      `${WEB}/auth/consent`
    );
    expect(location.searchParams.get("request")).toHaveLength(43);

    const second = await authorize({
      clientId: url,
      redirectUri: "http://127.0.0.1:4444/cb"
    });
    expect(second.status).toBe(302);
    expect(locationOf(second).searchParams.get("request")).toHaveLength(43);
    expect(hits.get(path)).toBe(1);
  });

  it("AC-12 FR-MCP-003: unusable clients → 302 to the consent page with error=invalid_client", async () => {
    const docCases: [string, (u: string) => Doc][] = [
      ["client_id differs", (u) => validDoc(u, { client_id: `${u}-other` })],
      ["not JSON", () => ({ body: "<html>nope</html>" })],
      ["over 10 kB", (u) => validDoc(u, { padding: "x".repeat(11_000) })],
      [
        "302 to a valid document",
        (u) => ({
          status: 302,
          headers: { Location: `${u}-target` },
          body: ""
        })
      ],
      [
        "no redirect_uris",
        (u) => ({
          body: JSON.stringify({ client_id: u, client_name: "Doc App" })
        })
      ],
      [
        "private_key_jwt",
        (u) => validDoc(u, { token_endpoint_auth_method: "private_key_jwt" })
      ]
    ];
    const urls: [string, string][] = [
      ["no client_id", ""],
      ["unknown UUID", randomUUID()],
      ["not-a-url", "not-a-url"],
      ["ftp", "ftp://127.0.0.1/x"]
    ];
    for (const [label, build] of docCases) {
      const path = `/client-${randomUUID()}.json`;
      if (label === "302 to a valid document") {
        docs.set(`${path}-target`, validDoc(`${docBase}${path}-target`));
      }
      urls.push([label, serveDoc(build, path)]);
    }
    const notFound = `${docBase}/missing-${randomUUID()}.json`;
    urls.push(["404", notFound]);

    for (const [label, clientId] of urls) {
      const response = await authorize({
        clientId: clientId === "" ? undefined : clientId,
        redirectUri: "http://127.0.0.1:4444/cb"
      });
      expect(response.status, label).toBe(302);
      expect(response.headers.location, label).toBe(
        `${WEB}/auth/consent?error=invalid_client`
      );
    }
  });

  it("AC-13 FR-MCP-004: redirect URI and parameter errors go where the spec says", async () => {
    const clientId = await dcrClient();

    for (const redirectUri of [undefined, "http://127.0.0.1:3333/other"]) {
      const response = await authorize({
        clientId,
        params: { redirect_uri: redirectUri }
      });
      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(
        `${WEB}/auth/consent?error=invalid_redirect_uri`
      );
    }

    const ok = await authorize({
      clientId,
      redirectUri: "http://127.0.0.1:40000/cb"
    });
    expect(ok.status).toBe(302);
    expect(locationOf(ok).searchParams.get("request")).toHaveLength(43);

    const cases: [string, Record<string, string | undefined>, string][] = [
      [
        "response_type=token",
        { response_type: "token" },
        "unsupported_response_type"
      ],
      ["no code_challenge", { code_challenge: undefined }, "invalid_request"],
      ["method plain", { code_challenge_method: "plain" }, "invalid_request"],
      ["scope pm4:admin", { scope: "pm4:admin" }, "invalid_scope"],
      [
        "foreign resource",
        { resource: "http://evil.example/mcp" },
        "invalid_target"
      ]
    ];
    for (const [label, params, error] of cases) {
      const response = await authorize({
        clientId,
        redirectUri: DCR_REDIRECT,
        params
      });
      expect(response.status, label).toBe(302);
      const location = locationOf(response);
      expect(`${location.origin}${location.pathname}`, label).toBe(
        DCR_REDIRECT
      );
      expect(location.searchParams.get("error"), label).toBe(error);
      expect(location.searchParams.get("state"), label).toBe("xyz");
    }

    const longState = await authorize({
      clientId,
      redirectUri: DCR_REDIRECT,
      params: { state: "s".repeat(501) }
    });
    expect(longState.status).toBe(302);
    const location = locationOf(longState);
    expect(`${location.origin}${location.pathname}`).toBe(DCR_REDIRECT);
    expect(location.searchParams.get("error")).toBe("invalid_request");
    expect(location.searchParams.has("state")).toBe(false);
  });

  it("AC-14 FR-MCP-004: a valid authorize stores the pending request (TTL ~1 h) and keeps the asked scope", async () => {
    const clientId = await dcrClient();
    const { token } = await newUser();

    const id = await pendingRequest(clientId, {
      redirectUri: "http://127.0.0.1:40000/cb"
    });
    const ttl = await testRedis().ttl(`oauth:request:${id}`);
    expect(ttl).toBeGreaterThanOrEqual(3590);
    expect(ttl).toBeLessThanOrEqual(3600);
    const both = await consentCall("get", id, token);
    expect(both.status).toBe(200);
    expect(bodyOf(both).scopes).toEqual(["pm4:read", "pm4:write"]);

    const readId = await pendingRequest(clientId, {
      redirectUri: "http://127.0.0.1:40000/cb",
      params: { scope: "pm4:read" }
    });
    const read = await consentCall("get", readId, token);
    expect(bodyOf(read).scopes).toEqual(["pm4:read"]);

    const withResource = await authorize({
      clientId,
      redirectUri: DCR_REDIRECT,
      params: { resource: RESOURCE }
    });
    expect(withResource.status).toBe(302);
    expect(locationOf(withResource).searchParams.get("request")).toHaveLength(
      43
    );
  });

  it("AC-15 FR-MCP-004: the second authorize with oauthAuthorize: 1 → 429", async () => {
    const reg = await registerClient(authorizeLimitedApp, {
      client_name: "Agent X",
      redirect_uris: [DCR_REDIRECT]
    });
    expect(reg.status).toBe(201);
    const clientId = bodyOf(reg).client_id as string;
    createdClientIds.push(clientId);
    const ip = uniqueIp();
    const first = await authorize({
      clientId,
      ip,
      target: authorizeLimitedApp
    });
    expect(first.status).toBe(302);
    const second = await authorize({
      clientId,
      ip,
      target: authorizeLimitedApp
    });
    expect(second.status).toBe(429);
    expect(second.headers.location).toBeUndefined();
  });

  // ---------- consent ----------

  it("AC-16 FR-MCP-005: GET consent returns the request for the signed-in user", async () => {
    const { token } = await newUser();
    const clientId = await dcrClient();
    const id = await pendingRequest(clientId, {
      redirectUri: "http://127.0.0.1:40000/cb"
    });
    const response = await consentCall("get", id, token);
    expect(response.status).toBe(200);
    const body = bodyOf(response);
    expect(Object.keys(body).sort()).toEqual(
      [
        "client",
        "existingGrant",
        "expiresAt",
        "id",
        "loopback",
        "redirectHost",
        "scopes"
      ].sort()
    );
    expect(body).toMatchObject({
      id,
      client: { name: "Agent X", clientIdHost: "127.0.0.1:3333" },
      redirectHost: "127.0.0.1:40000",
      loopback: true,
      scopes: ["pm4:read", "pm4:write"],
      existingGrant: null
    });
    const expiresIn = new Date(body.expiresAt as string).getTime() - Date.now();
    expect(expiresIn).toBeGreaterThan(9 * 60_000);
    expect(expiresIn).toBeLessThanOrEqual(10 * 60_000 + 5_000);

    const httpsClient = await dcrClient(["https://app.example/cb"], "Web App");
    const httpsId = await pendingRequest(httpsClient, {
      redirectUri: "https://app.example/cb"
    });
    const https = await consentCall("get", httpsId, token);
    expect(https.status).toBe(200);
    expect(bodyOf(https)).toMatchObject({
      loopback: false,
      redirectHost: "app.example"
    });

    expect((await consentCall("get", "unknown-id", token)).status).toBe(404);
    expect((await consentCall("get", id)).status).toBe(401);
  });

  it("AC-17 FR-MCP-005: Deny → redirectUrl with error=access_denied and state; the request is consumed", async () => {
    const { user, token } = await newUser();
    const clientId = await dcrClient();
    const id = await pendingRequest(clientId, {
      redirectUri: "http://127.0.0.1:40000/cb"
    });
    const response = await consentCall("post", id, token, "deny");
    expect(response.status).toBe(200);
    const url = new URL(bodyOf(response).redirectUrl as string);
    expect(`${url.origin}${url.pathname}`).toBe("http://127.0.0.1:40000/cb");
    expect(url.searchParams.get("error")).toBe("access_denied");
    expect(url.searchParams.get("state")).toBe("xyz");
    expect((await consentCall("get", id, token)).status).toBe(404);
    expect(await grantRows(user.id)).toHaveLength(0);
  });

  it("AC-18 FR-MCP-005: Allow → redirectUrl with code and state, one grant row; single use", async () => {
    const { user, token } = await newUser();
    const clientId = await dcrClient([DCR_REDIRECT], "Agent Allow");
    const id = await pendingRequest(clientId, {
      redirectUri: "http://127.0.0.1:40000/cb"
    });
    const response = await consentCall("post", id, token, "allow");
    expect(response.status).toBe(200);
    const url = new URL(bodyOf(response).redirectUrl as string);
    expect(`${url.origin}${url.pathname}`).toBe("http://127.0.0.1:40000/cb");
    expect(url.searchParams.get("code")).toHaveLength(43);
    expect(url.searchParams.get("state")).toBe("xyz");
    const rows = await grantRows(user.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      scope: "write",
      client_name: "Agent Allow"
    });
    expect((await consentCall("get", id, token)).status).toBe(404);
    expect((await consentCall("post", id, token, "allow")).status).toBe(404);
  });

  it("AC-19 FR-MCP-005: an expired request can be read, but Allow → 410 gone and deletes it", async () => {
    const { user, token } = await newUser();
    const clientId = await dcrClient();
    const id = await pendingRequest(clientId, {
      redirectUri: "http://127.0.0.1:40000/cb"
    });
    const key = `oauth:request:${id}`;
    const stored = JSON.parse((await testRedis().get(key))!) as Json;
    const past = new Date(Date.now() - 60_000).toISOString();
    await testRedis().set(
      key,
      JSON.stringify({ ...stored, expiresAt: past }),
      "KEEPTTL"
    );

    const read = await consentCall("get", id, token);
    expect(read.status).toBe(200);
    expect(new Date(bodyOf(read).expiresAt as string).toISOString()).toBe(past);

    const allow = await consentCall("post", id, token, "allow");
    expect(allow.status).toBe(410);
    expect(bodyOf(allow).type).toBe(errorType("gone"));
    expect((await consentCall("get", id, token)).status).toBe(404);
    expect(await grantRows(user.id)).toHaveLength(0);
  });

  // ---------- tokens ----------

  it("AC-20 FR-MCP-006: the code exchange returns an MCP access token and a refresh token", async () => {
    const { user, token } = await newUser();
    const clientId = await dcrClient();
    const c = await connect(user.id, token, clientId);
    const response = await exchange(c);
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    const body = bodyOf(response);
    expect(body.token_type).toBe("Bearer");
    expect(body.expires_in).toBe(900);
    expect(body.refresh_token).toHaveLength(43);
    expect(body.scope).toBe("pm4:read pm4:write");

    const claims = verifyHs256(body.access_token as string, mcpKey);
    expect(claims).not.toBeNull();
    expect(claims).toMatchObject({
      iss: ISSUER,
      aud: RESOURCE,
      sub: user.id,
      gid: c.grantId,
      client_id: clientId,
      scope: "pm4:read pm4:write"
    });
    expect(
      verifyHs256(body.access_token as string, process.env.JWT_ACCESS_SECRET!)
    ).toBeNull();
  });

  it("AC-21 FR-MCP-006: code exchange failures", async () => {
    const { user, token } = await newUser();
    const clientId = await dcrClient();
    const otherClient = await dcrClient();

    const reused = await connect(user.id, token, clientId);
    expect((await exchange(reused)).status).toBe(200);
    expectInvalidGrant(await exchange(reused));

    const wrong = await connect(user.id, token, clientId);
    expectInvalidGrant(await exchange(wrong, { code_verifier: newVerifier() }));
    // The failed attempt consumed the code (API-MCP-008).
    expectInvalidGrant(await exchange(wrong));

    expectInvalidGrant(
      await exchange(await connect(user.id, token, clientId), {
        client_id: otherClient
      })
    );
    expectInvalidGrant(
      await exchange(await connect(user.id, token, clientId), {
        redirect_uri: "http://127.0.0.1:40001/cb"
      })
    );

    const deleted = await connect(user.id, token, clientId);
    await testRedis().del(`oauth:code:${sha256Hex(deleted.code)}`);
    expectInvalidGrant(await exchange(deleted));

    const target = await exchange(await connect(user.id, token, clientId), {
      resource: "http://evil.example/mcp"
    });
    expect(target.status).toBe(400);
    expect(bodyOf(target).error).toBe("invalid_target");

    const password = await tokenCall({
      grant_type: "password",
      client_id: clientId
    });
    expect(password.status).toBe(400);
    expect(bodyOf(password).error).toBe("unsupported_grant_type");

    const noCode = await exchange(await connect(user.id, token, clientId), {
      code: undefined
    });
    expect(noCode.status).toBe(400);
    expect(bodyOf(noCode).error).toBe("invalid_request");

    const noClient = await exchange(await connect(user.id, token, clientId), {
      client_id: undefined
    });
    expect(noClient.status).toBe(401);
    expect(bodyOf(noClient).error).toBe("invalid_client");
  });

  it("AC-22 FR-MCP-006: a refresh rotates the token; reusing a rotated one kills the family", async () => {
    const { user, token } = await newUser();
    const clientId = await dcrClient();
    const c = await connectAndExchange(user.id, token, clientId);

    const refreshed = await refreshCall(c.refreshToken, clientId);
    expect(refreshed.status).toBe(200);
    const body = bodyOf(refreshed);
    expect(body.refresh_token).toHaveLength(43);
    expect(body.refresh_token).not.toBe(c.refreshToken);
    expect(body.token_type).toBe("Bearer");
    expect(body.expires_in).toBe(900);
    expect(verifyHs256(body.access_token as string, mcpKey)).toMatchObject({
      gid: c.grantId
    });
    expect(await testRedis().exists(`mcp:family:${c.grantId}`)).toBe(1);

    expectInvalidGrant(await refreshCall(c.refreshToken, clientId));
    expectInvalidGrant(
      await refreshCall(body.refresh_token as string, clientId)
    );
    expect(await testRedis().exists(`mcp:family:${c.grantId}`)).toBe(0);
    expect(await testRedis().exists(`mcp:revoked:${c.grantId}`)).toBe(1);
  });

  it("AC-23 FR-MCP-006: a refresh with another client_id changes nothing", async () => {
    const { user, token } = await newUser();
    const clientId = await dcrClient();
    const otherClient = await dcrClient();
    const c = await connectAndExchange(user.id, token, clientId);

    expectInvalidGrant(await refreshCall(c.refreshToken, otherClient));
    const right = await refreshCall(c.refreshToken, clientId);
    expect(right.status).toBe(200);
  });

  it("AC-24 FR-MCP-006: a refresh for a user off the allow-list → invalid_grant and the grant is deleted", async () => {
    const { user, token } = await newUser();
    const clientId = await dcrClient();
    const c = await connectAndExchange(user.id, token, clientId);
    expect(await grantRows(user.id)).toHaveLength(1);

    expectInvalidGrant(
      await refreshCall(c.refreshToken, clientId, allowListApp)
    );
    expect(await grantRows(user.id)).toHaveLength(0);
  });

  it("AC-25 FR-MCP-007: an MCP access token is refused by the web API", async () => {
    const { user, token } = await newUser();
    const clientId = await dcrClient();
    const c = await connectAndExchange(user.id, token, clientId);
    const response = await request(app.getHttpServer())
      .get("/api/v1/me")
      .set("Authorization", `Bearer ${c.accessToken}`);
    expect(response.status).toBe(401);
  });

  it("AC-26 FR-MCP-005: authorizing again replaces the grant and revokes the old one", async () => {
    const { user, token } = await newUser();
    const clientId = await dcrClient();
    const first = await connectAndExchange(user.id, token, clientId);
    const old = await testDb().query<{ created_at: Date }>(
      "SELECT created_at FROM oauth_grants WHERE id = $1",
      [first.grantId]
    );

    const id = await pendingRequest(clientId, {
      redirectUri: "http://127.0.0.1:40000/cb"
    });
    const consent = await consentCall("get", id, token);
    expect(consent.status).toBe(200);
    const existing = bodyOf(consent).existingGrant as { connectedAt: string };
    expect(new Date(existing.connectedAt).getTime()).toBe(
      old.rows[0].created_at.getTime()
    );

    expect((await consentCall("post", id, token, "allow")).status).toBe(200);
    const rows = await grantRows(user.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).not.toBe(first.grantId);
    expectInvalidGrant(await refreshCall(first.refreshToken, clientId));
    expect(await testRedis().exists(`mcp:revoked:${first.grantId}`)).toBe(1);
  });

  it("AC-27 FR-MCP-006: POST /oauth/revoke with a refresh token deletes the grant", async () => {
    const { user, token } = await newUser();
    const clientId = await dcrClient();
    const otherClient = await dcrClient();
    const c = await connectAndExchange(user.id, token, clientId);
    const revoke = (form: Record<string, string>) =>
      request(app.getHttpServer())
        .post("/oauth/revoke")
        .set("X-Forwarded-For", uniqueIp())
        .type("form")
        .send(form);

    for (const form of [
      { token: "an-unknown-token", client_id: clientId },
      { token: c.refreshToken, client_id: otherClient }
    ]) {
      const response = await revoke(form);
      expect(response.status).toBe(200);
      expect(response.text).toBe("");
    }
    expect(await grantRows(user.id)).toHaveLength(1);
    expect(await testRedis().exists(`mcp:revoked:${c.grantId}`)).toBe(0);

    const missing = await revoke({ client_id: clientId });
    expect(missing.status).toBe(400);
    expect(bodyOf(missing).error).toBe("invalid_request");

    const response = await revoke({
      token: c.refreshToken,
      client_id: clientId
    });
    expect(response.status).toBe(200);
    expect(response.text).toBe("");
    expect(await grantRows(user.id)).toHaveLength(0);
    expect(await testRedis().exists(`mcp:revoked:${c.grantId}`)).toBe(1);
    expectInvalidGrant(await refreshCall(c.refreshToken, clientId));
  });

  it("AC-28 FR-MCP-006: a token call then a revoke from one IP with oauthToken: 1 → the revoke gets 429", async () => {
    const ip = uniqueIp();
    const first = await request(tokenLimitedApp.getHttpServer())
      .post("/oauth/token")
      .set("X-Forwarded-For", ip)
      .type("form")
      .send({ grant_type: "password" });
    expect(first.status).not.toBe(429);
    const revoke = await request(tokenLimitedApp.getHttpServer())
      .post("/oauth/revoke")
      .set("X-Forwarded-For", ip)
      .type("form")
      .send({ token: "x", client_id: randomUUID() });
    expect(revoke.status).toBe(429);
  });
});
