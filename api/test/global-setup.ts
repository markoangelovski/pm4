import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import "./setup-env.js";

/**
 * Vitest `globalSetup` for e2e: applies the committed migrations to the e2e
 * database once per run (feat-auth-api-session D13), so CI and a fresh
 * docker-compose volume need no separate migrate step.
 */
export default async function setup(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await migrate(drizzle(pool), {
      migrationsFolder: resolve(import.meta.dirname, "../drizzle")
    });
  } finally {
    await pool.end();
  }
}
