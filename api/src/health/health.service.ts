import { Injectable } from '@nestjs/common';
import { Drizzle } from '../database/drizzle.js';
import { Redis } from '../redis/redis.js';

export type ComponentStatus = 'up' | 'down';

export interface HealthResult {
  status: 'ok' | 'error';
  db: ComponentStatus;
  redis: ComponentStatus;
}

/** Neon may be cold after scale-to-zero (ADR-0008, NFR-003). */
const DB_TIMEOUT_MS = 10_000;
const REDIS_TIMEOUT_MS = 2_000;

@Injectable()
export class HealthService {
  constructor(
    private readonly drizzle: Drizzle,
    private readonly redis: Redis,
  ) {}

  async check(): Promise<HealthResult> {
    const [db, redis] = await Promise.all([
      this.probe(() => this.drizzle.ping(DB_TIMEOUT_MS)),
      this.probe(() => this.redis.ping(REDIS_TIMEOUT_MS)),
    ]);

    return {
      status: db === 'up' && redis === 'up' ? 'ok' : 'error',
      db,
      redis,
    };
  }

  private async probe(fn: () => Promise<void>): Promise<ComponentStatus> {
    try {
      await fn();
      return 'up';
    } catch {
      return 'down';
    }
  }
}
