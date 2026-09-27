import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Redis as IORedisClient } from 'ioredis';
import { AppConfigService } from '../config/app-config.service.js';

/**
 * Owns the ioredis client's lifecycle. Connects lazily (on first command),
 * so the app boots, and `openapi:export` runs, without a reachable Redis
 * (plan decision 3).
 */
@Injectable()
export class Redis implements OnModuleDestroy {
  private readonly logger = new Logger(Redis.name);
  readonly client: IORedisClient;

  constructor(configService: AppConfigService) {
    this.client = new IORedisClient(configService.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    // ioredis emits `error` on the client; without a listener, an emitted
    // error event throws and crashes the process (Node EventEmitter default).
    this.client.on('error', (error) =>
      this.logger.error(`Redis client error: ${error.message}`),
    );
  }

  /** Health check: `PING`, bounded by `timeoutMs`. */
  async ping(timeoutMs: number): Promise<void> {
    let timer: NodeJS.Timeout;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Redis ping timed out after ${timeoutMs}ms`)),
        timeoutMs,
      );
    });
    try {
      await Promise.race([this.client.ping(), timeout]);
    } finally {
      clearTimeout(timer!);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status !== 'end') {
      await this.client.quit();
    }
    this.logger.log('Redis connection closed');
  }
}
