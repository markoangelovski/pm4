import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    setupFiles: ['./test/setup-env.ts'],
    // Migrates the e2e database once per run (feat-auth-api-session D13).
    globalSetup: ['./test/global-setup.ts'],
    // Neon-style cold starts (NFR-003) and the deliberate dead-Redis-port
    // case need more than Vitest's 5s default.
    hookTimeout: 20_000,
    testTimeout: 20_000,
    // e2e specs mutate `process.env` and re-`import()` the module graph
    // (env-validation, health-redis-down); running them concurrently in the
    // same worker would let one spec's env mutation leak into another.
    fileParallelism: false,
    onUnhandledError(error) {
      // `@nestjs/config`'s `ConfigModule.forRoot()` is an `async` function
      // whose `validate` option (our zod schema) throws synchronously, before
      // any `await` — so JS turns that throw into an already-rejected Promise
      // that `forRoot()` places straight into `AppModule`'s `imports` array at
      // *import* time. Nest only `await`s that promise later, inside
      // `compile()`, so Node reports the gap as an unhandled rejection even
      // though `compile()` goes on to handle it correctly (see
      // `env-validation.e2e-spec.ts`, which asserts on that same rejection).
      // Ignore only this expected boot-validation error; anything else still
      // fails the run.
      if (error.message.includes('Invalid environment configuration')) {
        return false;
      }
    },
  },
});
