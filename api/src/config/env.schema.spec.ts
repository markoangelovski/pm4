import { validateEnv } from "./env.schema.js";

const validConfig = {
  NODE_ENV: "test",
  PORT: "3001",
  DATABASE_URL: "postgres://user:pass@localhost:5432/pm4_test",
  REDIS_URL: "redis://localhost:6379",
  CORS_ORIGINS: "http://localhost:3000, http://localhost:3001",
  WEB_APP_URL: "http://localhost:3000"
};

describe("validateEnv", () => {
  it("accepts a valid configuration and coerces/parses values", () => {
    const env = validateEnv(validConfig);

    expect(env).toEqual({
      NODE_ENV: "test",
      PORT: 3001,
      DATABASE_URL: "postgres://user:pass@localhost:5432/pm4_test",
      REDIS_URL: "redis://localhost:6379",
      CORS_ORIGINS: ["http://localhost:3000", "http://localhost:3001"],
      WEB_APP_URL: "http://localhost:3000"
    });
  });

  it("defaults NODE_ENV to development and PORT to 3001", () => {
    const env = validateEnv({
      ...validConfig,
      NODE_ENV: undefined,
      PORT: undefined
    });

    expect(env.NODE_ENV).toBe("development");
    expect(env.PORT).toBe(3001);
  });

  it("throws a readable error listing every missing variable", () => {
    expect(() => validateEnv({})).toThrow(
      /DATABASE_URL[\s\S]*REDIS_URL[\s\S]*CORS_ORIGINS[\s\S]*WEB_APP_URL/
    );
  });

  it("rejects a DATABASE_URL that is not a postgres connection string", () => {
    expect(() =>
      validateEnv({ ...validConfig, DATABASE_URL: "not-a-url" })
    ).toThrow(/DATABASE_URL/);
  });

  it("rejects a REDIS_URL with the wrong protocol", () => {
    expect(() =>
      validateEnv({ ...validConfig, REDIS_URL: "http://localhost:6379" })
    ).toThrow(/REDIS_URL/);
  });

  it("accepts a rediss:// (TLS) REDIS_URL", () => {
    const env = validateEnv({
      ...validConfig,
      REDIS_URL: "rediss://user:pass@host:6380"
    });
    expect(env.REDIS_URL).toBe("rediss://user:pass@host:6380");
  });

  it("rejects an out-of-range PORT", () => {
    expect(() => validateEnv({ ...validConfig, PORT: "70000" })).toThrow(
      /PORT/
    );
  });

  it("rejects an empty CORS_ORIGINS", () => {
    expect(() => validateEnv({ ...validConfig, CORS_ORIGINS: "" })).toThrow(
      /CORS_ORIGINS/
    );
  });
});
