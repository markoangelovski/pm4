import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

/**
 * Runs committed migrations from `api/drizzle/` against
 * `DATABASE_URL_DIRECT` (Neon's direct/unpooled URL; falls back to
 * `DATABASE_URL` locally, per ADR-0008). Never runs automatically (no
 * `postinstall`) — only via `npm run db:migrate`.
 */
async function main(): Promise<void> {
  const connectionString =
    process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Set DATABASE_URL_DIRECT (or DATABASE_URL) before running migrations."
    );
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  try {
    await migrate(db, {
      migrationsFolder: resolve(import.meta.dirname, "../../drizzle")
    });

    console.log("Migrations applied.");
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
