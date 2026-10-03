import { validateEnv } from "./env.schema.js";

// Read through a plain record: the auth fields are added to `Env` by T2.
const parse = (config: Record<string, unknown>): Record<string, unknown> =>
  validateEnv(config);

const validConfig = {
  NODE_ENV: "test",
  DATABASE_URL: "postgres://user:pass@localhost:5432/pm4_test",
  REDIS_URL: "redis://localhost:6379",
  CORS_ORIGINS: "http://localhost:3000",
  WEB_APP_URL: "http://localhost:3000",
  GOOGLE_CLIENT_ID: "client-id",
  GOOGLE_CLIENT_SECRET: "client-secret",
  GOOGLE_CALLBACK_URL: "http://localhost:3001/api/v1/auth/google/callback",
  JWT_ACCESS_SECRET: "x".repeat(32)
};

describe("validateEnv: auth variables (feat-auth-api-session)", () => {
  it("AC-6 FR-AUTH-003: ACCESS_TOKEN_TTL 15m → 900 s, REFRESH_TOKEN_TTL 30d → 2592000 s", () => {
    const env = parse({
      ...validConfig,
      ACCESS_TOKEN_TTL: "15m",
      REFRESH_TOKEN_TTL: "30d"
    });

    expect(env.ACCESS_TOKEN_TTL).toBe(900);
    expect(env.REFRESH_TOKEN_TTL).toBe(2592000);
  });

  it("AC-6 FR-AUTH-003: TTLs default to 15m and 30d, AUTH_ALLOWED_EMAILS to []", () => {
    const env = parse(validConfig);

    expect(env.ACCESS_TOKEN_TTL).toBe(900);
    expect(env.REFRESH_TOKEN_TTL).toBe(2592000);
    expect(env.AUTH_ALLOWED_EMAILS).toEqual([]);
  });

  it.each(["15x", "0m"])(
    "AC-6 FR-AUTH-003: ACCESS_TOKEN_TTL %s is rejected",
    (value) => {
      expect(() => parse({ ...validConfig, ACCESS_TOKEN_TTL: value })).toThrow(
        /ACCESS_TOKEN_TTL/
      );
    }
  );

  it("AC-6 FR-AUTH-003: a JWT_ACCESS_SECRET shorter than 32 characters is rejected", () => {
    expect(() =>
      parse({ ...validConfig, JWT_ACCESS_SECRET: "x".repeat(31) })
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  it.each([
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_CALLBACK_URL",
    "JWT_ACCESS_SECRET"
  ])("AC-6 FR-AUTH-001: %s is required", (key) => {
    expect(() => parse({ ...validConfig, [key]: undefined })).toThrow(
      new RegExp(key)
    );
  });

  it("AC-6 FR-AUTH-002: AUTH_ALLOWED_EMAILS is split, trimmed, lowercased, empties dropped", () => {
    const env = parse({
      ...validConfig,
      AUTH_ALLOWED_EMAILS: " A@x.com, b@y.com ,"
    });

    expect(env.AUTH_ALLOWED_EMAILS).toEqual(["a@x.com", "b@y.com"]);
  });
});
