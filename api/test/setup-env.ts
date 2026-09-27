// e2e env values (plan decision 5: no `.env.test`, since `.env.*` is
// git-ignored). Points at the docker-compose services; `pm4_test` is the
// e2e database. Real env vars (if already set) take precedence.
process.env.NODE_ENV ??= 'test';
// e2e tests never call app.listen(): app.init() + supertest against
// getHttpServer() only, so this value is never actually bound.
process.env.PORT ??= '3001';
process.env.DATABASE_URL ??= 'postgres://pm4:pm4@localhost:5432/pm4_test';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.CORS_ORIGINS ??= 'http://localhost:3000';
process.env.WEB_APP_URL ??= 'http://localhost:3000';
