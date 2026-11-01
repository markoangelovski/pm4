import { InjectionToken } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/app.setup.js";
import { RATE_LIMITS, type RateLimits } from "../src/rate-limit/rate-limits.js";

/** A provider the test replaces, e.g. `GoogleOidc` with the fake. */
export interface ProviderOverride {
  provide: InjectionToken;
  useValue: unknown;
}

/**
 * Limits high enough that no e2e suite hits them (many sign-ins from one IP);
 * a test passes its own `RATE_LIMITS` override to test the limits
 * (feat-api-rate-limit D10).
 */
export const TEST_RATE_LIMITS: RateLimits = {
  windowMs: 60_000,
  limits: {
    google: 1_000_000,
    callback: 1_000_000,
    token: 1_000_000,
    refresh: 1_000_000,
    logout: 1_000_000,
    user: 1_000_000
  }
};

/** Builds a fully configured app the same way `main.ts` does, for e2e tests. */
export async function createTestApp(
  overrides: ProviderOverride[] = []
): Promise<NestExpressApplication> {
  let builder = Test.createTestingModule({
    imports: [AppModule]
  });
  for (const { provide, useValue } of overrides) {
    builder = builder.overrideProvider(provide).useValue(useValue);
  }
  if (!overrides.some(({ provide }) => provide === RATE_LIMITS)) {
    builder = builder.overrideProvider(RATE_LIMITS).useValue(TEST_RATE_LIMITS);
  }
  const moduleRef = await builder.compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  return app;
}
