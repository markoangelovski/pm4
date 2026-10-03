import { createHash, createHmac, randomUUID } from "node:crypto";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Redis } from "ioredis";
import { Pool } from "pg";
import { vi } from "vitest";
import type { GoogleProfile } from "../../src/auth/google-oidc.js";
import type { FakeGoogleOidc } from "../fake-google-oidc.js";

// ---------- hashing (security.md: h(x) = sha256 hex; PKCE S256) ----------

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

// ---------- access tokens (signed here with node:crypto, not the app) ----------

const base64UrlJson = (value: object): string =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

/** A JWT signed HS256 with `secret` (default: the app's `JWT_ACCESS_SECRET`). */
export function signJwt(
  payload: Record<string, unknown>,
  secret: string = process.env.JWT_ACCESS_SECRET!
): string {
  const unsigned = `${base64UrlJson({ alg: "HS256", typ: "JWT" })}.${base64UrlJson(payload)}`;
  const signature = createHmac("sha256", secret)
    .update(unsigned)
    .digest("base64url");
  return `${unsigned}.${signature}`;
}

/** An unsigned `alg: none` JWT. */
export function unsignedJwt(payload: Record<string, unknown>): string {
  return `${base64UrlJson({ alg: "none", typ: "JWT" })}.${base64UrlJson(payload)}.`;
}

const nowSeconds = (): number => Math.floor(Date.now() / 1000);

/** A valid access token for `userId`, as the API would issue it. */
export function accessTokenFor(userId: string, ttlSeconds = 900): string {
  const iat = nowSeconds();
  return signJwt({ sub: userId, iat, exp: iat + ttlSeconds });
}

/** An access token for `userId` that expired 30 minutes ago. */
export function expiredAccessTokenFor(userId: string): string {
  const iat = nowSeconds() - 3600;
  return signJwt({ sub: userId, iat, exp: iat + 1800 });
}

// ---------- test data ----------

/** Every user the auth tests create has an email on this domain. */
export const TEST_EMAIL_DOMAIN = "auth-ac.test";

export function uniqueEmail(prefix = "user"): string {
  return `${prefix}-${randomUUID().slice(0, 8)}@${TEST_EMAIL_DOMAIN}`;
}

/** A verified Google profile with a fresh subject and email. */
export function googleProfile(
  overrides: Partial<GoogleProfile> = {}
): GoogleProfile {
  return {
    subject: `google-${randomUUID()}`,
    email: uniqueEmail(),
    emailVerified: true,
    name: "Ada Lovelace",
    picture: "https://lh3.googleusercontent.com/a/ada",
    ...overrides
  };
}

// ---------- apps ----------

/**
 * Builds an e2e app with `GoogleOidc` replaced by `fake`. `env` overrides
 * `process.env` while the module graph is re-imported (config is read at
 * import time, see env-validation.e2e-spec.ts), e.g. an
 * `AUTH_ALLOWED_EMAILS` for one app only. Several apps can be open at once:
 * they share Postgres and Redis.
 */
export async function createAuthTestApp(
  fake: FakeGoogleOidc,
  env: Record<string, string> = {}
): Promise<NestExpressApplication> {
  const saved = Object.fromEntries(
    Object.keys(env).map((key) => [key, process.env[key]])
  );
  vi.resetModules();
  Object.assign(process.env, env);
  try {
    const { createTestApp } = await import("../create-test-app.js");
    const { GoogleOidc } = await import("../../src/auth/google-oidc.js");
    return await createTestApp([{ provide: GoogleOidc, useValue: fake }]);
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

// ---------- direct Postgres / Redis access ----------

let pool: Pool | undefined;
let redis: Redis | undefined;

export function testDb(): Pool {
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

export function testRedis(): Redis {
  redis ??= new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: 1 });
  return redis;
}

export interface UserRow {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  time_zone: string;
  created_at: Date;
  updated_at: Date;
}

export async function insertUser(
  fields: Partial<
    Pick<UserRow, "email" | "display_name" | "avatar_url" | "time_zone">
  > = {}
): Promise<UserRow> {
  const result = await testDb().query<UserRow>(
    `INSERT INTO users (email, display_name, avatar_url, time_zone)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [
      fields.email ?? uniqueEmail(),
      fields.display_name ?? "Grace Hopper",
      fields.avatar_url === undefined
        ? "https://lh3.googleusercontent.com/a/grace"
        : fields.avatar_url,
      fields.time_zone ?? "Europe/Zagreb"
    ]
  );
  return result.rows[0];
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const result = await testDb().query<UserRow>(
    "SELECT * FROM users WHERE lower(email) = lower($1)",
    [email]
  );
  return result.rows[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const result = await testDb().query<UserRow>(
    "SELECT * FROM users WHERE id = $1",
    [id]
  );
  return result.rows[0] ?? null;
}

export async function deleteUser(id: string): Promise<void> {
  await testDb().query("DELETE FROM users WHERE id = $1", [id]);
}

/** Deletes the users created by these tests, plus any extra emails. */
export async function deleteTestUsers(
  extraEmails: string[] = []
): Promise<void> {
  await testDb().query(
    "DELETE FROM users WHERE email LIKE $1 OR lower(email) = ANY($2)",
    [`%@${TEST_EMAIL_DOMAIN}`, extraEmails.map((e) => e.toLowerCase())]
  );
}

export async function closeTestClients(): Promise<void> {
  await pool?.end();
  pool = undefined;
  await redis?.quit();
  redis = undefined;
}
