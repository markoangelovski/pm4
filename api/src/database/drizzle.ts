import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { AppConfigService } from '../config/app-config.service.js';
import * as schema from './schema/index.js';

export type DrizzleDb = NodePgDatabase<typeof schema>;

/** DI token for the Drizzle database instance (see `DatabaseModule`). */
export const DRIZZLE = Symbol('DRIZZLE');

/**
 * Owns the Postgres pool's lifecycle. `pg.Pool` connects lazily (on first
 * query), so the app boots, and `openapi:export` runs, without a reachable
 * database (plan decision 3).
 */
@Injectable()
export class Drizzle implements OnModuleDestroy {
  private readonly logger = new Logger(Drizzle.name);
  readonly pool: Pool;
  readonly db: DrizzleDb;

  constructor(configService: AppConfigService) {
    this.pool = new Pool({ connectionString: configService.databaseUrl });
    this.db = drizzle(this.pool, { schema });
  }

  /**
   * Health check: `SELECT 1`, bounded by `timeoutMs` (Neon may be cold,
   * NFR-003). Rejects on timeout or on a connection/query error.
   */
  async ping(timeoutMs: number): Promise<void> {
    let timer: NodeJS.Timeout;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Postgres ping timed out after ${timeoutMs}ms`)),
        timeoutMs,
      );
    });
    try {
      await Promise.race([this.pool.query('SELECT 1'), timeout]);
    } finally {
      clearTimeout(timer!);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
    this.logger.log('Postgres pool closed');
  }
}
