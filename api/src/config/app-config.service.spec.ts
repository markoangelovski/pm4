import { Test, TestingModule } from "@nestjs/testing";
import { APP_ENV, AppConfigService } from "./app-config.service.js";
import { Env } from "./env.schema.js";

describe("AppConfigService", () => {
  let service: AppConfigService;

  const env: Env = {
    NODE_ENV: "production",
    PORT: 4000,
    DATABASE_URL: "postgres://localhost:5432/pm4",
    REDIS_URL: "redis://localhost:6379",
    CORS_ORIGINS: ["https://pm4.example.com"],
    WEB_APP_URL: "https://pm4.example.com",
    GOOGLE_CLIENT_ID: "client-id",
    GOOGLE_CLIENT_SECRET: "client-secret",
    GOOGLE_CALLBACK_URL: "https://api.example.com/api/v1/auth/google/callback",
    JWT_ACCESS_SECRET: "x".repeat(32),
    ACCESS_TOKEN_TTL: 900,
    REFRESH_TOKEN_TTL: 2592000,
    AUTH_ALLOWED_EMAILS: ["owner@example.com"]
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppConfigService, { provide: APP_ENV, useValue: env }]
    }).compile();

    service = module.get<AppConfigService>(AppConfigService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("exposes typed getters over the validated env", () => {
    expect(service.nodeEnv).toBe("production");
    expect(service.isProduction).toBe(true);
    expect(service.port).toBe(4000);
    expect(service.databaseUrl).toBe("postgres://localhost:5432/pm4");
    expect(service.redisUrl).toBe("redis://localhost:6379");
    expect(service.corsOrigins).toEqual(["https://pm4.example.com"]);
    expect(service.webAppUrl).toBe("https://pm4.example.com");
    expect(service.googleClientId).toBe("client-id");
    expect(service.googleClientSecret).toBe("client-secret");
    expect(service.googleCallbackUrl).toBe(
      "https://api.example.com/api/v1/auth/google/callback"
    );
    expect(service.jwtAccessSecret).toBe("x".repeat(32));
    expect(service.accessTokenTtlSeconds).toBe(900);
    expect(service.refreshTokenTtlSeconds).toBe(2592000);
    expect(service.allowedEmails).toEqual(["owner@example.com"]);
  });

  it("isProduction is false outside production", () => {
    env.NODE_ENV = "development";
    expect(service.isProduction).toBe(false);
    env.NODE_ENV = "production";
  });
});
