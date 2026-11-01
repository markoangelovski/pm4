import { ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard
} from "@nestjs/throttler";
import type {
  ThrottlerModuleOptions,
  ThrottlerStorage
} from "@nestjs/throttler";
import type {
  ThrottlerLimitDetail,
  ThrottlerRequest
} from "@nestjs/throttler/dist/throttler.guard.interface.js";
import type { Request, Response } from "express";
import { sanitizeReturnTo } from "../auth/auth.service.js";
import type { AuthUser } from "../common/decorators/current-user/current-user.decorator.js";
import { ProblemException } from "../common/filters/problem-details/problem-exception.js";
import { RedirectException } from "../common/filters/problem-details/redirect-exception.js";
import { AppConfigService } from "../config/app-config.service.js";
import { RATE_LIMITS, RATE_LIMIT_SCOPE_KEY, clientIp } from "./rate-limits.js";
import type { RateLimitScope, RateLimits } from "./rate-limits.js";

type RateLimitedRequest = Request & { user?: AuthUser };

/** Per-IP counters on the auth routes, one per user elsewhere. Runs after `AccessTokenGuard` (D7). */
@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storage: ThrottlerStorage,
    reflector: Reflector,
    @Inject(RATE_LIMITS) private readonly rateLimits: RateLimits,
    private readonly config: AppConfigService
  ) {
    super(options, storage, reflector);
  }

  private scopeOf(context: ExecutionContext): RateLimitScope {
    return (
      this.reflector.getAllAndOverride<RateLimitScope | undefined>(
        RATE_LIMIT_SCOPE_KEY,
        [context.getHandler(), context.getClass()]
      ) ?? "user"
    );
  }

  protected override handleRequest(props: ThrottlerRequest): Promise<boolean> {
    const scope = this.scopeOf(props.context);
    const req = props.context.switchToHttp().getRequest<RateLimitedRequest>();
    const tracker =
      scope === "user" && req.user ? "u:" + req.user.id : "ip:" + clientIp(req);
    return super.handleRequest({
      ...props,
      limit: this.rateLimits.limits[scope],
      ttl: this.rateLimits.windowMs,
      blockDuration: this.rateLimits.windowMs,
      getTracker: () => Promise.resolve(tracker),
      generateKey: () => "rl:" + scope + ":" + tracker
    });
  }

  protected override throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail
  ): Promise<void> {
    const seconds = Math.max(1, detail.timeToBlockExpire);
    const scope = this.scopeOf(context);
    const http = context.switchToHttp();

    if (scope === "google" || scope === "callback") {
      const url = new URL("/auth/sign-in", this.config.webAppUrl);
      url.searchParams.set("error", "rate-limited");
      if (scope === "google") {
        const returnTo = sanitizeReturnTo(
          http.getRequest<Request>().query.returnTo
        );
        if (returnTo !== null) url.searchParams.set("returnTo", returnTo);
      }
      throw new RedirectException(url.href);
    }

    http.getResponse<Response>().setHeader("Retry-After", String(seconds));
    throw new ProblemException(
      429,
      "rate-limited",
      "Too Many Requests",
      "Too many requests. Try again later.",
      { retryAfterSeconds: seconds }
    );
  }
}
