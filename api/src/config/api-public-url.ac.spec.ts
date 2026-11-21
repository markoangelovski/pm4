import { validateEnv } from "./env.schema.js";

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
  JWT_ACCESS_SECRET: "x".repeat(32),
  PMSPA_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64")
};

describe("validateEnv: API_PUBLIC_URL (feat-mcp-oauth-api)", () => {
  it("AC-4 FR-MCP-002: no API_PUBLIC_URL → http://localhost:3001 in development and test", () => {
    expect(
      parse({ ...validConfig, NODE_ENV: "development" }).API_PUBLIC_URL
    ).toBe("http://localhost:3001");
    expect(parse({ ...validConfig, NODE_ENV: "test" }).API_PUBLIC_URL).toBe(
      "http://localhost:3001"
    );
  });

  it("AC-4 FR-MCP-002: no API_PUBLIC_URL in production → fails", () => {
    expect(() => parse({ ...validConfig, NODE_ENV: "production" })).toThrow(
      /API_PUBLIC_URL/
    );
  });

  it.each(["ftp://x", "https://a.b/", "https://a.b/x", "https://a.b?q=1"])(
    "AC-4 FR-MCP-002: API_PUBLIC_URL %s → fails",
    (value) => {
      expect(() => parse({ ...validConfig, API_PUBLIC_URL: value })).toThrow(
        /API_PUBLIC_URL/
      );
    }
  );

  it("AC-4 FR-MCP-002: https://api.example.com is kept", () => {
    expect(
      parse({
        ...validConfig,
        NODE_ENV: "production",
        API_PUBLIC_URL: "https://api.example.com"
      }).API_PUBLIC_URL
    ).toBe("https://api.example.com");
  });
});
