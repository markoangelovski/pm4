import { defineConfig } from 'drizzle-kit';

/**
 * drizzle-kit config (ADR-0008). Migrations are generated into `./drizzle`
 * (committed) and run only via `npm run db:migrate` (never automatically).
 * Uses Neon's direct/unpooled URL for migrations; falls back to
 * `DATABASE_URL` for local dev, where there is only one connection string.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL ?? '',
  },
});
