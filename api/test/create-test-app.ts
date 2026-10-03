import { InjectionToken } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/app.setup.js";

/** A provider the test replaces, e.g. `GoogleOidc` with the fake. */
export interface ProviderOverride {
  provide: InjectionToken;
  useValue: unknown;
}

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
  const moduleRef = await builder.compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  return app;
}
