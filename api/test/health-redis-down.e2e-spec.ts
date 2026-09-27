import { vi } from 'vitest';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

/**
 * `Redis`'s constructor reads `AppConfigService.redisUrl` once, when Nest
 * instantiates the provider during `compile()`/`createTestApp()` — which
 * itself only runs after `config.module.ts` has already captured a snapshot
 * of `process.env` at import time (see `env-validation.e2e-spec.ts`). So the
 * REDIS_URL override below must happen, and the module graph must be
 * re-imported fresh, *before* building the app, not just before the request.
 */
describe('GET /health (Redis unreachable)', () => {
  let app: NestExpressApplication;
  const originalRedisUrl = process.env.REDIS_URL;

  beforeAll(async () => {
    vi.resetModules();
    // Port 1 is reserved/unused: nothing accepts connections there, so the
    // health check reliably reports redis:down (via error or its own timeout).
    process.env.REDIS_URL = 'redis://127.0.0.1:1';

    const { createTestApp } = await import('./create-test-app.js');
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    process.env.REDIS_URL = originalRedisUrl;
  });

  it('returns 503 with redis:down and db:up', async () => {
    const response = await request(app.getHttpServer()).get('/health');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: 'error', db: 'up', redis: 'down' });
  }, 15_000);
});
