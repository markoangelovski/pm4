import { vi } from 'vitest';

/**
 * `ConfigModule`'s `@Module` decorator calls `NestConfigModule.forRoot(...)`
 * (and so `validateEnv`) as soon as `config.module.ts` is evaluated, i.e. at
 * import time — not lazily inside `compile()`. So each case here must reset
 * Vitest's module registry and re-`import` `AppModule` *after* mutating
 * `process.env`, or the mutation has no effect on an already-evaluated module.
 */
describe('Env validation at boot', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('rejects module compilation when a required variable is invalid', async () => {
    vi.resetModules();
    process.env.DATABASE_URL = 'not-a-postgres-url';

    const { AppModule } = await import('../src/app.module.js');
    const { Test } = await import('@nestjs/testing');

    await expect(
      Test.createTestingModule({ imports: [AppModule] }).compile(),
    ).rejects.toThrow(/DATABASE_URL/);
  });

  it('rejects module compilation when a required variable is missing', async () => {
    vi.resetModules();
    delete process.env.DATABASE_URL;

    const { AppModule } = await import('../src/app.module.js');
    const { Test } = await import('@nestjs/testing');

    await expect(
      Test.createTestingModule({ imports: [AppModule] }).compile(),
    ).rejects.toThrow(/DATABASE_URL/);
  });
});
