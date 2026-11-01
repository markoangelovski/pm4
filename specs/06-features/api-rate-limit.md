---
id: feat-api-rate-limit
title: Rate limiting for the API
status: approved
owner: Marko Angelovski
last_updated: 2026-11-01
milestone: M1
requirements: [NFR-004]
related: [sec, api-conventions, api-endpoints, arch-stack, web-screens, web-conventions, OQ-039, OQ-060, OQ-253, OQ-254, OQ-255, OQ-256, OQ-257]
prototype: 078f795
---

# Rate limiting for the API

## Goal
Every API endpoint except `/health` and API-SYS-003 is rate limited as security.md#api-hardening specifies: a
counter per auth route and client IP, one counter per user for everything else. Over the limit the API answers
`429` `rate-limited` (conventions.md#errors), and the two sign-in navigations redirect to the web's sign-in page
with `error=rate-limited` (API-AUTH-001, API-AUTH-002). On the web, any `429` shows one toast (SCR-007), queries don't retry it, and the sign-in screens handle
`rate-limited` (SCR-001, SCR-002), as prototyped in `078f795` (OQ-256).

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | `@nestjs/throttler` 6.7.x with PM4's own `ThrottlerStorage` on the existing ioredis client (one Lua script per hit); no storage package, no second Redis connection | Owner, 2026-11-01 (accepted the proposal, which named the dependency) |
| D2 | One counter per auth route and IP: google 10, callback 10, token 10, refresh 30, logout 30 per minute | OQ-253 (owner, 2026-11-01) |
| D3 | One counter per user across the whole API, 300 per minute | OQ-254 (owner, 2026-11-01) |
| D4 | Redis unreachable, or no answer within 500 ms → the request is allowed and a warning logged | OQ-255 (owner, 2026-11-01) |
| D5 | API-AUTH-001/002 over the limit → 302 to `<WEB_APP_URL>/auth/sign-in?error=rate-limited` (+ API-AUTH-001's valid `returnTo`) | OQ-257 (owner, 2026-11-01) |
| D6 | Fixed window: the first hit sets the key's expiry to the window; hits past the limit still count but never extend it. `Retry-After` = seconds until the key expires (≥ 1) | Main session, 2026-11-01 |
| D7 | The rate-limit guard runs **after** `AccessTokenGuard` (both `APP_GUARD` in `AuthModule`, in that order), so signed-in requests are keyed by user id, and a `401` isn't counted | Main session, 2026-11-01 |
| D8 | `trust proxy` = 1 (Azure App Service front end); the IP drops a `:port` suffix (Azure sends one) and an IPv6 address counts by its /64 | Main session, 2026-11-01 |
| D9 | No `X-RateLimit-*` headers (`setHeaders: false`); only `Retry-After` on a `429`. The web reads `retryAfterSeconds` from the body, so CORS exposes nothing new | Main session, 2026-11-01 |
| D10 | The limits are a provider (`RATE_LIMITS`). `createTestApp` replaces them with 1 000 000 per scope unless a test passes its own, so the other e2e suites (many sign-ins from one IP) are unaffected | Main session, 2026-11-01 |
| D11 | Any `429` shows one toast "Too many requests. Try again in N seconds." (fixed id) from `RateLimitNotifier` in the signed-in shell, which watches the query and mutation caches; screens skip their own error toast on a `429` (`toastError`) | Owner, prototype `078f795` (OQ-256) |
| D12 | SCR-001 `error=rate-limited` → "Too many sign-in attempts. Try again in a minute." | OQ-256 (owner, 2026-11-01) |
| D13 | Queries don't retry a `429`; SCR-002 sends a `429` from API-AUTH-003 to `?error=rate-limited` | OQ-256 (owner, 2026-11-01) |
| D14 | A `429` on refresh keeps the session: already so (`lib/auth/session.ts`, covered by feat-auth-web-session's `session.ac.test.ts` AC-6), no change | OQ-256 (owner, 2026-11-01) |

## Scope
**In:** `api/src/rate-limit/` (limits, decorators, client IP, Redis storage, guard, module), the guard in `AuthModule`,
the decorators on the auth, health and version controllers, `RedirectException` and its branch in
`ProblemDetailsFilter`, `trust proxy` in `app.setup.ts`, `429` in the OpenAPI contract. Web: `features/system/rate-limit.ts` and
`RateLimitNotifier` (promoted), the notifier in the signed-in shell, no query retry on a `429`, the SCR-001 and SCR-002
`rate-limited` cases, `toastError` in the 23 production twins of the prototype commit, `npm run api:types`.

**Test step (main session, before T1):** promotes the two web system files (`node scripts/pm4.mjs promote <T3's id>`), installs `@nestjs/throttler@^6.7.1` (`cd api && npm install @nestjs/throttler@^6.7.1`,
owner-approved, D1), writes the acceptance tests and the stubs below, and adds the `RATE_LIMITS` default to
`api/test/create-test-app.ts` (*Test harness*), then `pm4 hash`.

**Non-goals** (implementers must not touch these):
- `web/proto/**` and `web/app/proto/**` (the prototype is final), the refresh path in `lib/auth/session.ts` (only `exchange` changes), and any
  `toast.error` the prototype commit didn't change (clipboard, PMSPA status toasts, the log form's day check).
- `SessionStore`, `AuthService` and the PMSPA rate-limit code (`api/src/integrations/pmspa/**`): PMSPA's own limits are unrelated.
- CORS (`exposedHeaders`), `api/package.json` / `package-lock.json` (the test step installs the package), any acceptance test, `api/test/create-test-app.ts`.
- In web tasks: anything under `api/` (`api:types` only reads `api/openapi.json`).

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/02-architecture/security.md#api-hardening` | The limits, keys, fail-open and client-IP rules |
| `specs/03-api/conventions.md#errors` | The `429` body and header |
| `specs/03-api/endpoints.md#api-auth-001-start-google-sign-in` | The rate-limited redirects of API-AUTH-001 and API-AUTH-002 |
| `api/src/auth/session.store.ts` | `defineCommand` with a Lua script on `this.redis.client`, and its typed client (T1) |
| `api/src/redis/redis.ts` | `ping`'s `Promise.race` timeout: copy it for the 500 ms bound (T1) |
| `api/src/auth/auth.module.ts`, `api/src/common/guards/access-token/access-token.guard.ts` | `APP_GUARD` registration; `request.user` (T1) |
| `api/src/common/filters/problem-details/problem-details.filter.ts`, `problem-exception.ts` | `ProblemException` for the `429`; where the redirect branch goes (T1) |
| `api/src/auth/auth.service.ts` | `sanitizeReturnTo` (exported) for the redirect (T1) |
| `api/node_modules/@nestjs/throttler/dist/throttler.guard.d.ts`, `throttler.guard.interface.d.ts` | `ThrottlerGuard`'s protected methods and `ThrottlerRequest` (T1) |
| `api/src/common/decorators/api-problem-responses/api-problem-responses.decorator.ts` | The decorator T2 extends |
| `web/proto/features/system/rate-limit.ts`, `web/proto/features/system/components/rate-limit-notifier.tsx` | The promoted files; `toastError` for T4 (T3, T4) |
| `web/proto/mock/shell/proto-shell.tsx` | Where the notifier is mounted: copy into the real shell (T3) |
| `web/lib/api/problem.ts` | `ApiError`, `isApiError` (T3) |
| `web/features/auth/components/auth-callback.tsx` | `fail()` and the exchange's rejection (T3) |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| api | `api/package.json`, `api/package-lock.json` | M | tests | `npm install @nestjs/throttler@^6.7.1` |
| api | `api/test/rate-limit.ac.e2e-spec.ts` | C | tests | Acceptance tests (small limits, own app) |
| api | `api/test/rate-limit-redis-down.ac.e2e-spec.ts` | C | tests | Fail open (as `health-redis-down.e2e-spec.ts`) |
| api | `api/src/rate-limit/rate-limits.ac.spec.ts`, `api/src/rate-limit/redis-throttler.storage.ac.spec.ts` | C | tests | Unit acceptance tests |
| api | `api/test/create-test-app.ts` | M | tests | The `RATE_LIMITS` default (*Test harness*) |
| api | `api/src/rate-limit/rate-limits.ts` | C | tests, T1 | Stub (real `DEFAULT_RATE_LIMITS`, `RATE_LIMITS`; `clientIp` throws), then T1 |
| api | `api/src/rate-limit/redis-throttler.storage.ts` | C | tests, T1 | Stub (`increment` throws), then T1 |
| api | `api/src/rate-limit/rate-limit.guard.ts`, `api/src/rate-limit/rate-limit.module.ts` | C | T1 | Hand-written: `nest g guard` / `nest g module` then edit. No `rate-limit.guard.spec.ts`: an exception to the keep-the-generated-spec convention, because the e2e ACs cover the guard |
| api | `api/src/common/filters/problem-details/redirect-exception.ts` | C | T1 | |
| api | `api/src/common/filters/problem-details/problem-details.filter.ts` | M | T1 | Redirect branch |
| api | `api/src/auth/auth.module.ts` | M | T1 | Imports `RateLimitModule`, second `APP_GUARD` |
| api | `api/src/auth/auth.controller.ts` | M | T1, T2 | `@RateLimit(...)` (T1); API-AUTH-001's docs decorator (T2) |
| api | `api/src/health/health.controller.ts`, `api/src/version/version.controller.ts` | M | T1, T2 | `@NoRateLimit()` (T1); version's docs decorator (T2) |
| api | `api/src/app.setup.ts` | M | T1 | `trust proxy` |
| api | `api/src/common/decorators/api-problem-responses/api-problem-responses.decorator.ts` | M | T2 | `429`, `ApiProblemResponsesNotLimited` |
| api | `api/openapi.json` | M | T2 | `npm run openapi:export` |
| web | `web/features/system/rate-limit.ac.test.ts`, `web/features/system/components/rate-limit-notifier.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/lib/query-client.ac.test.tsx`, `web/features/auth/components/auth-rate-limit.ac.test.tsx` | C | tests | Acceptance tests |
| web | `proto/features/system/rate-limit.ts` → `features/system/rate-limit.ts` | P | tests, T3 | Promoted in the test step, as is |
| web | `proto/features/system/components/rate-limit-notifier.tsx` → `features/system/components/rate-limit-notifier.tsx` | P | tests, T3 | Promoted in the test step, as is |
| web | `web/app/(dashboard-layout)/layout.tsx` | M | T3 | Mount `RateLimitNotifier` |
| web | `web/lib/query-client.tsx` | M | T3 | No retry on a `429` |
| web | `web/features/auth/components/sign-in-state.tsx`, `web/features/auth/components/auth-callback.tsx` | M | T3 | `rate-limited` |
| web | `web/lib/auth/session.ts` | M | T3 | `exchange` throws `ApiError` |
| web | `web/lib/api/schema.d.ts` | M | T3 | `npm run api:types` |
| web | `web/features/bookings/components/booking-cell.tsx`, `web/features/bookings/components/day-section.tsx` | M | T4 | `toastError` |
| web | `web/features/integrations/components/pmspa-connection-card.tsx`, `web/features/integrations/components/pmspa-projects-tab.tsx`, `web/features/integrations/components/pmspa-time-tab.tsx`, `web/features/integrations/components/sync-flag.tsx` | M | T4 | `toastError` |
| web | `web/features/notes/components/delete-item-dialog.tsx`, `web/features/notes/components/note-form-dialog.tsx`, `web/features/notes/components/note-inline-form.tsx`, `web/features/notes/components/todo-add-input.tsx`, `web/features/notes/components/todo-form-dialog.tsx`, `web/features/notes/components/todo-inline-form.tsx`, `web/features/notes/components/todo-row.tsx` | M | T4 | `toastError` |
| web | `web/features/projects/components/delete-project-dialog.tsx`, `web/features/projects/components/project-form-dialog.tsx` | M | T4 | `toastError` |
| web | `web/features/settings/components/user-settings.tsx` | M | T4 | `toastError` |
| web | `web/features/tasks/api.ts`, `web/features/tasks/components/delete-task-dialog.tsx`, `web/features/tasks/components/task-form-dialog.tsx` | M | T4 | `toastError` |
| web | `web/features/time/components/day-header.tsx`, `web/features/time/components/delete-day-dialog.tsx`, `web/features/time/components/delete-log-dialog.tsx`, `web/features/time/components/log-form-dialog.tsx` | M | T4 | `toastError` |

## Interfaces

### Limits, decorators and client IP (T1)
```ts
// api/src/rate-limit/rate-limits.ts
export type RateLimitScope = "google" | "callback" | "token" | "refresh" | "logout" | "user";
export interface RateLimits { windowMs: number; limits: Record<RateLimitScope, number> }
export const DEFAULT_RATE_LIMITS: RateLimits = {
  windowMs: 60_000,
  limits: { google: 10, callback: 10, token: 10, refresh: 30, logout: 30, user: 300 }
};
export const RATE_LIMITS = "RATE_LIMITS"; // DI token; RateLimitModule provides DEFAULT_RATE_LIMITS
export const RATE_LIMIT_SCOPE_KEY = "pm4:rateLimitScope";
/** The route's own per-IP counter (security.md#api-hardening). Routes without it use the "user" scope. */
export const RateLimit = (scope: Exclude<RateLimitScope, "user">) => SetMetadata(RATE_LIMIT_SCOPE_KEY, scope);
/** Not rate limited (`/health`, API-SYS-003). */
export const NoRateLimit = () => SkipThrottle();
/** The client IP for the per-IP counters (D8). */
export function clientIp(req: Request): string;
```
`clientIp`: `raw = req.ip ?? req.socket.remoteAddress ?? "unknown"`. If `raw` matches `/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/`, take
group 1. Else if it matches `/^\[([^\]]+)\](?::\d+)?$/`, take group 1. Return `normalizeIp(value)` (from `@nestjs/throttler`:
IPv4 as is, IPv6 as its /64).

Applied in T1: `AuthController` `start` `@RateLimit("google")`, `callback` `@RateLimit("callback")`, `token`
`@RateLimit("token")`, `refresh` `@RateLimit("refresh")`, `logout` `@RateLimit("logout")` (`logoutAll` stays "user").
`HealthController` and `VersionController`: `@NoRateLimit()` on the class.

### Redis storage (T1)
```ts
// api/src/rate-limit/redis-throttler.storage.ts (plain class, built in the module factory)
export const RATE_LIMIT_REDIS_TIMEOUT_MS = 500;
export const RATE_LIMIT_HIT_COMMAND = "rateLimitHit"; // defineCommand name, numberOfKeys: 1
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(redis: Redis); // defines the command on redis.client, like SessionStore
  increment(key: string, ttl: number, limit: number, blockDuration: number, throttlerName: string): Promise<ThrottlerStorageRecord>;
}
```
Lua (`KEYS[1]` = key, `ARGV[1]` = ttl in ms), returns `{ hits, pttl }`:
```lua
local hits = redis.call('INCR', KEYS[1])
local pttl = redis.call('PTTL', KEYS[1])
if pttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  pttl = tonumber(ARGV[1])
end
return { hits, pttl }
```
`increment`:
1. Race `client.rateLimitHit(key, ttl)` against a 500 ms timeout (as `Redis.ping`; clear the timer in `finally`).
2. On `[hits, pttl]`: `seconds = Math.max(1, Math.ceil(pttl / 1000))`; return `{ totalHits: hits, timeToExpire: seconds,
   isBlocked: hits > limit, timeToBlockExpire: hits > limit ? seconds : 0 }`.
3. On any error or the timeout: `logger.warn("Rate limit check skipped: <error.message>")` (Logger name
   `RedisThrottlerStorage`) and return `{ totalHits: 0, timeToExpire: 0, isBlocked: false, timeToBlockExpire: 0 }`.
   Never throws.

### Module and guard (T1)
```ts
// api/src/rate-limit/rate-limit.module.ts
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [Redis],
      useFactory: (redis: Redis): ThrottlerModuleOptions => ({
        throttlers: [{ name: "default", ttl: DEFAULT_RATE_LIMITS.windowMs, limit: DEFAULT_RATE_LIMITS.limits.user }],
        storage: new RedisThrottlerStorage(redis),
        setHeaders: false
      })
    })
  ],
  providers: [{ provide: RATE_LIMITS, useValue: DEFAULT_RATE_LIMITS }],
  exports: [RATE_LIMITS]
})
export class RateLimitModule {}

// api/src/rate-limit/rate-limit.guard.ts
@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storage: ThrottlerStorage,
    reflector: Reflector,
    @Inject(RATE_LIMITS) private readonly rateLimits: RateLimits,
    private readonly config: AppConfigService
  );
  protected override handleRequest(props: ThrottlerRequest): Promise<boolean>;
  protected override throwThrottlingException(context: ExecutionContext, detail: ThrottlerLimitDetail): Promise<void>;
}
```
`handleRequest(props)`:
1. `scope = reflector.getAllAndOverride<RateLimitScope>(RATE_LIMIT_SCOPE_KEY, [handler, class]) ?? "user"`.
2. `req` = the HTTP request (`Request & { user?: AuthUser }`). `tracker = scope === "user" && req.user ? "u:" + req.user.id : "ip:" + clientIp(req)`.
3. `return super.handleRequest({ ...props, limit: rateLimits.limits[scope], ttl: rateLimits.windowMs, blockDuration:
   rateLimits.windowMs, getTracker: () => tracker, generateKey: () => "rl:" + scope + ":" + tracker })`.
   (Keys: `rl:user:u:<userId>`, `rl:token:ip:<ip>`, …)

`throwThrottlingException(context, detail)`:
1. `seconds = Math.max(1, detail.timeToBlockExpire)`; `scope` as above.
2. `google` or `callback`: build `new URL("/auth/sign-in", config.webAppUrl)`, set `error=rate-limited`; for `google`
   only, `returnTo = sanitizeReturnTo(req.query.returnTo)` and set it when not null. Throw `new RedirectException(url.href)`.
3. Otherwise: set the response header `Retry-After` to `String(seconds)` and throw
   `new ProblemException(429, "rate-limited", "Too Many Requests", "Too many requests. Try again later.", { retryAfterSeconds: seconds })`.

`AuthModule`: imports `RateLimitModule`; providers keep `{ provide: APP_GUARD, useClass: AccessTokenGuard }` and add
`{ provide: APP_GUARD, useClass: RateLimitGuard }` **directly after it** (comment: order matters, D7).
`app.setup.ts` `configureApp`: `app.set("trust proxy", 1);` before `app.use(helmet())`.

### Redirect (T1)
```ts
// api/src/common/filters/problem-details/redirect-exception.ts
/** A 302 to `url` instead of a Problem (the sign-in navigations, OQ-257). */
export class RedirectException extends HttpException {
  constructor(readonly url: string) { super("Redirect", 302); }
}
```
`ProblemDetailsFilter.catch`, first thing: if `exception instanceof RedirectException`, log
`warn(\`${request.method} ${request.path} -> 302 rate-limited\`)` (the **path**, never the URL: the callback's query holds
the OAuth code) and `response.redirect(302, exception.url)`; return.

### OpenAPI (T2)
`ApiProblemResponses(...statuses)` documents the statuses, then **429** and 500 (`ApiTooManyRequestsResponse`,
description "Rate limited: `retryAfterSeconds` and `Retry-After`."). New export
`ApiProblemResponsesNotLimited(...statuses)`: the same without 429. Both share one private builder. `ProblemStatus`
stays `400 | 401 | 404 | 409 | 502 | 503`. `VersionController.get` and `AuthController.start` switch to
`@ApiProblemResponsesNotLimited()`. Then `npm run openapi:export`; success responses don't change.

### Web: shell, retry, sign-in (T3)
- The two system files are promoted in the test step (no `@/proto/` import; they stay as they are), so AC-18…AC-20 pass
  from the start: T3 wires them in.
- `app/(dashboard-layout)/layout.tsx`: `<RateLimitNotifier />` directly after `<LogTimeButton />`, inside `SidebarProvider`
  (as `proto-shell.tsx`); import from `@/features/system/components/rate-limit-notifier`.
- `lib/query-client.tsx` `createQueryClient`: queries `retry: (failureCount, error) => !isApiError(error, 429) && failureCount < 1`
  (`isApiError` from `@/lib/api/problem`); mutations stay `retry: 0`. Doc comment: "one retry for queries, never for a 429".
- `sign-in-state.tsx` `signInErrorMessage`: `"rate-limited"` → `"Too many sign-in attempts. Try again in a minute."`, before the fallback.
- `lib/auth/session.ts` `exchange`: a non-200 answer throws `new ApiError(response.status, null)` (from `@/lib/api/problem`)
  instead of the plain `Error`; nothing else in the file changes.
- `auth-callback.tsx`: `fail(reason: "failed" | "rate-limited" = "failed")` sets `error=reason` (valid `returnTo` kept as now);
  the exchange's rejection calls `fail(isApiError(error, 429) ? "rate-limited" : "failed")`.
- `cd web && npm run api:types` (after T2's `openapi.json`): `lib/api/schema.d.ts` gains the `429` responses; nothing else
  needs changing for them.

### Web: production twins (T4)
For each of the 23 production files in *Files* (T4), apply the prototype change to it: `git show 078f795 --
web/proto/features/<same path below features/>`, with the import `@/features/system/rate-limit` for
`@/proto/features/system/rate-limit`. Each change swaps `toast.error(message)` for `toastError(error, message)` (naming the
caught/`onError` error where it was `_error`, missing or a bare `catch`) and drops the `sonner` import where it's no longer used.
Done when `node scripts/pm4.mjs twins` lists none of them (each twin equals its prototype file).

### Test harness (tests)
`createTestApp`: unless `overrides` has an entry with `provide === RATE_LIMITS`, add
`builder.overrideProvider(RATE_LIMITS).useValue(TEST_RATE_LIMITS)`, where `TEST_RATE_LIMITS` = `windowMs: 60_000` and
1 000 000 for every scope (D10). `rate-limit.ac.e2e-spec.ts` passes its own small limits and sends a unique
`X-Forwarded-For` per test, so runs sharing Redis don't collide.

## Acceptance criteria
The e2e app uses `windowMs: 60_000`, limits `google 2, callback 2, token 2, refresh 3, logout 3, user 4` (AC-11: its own app, `windowMs: 1000`).

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | User A: 4 × `GET /api/v1/projects` → 200; the 5th → 429 `application/problem+json`, `type` `<WEB_APP_URL>/errors/rate-limited`, `retryAfterSeconds` an integer 1…60, header `Retry-After` equal to it; Redis key `rl:user:u:<A>` has a PTTL in (0, 60000] | `api/test/rate-limit.ac.e2e-spec.ts` | T1 |
| AC-2 | One counter per user: 2 × `GET /api/v1/projects` + 2 × `GET /api/v1/tasks` → 200; then `GET /api/v1/notes` → 429 | `api/test/rate-limit.ac.e2e-spec.ts` | T1 |
| AC-3 | Per user, not per IP: after A is limited, user B from the same IP → 200; A from another IP → 429 | `api/test/rate-limit.ac.e2e-spec.ts` | T1 |
| AC-4 | No or an invalid token: 6 × `GET /api/v1/projects` → 401 every time (never 429) | `api/test/rate-limit.ac.e2e-spec.ts` | T1 |
| AC-5 | `POST /auth/token` (unknown code) from one IP: 2 × 401, the 3rd → 429 `rate-limited`; another IP → 401 | `api/test/rate-limit.ac.e2e-spec.ts` | T1 |
| AC-6 | Counters per route: with `/auth/token` limited for an IP, `POST /auth/refresh` (unknown token) from it → 401 3 times, then 429; `POST /auth/logout` → 204 3 times, then 429 | `api/test/rate-limit.ac.e2e-spec.ts` | T1 |
| AC-7 | `GET /auth/google?returnTo=/app/projects` from one IP: 2 × 302 to Google; the 3rd → 302 `Location` `<WEB_APP_URL>/auth/sign-in?error=rate-limited&returnTo=%2Fapp%2Fprojects`; with `returnTo=//evil.test` → `…?error=rate-limited` only | `api/test/rate-limit.ac.e2e-spec.ts` | T1 |
| AC-8 | `GET /auth/google/callback?code=x&state=y` from one IP: 2 × 302 `…?error=failed`; the 3rd → 302 `<WEB_APP_URL>/auth/sign-in?error=rate-limited` | `api/test/rate-limit.ac.e2e-spec.ts` | T1 |
| AC-9 | 10 × `GET /health` and 10 × `GET /api/v1/version` from one IP → never 429 | `api/test/rate-limit.ac.e2e-spec.ts` | T1 |
| AC-10 | `X-Forwarded-For: 203.0.113.7:51234`, then `203.0.113.7:51235`, then `203.0.113.7` on `POST /auth/token` → 401, 401, 429 (one counter) | `api/test/rate-limit.ac.e2e-spec.ts` | T1 |
| AC-11 | Window reset (`windowMs: 1000`, user 1): 1 → 200, 2nd → 429, after 1.2 s → 200 | `api/test/rate-limit.ac.e2e-spec.ts` | T1 |
| AC-12 | `REDIS_URL` unreachable: a signed-in `GET /api/v1/projects` → 200 (fail open) | `api/test/rate-limit-redis-down.ac.e2e-spec.ts` | T1 |
| AC-13 | `DEFAULT_RATE_LIMITS` is exactly `windowMs 60000`, google 10, callback 10, token 10, refresh 30, logout 30, user 300 | `api/src/rate-limit/rate-limits.ac.spec.ts` | T1 |
| AC-14 | `clientIp`: `ip "203.0.113.7:51234"` → `"203.0.113.7"`; `"203.0.113.7"` → same; `"[2001:db8::1]:443"` and `"2001:db8::2"` → the same value; `undefined` ip with `socket.remoteAddress "198.51.100.1"` → `"198.51.100.1"` | `api/src/rate-limit/rate-limits.ac.spec.ts` | T1 |
| AC-15 | Storage with a fake client: `[10, 30000]`, limit 10 → `{ totalHits 10, timeToExpire 30, isBlocked false, timeToBlockExpire 0 }`; `[11, 29001]` → blocked, `timeToBlockExpire 30`; `[1, 0]` → `timeToExpire 1`; the command called with `(key, ttl)` | `api/src/rate-limit/redis-throttler.storage.ac.spec.ts` | T1 |
| AC-16 | Storage: the command rejects → not blocked, `totalHits 0`, a warning logged; it never settles → resolves not blocked within 1 s (fake timers: after 500 ms) | `api/src/rate-limit/redis-throttler.storage.ac.spec.ts` | T1 |
| AC-17 | `openapi.json`: every operation documents `429` (`application/problem+json` → `ProblemDetailsDto`), except `GET /api/v1/version`, `GET /api/v1/auth/google` and `GET /api/v1/auth/google/callback`, which don't | `check` | T2 |
| AC-18 | `rateLimitMessage`: `ApiError(429)` with `retryAfterSeconds` 30 → "Too many requests. Try again in 30 seconds."; 1 → "… in 1 second."; missing, 0 or 1.5 → "Too many requests. Try again later." | `web/features/system/rate-limit.ac.test.ts` | T3 |
| AC-19 | `notifyRateLimited(ApiError 429)` → `toast.error(text, { id: "rate-limited" })`, returns true; an `ApiError(500)` or a plain `Error` → no toast, false. `toastError`: a `429` → no toast; a `500` or a plain `Error` → `toast.error(message)` | `web/features/system/rate-limit.ac.test.ts` | T3 |
| AC-20 | SCR-007: with `RateLimitNotifier` mounted, a query and then a mutation failing with `ApiError(429)` → `toast.error` with `{ id: "rate-limited" }` once each; a query failing with `ApiError(500)` → no toast; after unmount, a `429` → no toast | `web/features/system/components/rate-limit-notifier.ac.test.tsx` | T3 |
| AC-21 | `createQueryClient`: a query rejecting with `ApiError(429)` runs its `queryFn` once; with `ApiError(500)`, twice; a mutation rejecting with `500` once | `web/lib/query-client.ac.test.tsx` | T3 |
| AC-22 | SCR-001: `signInErrorMessage("rate-limited")` → "Too many sign-in attempts. Try again in a minute."; `/auth/sign-in?error=rate-limited` shows it in the alert | `web/features/auth/components/auth-rate-limit.ac.test.tsx` | T3 |
| AC-23 | SCR-002: `POST /auth/token` → `429` problem with `?code=c&returnTo=/app/projects` → `replace("/auth/sign-in?error=rate-limited&returnTo=%2Fapp%2Fprojects")`, no refresh token stored; a `401` → still `error=failed` | `web/features/auth/components/auth-rate-limit.ac.test.tsx` | T3 |
| AC-24 | `lib/api/schema.d.ts` is `api:types`' output for the new `openapi.json` (the `429` responses) | `check` | T3 |
| AC-25 | The 23 production twins equal their prototype files (`pm4 twins`: no `WARN` or `FAIL`) | `check` | T4 |

Typed stubs (created with the tests, so lint and typecheck pass while the tests fail):
- `api/src/rate-limit/rate-limits.ts`: the whole file from *Interfaces* except `clientIp`, whose body is
  `throw new Error("not implemented (feat-api-rate-limit)")`.
- `api/src/rate-limit/redis-throttler.storage.ts`: the exports and class; the constructor stores `redis`, `increment` throws as above.

## Checks
```bash
# AC-17: 429 on every rate-limited operation, none on the three exceptions
node -e "
const d=require('./api/openapi.json'), skip=new Set(['get /api/v1/version','get /api/v1/auth/google','get /api/v1/auth/google/callback']);
let bad=[];
for (const [p,ops] of Object.entries(d.paths)) for (const [m,op] of Object.entries(ops)) {
  const id=m+' '+p, r=op.responses?.['429'];
  const ok=r?.content?.['application/problem+json']?.schema?.\$ref?.endsWith('/ProblemDetailsDto');
  if (skip.has(id) ? r : !ok) bad.push(id);
}
if (bad.length) { console.error('429 wrong on:', bad); process.exit(1); }"

# AC-24: schema.d.ts regenerates unchanged and has the 429 responses
cd web && before=$(sha1sum lib/api/schema.d.ts) && npm run -s api:types >/dev/null \
  && test "$before" = "$(sha1sum lib/api/schema.d.ts)" && test "$(grep -c '429' lib/api/schema.d.ts)" -gt 10

# AC-25: every production twin equals its prototype file
out=$(node scripts/pm4.mjs twins) || { echo "$out"; exit 1; }
if echo "$out" | grep -E '^(WARN|FAIL)'; then exit 1; fi
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Rate-limit module: limits, client IP, Redis storage, guard after `AccessTokenGuard`, redirect, decorators, `trust proxy` | api | M | sonnet | First instance of the pattern; auth/security logic and guard ordering that passing tests don't fully prove | — |
| T2 | `429` in the OpenAPI contract: `ApiProblemResponses` + `ApiProblemResponsesNotLimited`, export `openapi.json` | api | S | haiku | Decorator extension spelled out above | T1 |
| T3 | Web: mount the promoted notifier, no query retry on `429`, SCR-001/002 `rate-limited`, `api:types` | web | S | haiku | Promoted files as is; each edit spelled out above | T2 |
| T4 | Web: `toastError` in the 23 production twins | web | S | haiku | Mechanical: apply each file's prototype diff; `pm4 twins` proves it | T3 |

## Open questions
None.

## Changelog
- 2026-11-01: Initial draft (OQ-253…OQ-257). The API part is complete; the web part waits for the prototype (OQ-256).
- 2026-11-01: Web part from prototype `078f795` (OQ-256 resolved): D11–D14, T3, T4, AC-18…AC-25. Status `review`.
- 2026-11-01: Approved by the owner (T3 no longer promotes the files: the test step does).
- 2026-11-01: *Checks* merged into one bash block so `pm4 check` runs AC-24 and AC-25 too (review finding). *Files*: no guard unit spec, recorded as an exception (review finding).
