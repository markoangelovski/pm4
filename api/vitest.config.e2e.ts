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
  },
});
