import { vi } from "vitest";

/**
 * `ConfigModule` validates the env in its `APP_ENV` provider factory, so an
 * invalid env rejects `compile()` (feat-auth-api-session *Config (T2)*). Each
 * case still resets Vitest's module registry and re-`import`s `AppModule`
 * after mutating `process.env`, so every case boots from a fresh module graph.
 */
describe("Env validation at boot", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("rejects module compilation when a required variable is invalid", async () => {
    vi.resetModules();
    process.env.DATABASE_URL = "not-a-postgres-url";

    const { AppModule } = await import("../src/app.module.js");
    const { Test } = await import("@nestjs/testing");

    await expect(
      Test.createTestingModule({ imports: [AppModule] }).compile()
    ).rejects.toThrow(/DATABASE_URL/);
  });

  it("rejects module compilation when a required variable is missing", async () => {
    vi.resetModules();
    delete process.env.DATABASE_URL;

    const { AppModule } = await import("../src/app.module.js");
    const { Test } = await import("@nestjs/testing");

    await expect(
      Test.createTestingModule({ imports: [AppModule] }).compile()
    ).rejects.toThrow(/DATABASE_URL/);
  });
});
