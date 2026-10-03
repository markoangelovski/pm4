import { Inject, Injectable } from "@nestjs/common";
import type { Env } from "./env.schema.js";

/**
 * DI token for the parsed `Env` (`validateEnv(process.env)`, provided by
 * `ConfigModule`). Deliberately not Nest's `ConfigService`: its `validate`
 * option writes parsed values back into `process.env` (e.g.
 * `ACCESS_TOKEN_TTL="900"`), which a second boot in the same process would
 * then reject.
 */
export const APP_ENV = Symbol("APP_ENV");

/**
 * Typed accessor over the validated env (see env.schema.ts). Avoids
 * stringly-typed `process.env.KEY` reads scattered across modules.
 */
@Injectable()
export class AppConfigService {
  constructor(@Inject(APP_ENV) private readonly env: Env) {}

  get nodeEnv(): Env["NODE_ENV"] {
    return this.env.NODE_ENV;
  }

  get isProduction(): boolean {
    return this.nodeEnv === "production";
  }

  get port(): number {
    return this.env.PORT;
  }

  get databaseUrl(): string {
    return this.env.DATABASE_URL;
  }

  get redisUrl(): string {
    return this.env.REDIS_URL;
  }

  get corsOrigins(): string[] {
    return this.env.CORS_ORIGINS;
  }

  get webAppUrl(): string {
    return this.env.WEB_APP_URL;
  }

  get googleClientId(): string {
    return this.env.GOOGLE_CLIENT_ID;
  }

  get googleClientSecret(): string {
    return this.env.GOOGLE_CLIENT_SECRET;
  }

  get googleCallbackUrl(): string {
    return this.env.GOOGLE_CALLBACK_URL;
  }

  get jwtAccessSecret(): string {
    return this.env.JWT_ACCESS_SECRET;
  }

  /** `ACCESS_TOKEN_TTL` in seconds. */
  get accessTokenTtlSeconds(): number {
    return this.env.ACCESS_TOKEN_TTL;
  }

  /** `REFRESH_TOKEN_TTL` in seconds. */
  get refreshTokenTtlSeconds(): number {
    return this.env.REFRESH_TOKEN_TTL;
  }

  /** `AUTH_ALLOWED_EMAILS`, lowercase; empty = open sign-up. */
  get allowedEmails(): string[] {
    return this.env.AUTH_ALLOWED_EMAILS;
  }
}
