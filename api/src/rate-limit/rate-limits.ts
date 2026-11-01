import { SetMetadata } from "@nestjs/common";
import { SkipThrottle, normalizeIp } from "@nestjs/throttler";
import type { Request } from "express";

/** A rate-limit counter: the auth routes' per-IP counters, and one per user (security.md#api-hardening). */
export type RateLimitScope =
  "google" | "callback" | "token" | "refresh" | "logout" | "user";

export interface RateLimits {
  windowMs: number;
  limits: Record<RateLimitScope, number>;
}

export const DEFAULT_RATE_LIMITS: RateLimits = {
  windowMs: 60_000,
  limits: {
    google: 10,
    callback: 10,
    token: 10,
    refresh: 30,
    logout: 30,
    user: 300
  }
};

/** DI token; `RateLimitModule` provides {@link DEFAULT_RATE_LIMITS}. */
export const RATE_LIMITS = "RATE_LIMITS";

export const RATE_LIMIT_SCOPE_KEY = "pm4:rateLimitScope";

/** The route's own per-IP counter (security.md#api-hardening). Routes without it use the "user" scope. */
export const RateLimit = (scope: Exclude<RateLimitScope, "user">) =>
  SetMetadata(RATE_LIMIT_SCOPE_KEY, scope);

/** Not rate limited (`/health`, API-SYS-003). */
export const NoRateLimit = () => SkipThrottle();

/** The client IP for the per-IP counters (D8). */
export function clientIp(req: Request): string {
  const raw = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const v4 = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(raw);
  if (v4) return normalizeIp(v4[1]);
  const v6 = /^\[([^\]]+)\](?::\d+)?$/.exec(raw);
  return normalizeIp(v6 ? v6[1] : raw);
}
