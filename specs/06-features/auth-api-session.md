---
id: feat-auth-api-session
title: "Auth API: Google sign-in, sessions and the current user"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-02
milestone: M1
requirements: [FR-AUTH-001, FR-AUTH-002, FR-AUTH-003, FR-AUTH-004, FR-AUTH-006, FR-AUTH-007, API-AUTH-001, API-AUTH-002, API-AUTH-003, API-AUTH-004, API-AUTH-005, API-AUTH-006, API-USR-001]
related: [req-auth, sec, api-endpoints, api-data-model, api-conventions, arch-env, arch-stack, ADR-0007, ADR-0008, OQ-056, OQ-059, OQ-060, OQ-061, OQ-062, OQ-063, OQ-064, OQ-065, OQ-066]
---

# Auth API: Google sign-in, sessions and the current user

## Goal
The API can sign a user in with Google, keep the session alive (refresh with rotation and reuse
detection), sign out of one or all sessions, and tell the web app who is signed in. Every endpoint is
protected unless marked public. Contract: API-AUTH-001…006 and API-USR-001 in
[endpoints.md](../03-api/endpoints.md#shared-auth-shapes); flow and Redis keys in
[security.md](../02-architecture/security.md#authentication-flow-adr-0007); tables in
[data-model.md](../03-api/data-model.md#users). The web side is the next feature, feat-auth-web-session (OQ-056).

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | Dependencies: `@nestjs/jwt` (T2) and `openid-client` (T3). No passport. | OQ-059 (owner, 2026-10-02) |
| D2 | No rate limiting in this feature. | OQ-060 (owner) |
| D3 | First time zone: `GET /auth/google?timeZone=`, kept in the state entry, used only for a new account; missing/invalid → `UTC`. | OQ-061 (owner) |
| D4 | Every sign-in syncs email, display name and avatar URL from Google; refresh doesn't. | OQ-062 (owner) |
| D5 | Callback failures redirect to `/auth/sign-in?error=cancelled\|not-allowed\|failed` (+ `returnTo`). | OQ-063 (owner) |
| D6 | `GET /me` only; `PATCH /me` comes with the settings screen. | OQ-064 (owner) |
| D7 | `prompt=select_account` on every sign-in. | OQ-065 (owner) |
| D8 | Default-deny global guard; `@Public()` on health, version and API-AUTH-001…005. | OQ-066 (owner) |
| D9 | All Google calls sit behind one injectable class, `GoogleOidc`. e2e tests replace it with a fake (`overrideProvider`), so no test talks to Google. Discovery is lazy (first sign-in), so boot and `openapi:export` work offline. | Agent: testability, matches the lazy Postgres/Redis clients |
| D10 | State, PKCE verifier and codes come from `node:crypto` (32 random bytes, base64url; challenge = base64url(sha256(verifier))). `openid-client` is used only inside `GoogleOidc`. | Agent: keeps the flow testable with the fake |
| D11 | Any failure inside the callback (including a DB error) is a `failed` redirect, logged at `warn` without codes or tokens. A browser navigation never gets JSON. | Agent: FR-AUTH-001 "readable error" |
| D12 | Display name = Google `name` trimmed, cut to 100 chars; if empty, the email's local part. Avatar URL = Google `picture` only if it starts with `https://` and is ≤ 500 chars, else `null`. | Agent: fits `users` columns (data-model.md) |
| D13 | e2e tests migrate the test database once per run (`test/global-setup.ts`), so CI needs no new step. | Agent |

## Scope
**In:** `users` and `user_identities` (schema + migration); env vars for auth; access tokens;
the global guard, `@Public()`, `@CurrentUser()`; the `auth` and `users` modules with API-AUTH-001…006
and API-USR-001; `@Public()` on `/health` and `/api/v1/version`; the OpenAPI export.

**Before T2 starts:** T-0010 (`GET /api/v1/version`) is done, because T2 adds `@Public()` to its controller.

**Non-goals** (implementers must not touch these):
- Anything in `web/` (feat-auth-web-session). `.github/workflows/*` (no new CI step, D13).
- Rate limiting (D2), `PATCH /me` (D6), account deletion, other providers.
- The CSP (`security.md` *Web hardening*), Azure App Settings and Google Cloud (owner, *Setup* below).
- `/health`'s logic and tests, the version controller beyond the `@Public()` line.
- `api/test/*` files written in the test step (`create-test-app.ts`, `setup-env.ts`, `global-setup.ts`, `fake-google-oidc.ts`, `*.ac.*`).

## Setup (owner, before the manual AC-25)
1. Google Cloud Console → OAuth client (Web application). Authorized redirect URIs:
   `http://localhost:3001/api/v1/auth/google/callback` and
   `https://pm4-api-heagfvepgbcje5c3.westeurope-01.azurewebsites.net/api/v1/auth/google/callback`.
2. Local `api/.env`: real `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, a random `JWT_ACCESS_SECRET` (≥ 32 bytes).
3. Azure App Settings: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `JWT_ACCESS_SECRET`,
   optionally `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`, `AUTH_ALLOWED_EMAILS`. **The API refuses to boot without
   the required ones**, so set them before deploying this feature. The deploy also runs the new migration on Neon.

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/03-api/endpoints.md` (*Shared auth shapes*, API-AUTH-001…006, API-USR-001) | Contract |
| `specs/02-architecture/security.md` (*Authentication flow*, *Sign-up policy*) | Flow, Redis keys |
| `specs/03-api/data-model.md` (`users`, `user_identities`, storage rules) | Tables |
| `api/src/health/` | Module wiring, `.js` import suffixes |
| `api/src/redis/redis.ts`, `api/src/database/drizzle.ts` | `Redis.client` (ioredis), `DRIZZLE` injection |
| `api/src/config/env.schema.ts`, `api/src/config/app-config.service.ts` | Env schema and typed getters |
| `api/src/common/filters/problem-details/` | 401 bodies come from `UnauthorizedException` |
| `api/test/create-test-app.ts`, `api/test/fake-google-oidc.ts` | How e2e tests build the app and fake Google |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| api | `api/test/auth.ac.e2e-spec.ts` | C | tests | Sign-in, tokens, refresh, logout |
| api | `api/test/me.ac.e2e-spec.ts` | C | tests | Guard, public endpoints, `GET /me` |
| api | `api/test/support/auth-test-utils.ts` | C | tests | Signs test JWTs (node:crypto), DB/Redis helpers |
| api | `api/test/fake-google-oidc.ts` | C | tests | The fake `GoogleOidc` |
| api | `api/test/global-setup.ts` | C | tests | Migrates the test DB (D13) |
| api | `api/vitest.config.e2e.ts` | M | tests | `globalSetup` |
| api | `api/test/create-test-app.ts` | M | tests | Optional `overrides` |
| api | `api/test/setup-env.ts` | M | tests | Auth env defaults |
| api | `api/src/config/env.schema.ac.spec.ts` | C | tests | Env parsing |
| api | `api/src/auth/google-oidc.ac.spec.ts` | C | tests | `GoogleOidc` with `openid-client` mocked |
| api | `api/src/auth/google-oidc.ts` | C | tests, T3 | Typed stub from the test writer; T3 implements |
| api | `api/src/database/schema/users.ts` | C | T1 | Hand-written (Drizzle) |
| api | `api/src/database/schema/index.ts` | M | T1 | Re-export |
| api | `api/drizzle/0001_users.sql`, `api/drizzle/meta/*` | C/M | T1 | `npm run db:generate -- --name users` |
| api | `api/package.json`, `api/package-lock.json` | M | T2, T3 | `npm install @nestjs/jwt` (T2), `npm install openid-client` (T3) |
| api | `api/src/config/env.schema.ts`, `api/src/config/env.schema.spec.ts` | M | T2 | New vars; update the existing exact-match test |
| api | `api/src/config/app-config.service.ts` | M | T2 | Getters |
| api | `api/src/auth/auth.module.ts` | C/M | T2, T3 | `npx nest g module auth` (T2) |
| api | `api/src/auth/access-token.service.ts`, `api/src/auth/access-token.service.spec.ts` | C | T2 | `npx nest g service auth/access-token --flat` |
| api | `api/src/common/guards/access-token/*` | C | T2 | `npx nest g guard common/guards/access-token` |
| api | `api/src/common/decorators/public/*`, `api/src/common/decorators/current-user/*` | C | T2 | `npx nest g decorator common/decorators/public` (and `current-user`) |
| api | `api/src/users/users.module.ts` | C/M | T2, T3 | `npx nest g module users` |
| api | `api/src/users/users.controller.ts`, `api/src/users/users.controller.spec.ts` | C | T2 | `npx nest g controller users` |
| api | `api/src/users/users.service.ts`, `api/src/users/users.service.spec.ts` | C | T2 | `npx nest g service users` |
| api | `api/src/users/users.repository.ts`, `api/src/users/users.repository.spec.ts` | C/M | T2, T3 | `npx nest g provider users/users.repository --flat` |
| api | `api/src/users/dto/me-response.dto.ts` | C | T2 | Hand-written |
| api | `api/src/app.module.ts` | M | T2 | The CLI adds `AuthModule`, `UsersModule` |
| api | `api/src/health/health.controller.ts` | M | T2 | `@Public()` only |
| api | `api/src/version/version.controller.ts` | M | T2 | `@Public()` only (T-0010's file) |
| api | `api/openapi.json` | M | T2, T3 | `npm run openapi:export` |
| api | `api/src/auth/auth.controller.ts`, `api/src/auth/auth.controller.spec.ts` | C | T3 | `npx nest g controller auth` |
| api | `api/src/auth/auth.service.ts`, `api/src/auth/auth.service.spec.ts` | C | T3 | `npx nest g service auth` |
| api | `api/src/auth/session.store.ts`, `api/src/auth/session.store.spec.ts` | C | T3 | `npx nest g provider auth/session.store --flat` |
| api | `api/src/auth/dto/*.ts` | C | T3 | Hand-written |

## Interfaces

### Database (T1)
```ts
// api/src/database/schema/users.ts (column order per data-model.md storage rule 7)
export const authProvider = pgEnum('auth_provider', ['google']);

export const users = pgTable('users', {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  id: uuid('id').primaryKey().default(sql`uuidv7()`),
  email: varchar('email', { length: 254 }).notNull(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  timeZone: varchar('time_zone', { length: 64 }).notNull(),
}, (t) => [uniqueIndex('users_email_lower_key').on(sql`lower(${t.email})`)]);

export const userIdentities = pgTable('user_identities', {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  provider: authProvider('provider').notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
}, (t) => [
  primaryKey({ columns: [t.provider, t.subject] }),
  index('user_identities_user_id_idx').on(t.userId),
]);

export type User = typeof users.$inferSelect;
```
`schema/index.ts`: `export * from './users.js';` (replace the `export {};`). Then, from `api/`,
`npm run db:generate -- --name users` (needs no database). Don't hand-edit the SQL.

### Config (T2)
Add to `envSchema` (keep the existing fields):
```ts
GOOGLE_CLIENT_ID: z.string().min(1),
GOOGLE_CLIENT_SECRET: z.string().min(1),
GOOGLE_CALLBACK_URL: urlWithProtocol(['http', 'https']),
JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
ACCESS_TOKEN_TTL: duration.prefault('15m'),   // → seconds (number)
REFRESH_TOKEN_TTL: duration.prefault('30d'),  // → seconds (number)
AUTH_ALLOWED_EMAILS: z.string().prefault('').transform(/* split ',', trim, lowercase, drop empty */),
```
`duration` = `z.string().regex(/^[1-9]\d*[smhd]$/, 'must look like 15m or 30d')` transformed to seconds
(`s`=1, `m`=60, `h`=3600, `d`=86400). Use `.prefault` (zod 4: `.default` skips the transform).
`AppConfigService` getters: `googleClientId`, `googleClientSecret`, `googleCallbackUrl`, `jwtAccessSecret`,
`accessTokenTtlSeconds`, `refreshTokenTtlSeconds` (numbers), `allowedEmails` (`string[]`, lowercase).
Update `env.schema.spec.ts`'s exact-match expectations for the new fields.

### Access tokens, guard, decorators (T2)
```ts
// api/src/auth/access-token.service.ts: a thin wrapper over JwtService
sign(userId: string): Promise<{ token: string; expiresAt: Date }>; // signAsync({ sub: userId }); expiresAt from the token's exp
verify(token: string): Promise<string | null>;                       // verifyAsync → payload.sub; null on any error (malformed, badly signed, not HS256, expired)

// api/src/common/decorators/public/public.decorator.ts
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// api/src/common/decorators/current-user/current-user.decorator.ts
export interface AuthUser { id: string }
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => …request.user);
```
`AccessTokenGuard.canActivate`: public (via `Reflector.getAllAndOverride(IS_PUBLIC_KEY, [handler, class])`)
→ `true`. Otherwise read `Authorization`, match `/^Bearer\s+(\S+)$/i`, `verify`; no match or `null` →
`throw new UnauthorizedException('Missing or invalid access token.')`; else set `request.user = { id }`.
Registered globally in `AuthModule`: `{ provide: APP_GUARD, useClass: AccessTokenGuard }`; `AuthModule`
also provides and exports `AccessTokenService`, and imports
`JwtModule.registerAsync({ inject: [AppConfigService], useFactory: (c: AppConfigService) => ({ secret: c.jwtAccessSecret, signOptions: { algorithm: 'HS256', expiresIn: c.accessTokenTtlSeconds }, verifyOptions: { algorithms: ['HS256'] } }) })`
(`ConfigModule` is global). Add `@Public()` to `HealthController` and `VersionController` (class level).

### Users (T2, T3)
```ts
// api/src/users/users.repository.ts
findById(id: string): Promise<User | null>;                                              // T2
upsertFromGoogle(profile: GoogleProfile, timeZone: string): Promise<{ id: string; email: string }>; // T3

// api/src/users/users.service.ts
getMe(userId: string): Promise<MeResponseDto>; // user missing → UnauthorizedException('Missing or invalid access token.')

// api/src/users/users.controller.ts
@ApiBearerAuth('bearer') @Controller('me') export class UsersController { @Get() get(@CurrentUser() user: AuthUser): Promise<MeResponseDto> }

// api/src/users/dto/me-response.dto.ts
export class MeResponseDto {
  id: string; email: string; displayName: string;
  @ApiProperty({ type: String, nullable: true }) avatarUrl: string | null;
  timeZone: string;
  /** ISO 8601 UTC */ createdAt: string;
}
```
`upsertFromGoogle`, in one transaction: find `user_identities` (`google`, `profile.subject`). Found → update
that user's `email`, `display_name`, `avatar_url` and `updated_at = now()` **only if** one of the three
differs (D4, D12); `time_zone` is never changed. Not found → insert the user (`timeZone` argument) and the
identity. A unique violation on the email propagates (the callback turns it into `failed`). `UsersModule` exports `UsersRepository`.

### Google adapter (tests stub, T3)
```ts
// api/src/auth/google-oidc.ts
export interface GoogleProfile {
  subject: string; email: string; emailVerified: boolean; name: string | null; picture: string | null;
}
@Injectable()
export class GoogleOidc {
  constructor(private readonly config: AppConfigService) {}
  /** Google's authorization URL. Discovery (`https://accounts.google.com`) runs once, on first use; a failed discovery is retried next time. */
  authorizationUrl(params: { state: string; codeChallenge: string }): Promise<URL>;
  /** Exchanges the code in `callbackUrl`; validates state, PKCE and the ID token. Throws on any failure. */
  exchange(callbackUrl: URL, check: { state: string; codeVerifier: string }): Promise<GoogleProfile>;
}
```
With `openid-client` v6 (`import * as oidc from 'openid-client'`): `oidc.discovery(new URL('https://accounts.google.com'), clientId, clientSecret)`;
`oidc.buildAuthorizationUrl(cfg, { redirect_uri: googleCallbackUrl, scope: 'openid email profile', state, code_challenge, code_challenge_method: 'S256', prompt: 'select_account' })`;
`oidc.authorizationCodeGrant(cfg, callbackUrl, { pkceCodeVerifier: codeVerifier, expectedState: state, idTokenExpected: true })`,
then `tokens.claims()`: `sub` → `subject`, `email`, `email_verified === true` → `emailVerified`, `name ?? null`, `picture ?? null`.
`AuthModule` provides `GoogleOidc` and `SessionStore`, and imports `UsersModule`.

### Session store (T3)
Redis keys and TTLs (security.md; `h(x)` = sha256 hex of `x`; tokens and codes = 32 random bytes, base64url):
| Key | Value | TTL |
| --- | --- | --- |
| `oauth:state:<state>` | JSON `{ codeVerifier, returnTo: string \| null, timeZone: string \| null }` | 600 s |
| `auth:code:<h(code)>` | user id | 60 s |
| `auth:refresh:<h(token)>` | JSON `{ userId, familyId }` | refresh TTL |
| `auth:family:<familyId>` | JSON `{ userId, current: h(token) }` | refresh TTL |
| `auth:rotated:<h(old token)>` | family id | refresh TTL |
| `auth:families:<userId>` | set of family ids | refresh TTL, re-armed on each start/rotate |

```ts
// api/src/auth/session.store.ts (uses Redis.client; multi-key writes in one MULTI)
saveState(state: string, entry: OAuthState): Promise<void>;
takeState(state: string): Promise<OAuthState | null>;     // GETDEL
createLoginCode(userId: string): Promise<string>;
takeLoginCode(code: string): Promise<string | null>;      // GETDEL → user id
startFamily(userId: string): Promise<string>;             // new family (randomUUID) + its first refresh token
rotate(token: string): Promise<{ userId: string; familyId: string; refreshToken: string } | null>;
revokeFamily(familyId: string): Promise<void>;            // deletes its live token, the family, its set entry
revokeByToken(token: string): Promise<void>;              // the family of a live or rotated token; unknown → no-op
revokeAll(userId: string): Promise<void>;                 // every family in the user's set, then the set
```
`rotate`: `GETDEL auth:refresh:<h>`. Missing → if `auth:rotated:<h>` exists, `revokeFamily` it (reuse);
return `null`. Found → the family must exist with `current === h`, else `null`. Then write the new token,
the family's new `current`, the rotated marker for `h`, and re-arm the user's set.

### Auth flow (T3)
```ts
// api/src/auth/auth.service.ts
export function sanitizeReturnTo(raw: unknown): string | null;   // endpoints.md "Valid returnTo"; non-string → null
export function sanitizeTimeZone(raw: unknown): string | null;   // ≤ 64 chars and Intl accepts it → resolvedOptions().timeZone, else null
start(returnTo: unknown, timeZone: unknown): Promise<string>;                 // Google URL
callback(query: Record<string, unknown>, rawQuery: string): Promise<string>;  // web URL (success or failure)
exchangeCode(code: string): Promise<TokenPairDto>;  // unknown code → UnauthorizedException('Invalid or expired code.')
refresh(token: string): Promise<TokenPairDto>;      // UnauthorizedException('Invalid or expired refresh token.')
logout(token: string): Promise<void>;
logoutAll(userId: string): Promise<void>;
```
`callback` order: take the state entry (missing `state` or entry → `failed`, no `returnTo`) → Google
`error` (`access_denied` → `cancelled`, else `failed`) → no `code` → `failed` → `exchange` with
`callbackUrl = new URL(GOOGLE_CALLBACK_URL)` whose `search` is `rawQuery` (so `redirect_uri` matches behind
Azure's proxy) → `!emailVerified` → `failed` → allow-list (non-empty and lowercase email not in it) →
`not-allowed` → `upsertFromGoogle(profile, entry.timeZone ?? 'UTC')` → login code → success URL. URLs:
`new URL('/auth/callback' | '/auth/sign-in', WEB_APP_URL)` with `searchParams.set` in the order `code`/`error`, then `returnTo`.

`refresh`: `rotate`; `null` → 401. Then the user must exist and pass the allow-list, else `revokeFamily` and 401.

```ts
// api/src/auth/auth.controller.ts: @Controller('auth')
@Public() @Get('google') @Redirect()            start(@Query('returnTo') r?: string, @Query('timeZone') tz?: string)  → { url, statusCode: 302 }
@Public() @Get('google/callback') @Redirect()   callback(@Req() req: Request)  // req.query, rawQuery = req.originalUrl after '?'
@Public() @Post('token') @HttpCode(200)         token(@Body() body: CodeRequestDto): Promise<TokenPairDto>
@Public() @Post('refresh') @HttpCode(200)       refresh(@Body() body: RefreshTokenRequestDto): Promise<TokenPairDto>
@Public() @Post('logout') @HttpCode(204)        logout(@Body() body: RefreshTokenRequestDto): Promise<void>
@ApiBearerAuth('bearer') @Post('logout-all') @HttpCode(204) logoutAll(@CurrentUser() user: AuthUser): Promise<void>
```
DTOs (`api/src/auth/dto/`): `CodeRequestDto { @IsString() @Length(1, 128) code }`,
`RefreshTokenRequestDto { @IsString() @Length(1, 128) refreshToken }`,
`TokenPairDto { accessToken: string; /** ISO 8601 UTC */ accessTokenExpiresAt: string; refreshToken: string }`.
Never log tokens, codes or auth request bodies. Run `npm run openapi:export` at the end.

## Acceptance criteria
| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `GET /api/v1/me` without `Authorization` → `401`, `application/problem+json`, `type …/errors/unauthorized` | `api/test/me.ac.e2e-spec.ts` | T2 |
| AC-2 | `GET /me` with a malformed token, a token signed with another secret, an `alg: none` token, and an expired token → `401` each | `api/test/me.ac.e2e-spec.ts` | T2 |
| AC-3 | `GET /me` with a valid token for an existing user → `200`, body exactly `{ id, email, displayName, avatarUrl, timeZone, createdAt }` (ISO) | `api/test/me.ac.e2e-spec.ts` | T2 |
| AC-4 | Valid token whose user was deleted → `401` | `api/test/me.ac.e2e-spec.ts` | T2 |
| AC-5 | `/health` and `GET /api/v1/version` without a token → `200` (default-deny doesn't block them); unknown routes still `404` | `api/test/me.ac.e2e-spec.ts` | T2 |
| AC-6 | `validateEnv`: TTLs `15m` → 900, `30d` → 2592000, defaults when unset, `15x` / `0m` rejected; `JWT_ACCESS_SECRET` < 32 chars rejected; Google vars required; `AUTH_ALLOWED_EMAILS` `' A@x.com, b@y.com ,'` → `['a@x.com', 'b@y.com']`, unset → `[]` | `api/src/config/env.schema.ac.spec.ts` | T2 |
| AC-7 | `GET /auth/google?returnTo=/app/projects&timeZone=Europe/Zagreb` → `302` to the fake's URL; the fake got a `state` and a `codeChallenge`; the state entry exists in Redis with TTL ≤ 600 | `api/test/auth.ac.e2e-spec.ts` | T3 |
| AC-8 | New user, happy path: start → callback `?code=x&state=…` → `302` `<WEB>/auth/callback?code=<c>&returnTo=%2Fapp%2Fprojects`; the fake's `codeVerifier` hashes to the `codeChallenge`; `POST /auth/token {code: c}` → `200` TokenPair (refresh token 43 chars, `accessTokenExpiresAt` ≈ now + 15 min); `GET /me` → the profile's email and name, avatar, `timeZone: "Europe/Zagreb"` | `api/test/auth.ac.e2e-spec.ts` | T3 |
| AC-9 | `returnTo` `//evil.com`, `https://evil.com`, `/a\b`, 2049 chars, and `timeZone` `Mars/Base` → success redirect without `returnTo`; the new user's `timeZone` is `UTC`. No `400` | `api/test/auth.ac.e2e-spec.ts` | T3 |
| AC-10 | Known identity whose Google email, name and picture changed → same user id; `GET /me` shows the new values; `timeZone` unchanged even with another `timeZone` param. Name empty → email local part; picture `http://…` → `avatarUrl: null` | `api/test/auth.ac.e2e-spec.ts` | T3 |
| AC-11 | Callback `?error=access_denied&state=…` → `302` `<WEB>/auth/sign-in?error=cancelled&returnTo=…`; `?error=server_error&state=…` → `error=failed` | `api/test/auth.ac.e2e-spec.ts` | T3 |
| AC-12 | Callback without `state`, with an unknown `state`, or reusing a consumed `state` → `<WEB>/auth/sign-in?error=failed` with no `returnTo` | `api/test/auth.ac.e2e-spec.ts` | T3 |
| AC-13 | The fake's `exchange` throws → `error=failed` (+ `returnTo`); `emailVerified: false` → `error=failed` and no user row | `api/test/auth.ac.e2e-spec.ts` | T3 |
| AC-14 | `AUTH_ALLOWED_EMAILS=Owner@Example.com`: another email → `error=not-allowed`, no user row created or changed; `owner@example.com` → success | `api/test/auth.ac.e2e-spec.ts` | T3 |
| AC-15 | `POST /auth/token`: a used code → `401`; an unknown code → `401`; the code key's TTL ≤ 60; missing or extra body field → `400` | `api/test/auth.ac.e2e-spec.ts` | T3 |
| AC-16 | Refresh rotation: `R1` → `200` with `R2 ≠ R1`; `R2` → `200` `R3`; `R1` again → `401`, and then `R3` → `401` (reuse revoked the family) | `api/test/auth.ac.e2e-spec.ts` | T3 |
| AC-17 | Refresh with an unknown token → `401`; a new refresh key's TTL is within 60 s of `REFRESH_TOKEN_TTL` | `api/test/auth.ac.e2e-spec.ts` | T3 |
| AC-18 | Signed in while allowed; with an allow-list that excludes the email, refresh → `401`, and the same token on an open app → `401` (family revoked) | `api/test/auth.ac.e2e-spec.ts` | T3 |
| AC-19 | User row deleted → refresh → `401` | `api/test/auth.ac.e2e-spec.ts` | T3 |
| AC-20 | `POST /auth/logout {R}` → `204`; then refresh `R` → `401`; the same user's other session still refreshes; logout with an unknown token → `204` | `api/test/auth.ac.e2e-spec.ts` | T3 |
| AC-21 | `POST /auth/logout-all` with user A's access token → `204`; both of A's sessions fail to refresh; user B's session still refreshes; without a token → `401` | `api/test/auth.ac.e2e-spec.ts` | T3 |
| AC-22 | `GoogleOidc` (`openid-client` mocked): `authorizationUrl` passes exactly the D7 parameters; discovery runs once for two calls, and again after a failed discovery; `exchange` passes `{ pkceCodeVerifier, expectedState, idTokenExpected: true }` and maps claims (missing `email_verified` → `false`, missing `name`/`picture` → `null`) | `api/src/auth/google-oidc.ac.spec.ts` | T3 |
| AC-23 | `api/openapi.json` has the 7 paths; `/api/v1/me` and `/api/v1/auth/logout-all` require `bearer`; the 5 public auth paths and `/api/v1/version` don't | `check` | T3 |
| AC-24 | The migration creates `users` (with `uuidv7()` and the `lower(email)` unique index), `user_identities` and the `auth_provider` enum | `check` | T1 |
| AC-25 | After *Setup*: opening `http://localhost:3001/api/v1/auth/google` locally shows Google's account chooser; choosing an account lands on `http://localhost:3000/auth/callback?code=…`; `curl -X POST …/api/v1/auth/token` with that code within 60 s returns tokens | `manual` | T3 |

Typed stubs (created with the tests, so lint and typecheck pass while the tests fail):
- `api/src/auth/google-oidc.ts`: `GoogleProfile` and the `GoogleOidc` class with the constructor and the two
  methods from *Interfaces*, each body `throw new Error("not implemented (feat-auth-api-session)")`. Not registered in any module.

## Checks
```bash
# AC-23: the contract has the auth and user endpoints, protected as specified
node -e "
const d=require('./api/openapi.json'), p=d.paths, sec=(x)=>JSON.stringify(x?.security??[]).includes('bearer');
const pub=[['/api/v1/auth/google','get'],['/api/v1/auth/google/callback','get'],['/api/v1/auth/token','post'],['/api/v1/auth/refresh','post'],['/api/v1/auth/logout','post'],['/api/v1/version','get']];
const prot=[['/api/v1/auth/logout-all','post'],['/api/v1/me','get']];
for (const [u,m] of [...pub,...prot]) if(!p[u]?.[m]) {console.error('missing',m,u); process.exit(1)}
for (const [u,m] of pub) if(sec(p[u][m])) {console.error('should be public',u); process.exit(1)}
for (const [u,m] of prot) if(!sec(p[u][m])) {console.error('should need bearer',u); process.exit(1)}"
```

```bash
# AC-24: the users migration
f=api/drizzle/0001_users.sql
test -f "$f"
grep -q 'CREATE TYPE "public"."auth_provider" AS ENUM' "$f"
grep -q 'CREATE TABLE "users"' "$f" && grep -q 'CREATE TABLE "user_identities"' "$f"
grep -q 'uuidv7()' "$f" && grep -qi 'lower("email")' "$f"
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Add the `users` and `user_identities` tables and their migration | api | S | haiku | Schema given in full; the migration is generated; no logic | — |
| T2 | Access tokens, the default-deny guard and `GET /me` | api | M | opus | First auth guard and token pattern (task-routing: auth/tokens); env and module wiring | T1 |
| T3 | Google sign-in, login codes, refresh rotation and sign-out | api | M | opus | Security logic: OAuth state/PKCE, single-use codes, rotation with reuse detection, Redis transactions | T2 |

## Open questions
None. OQ-056 and OQ-059…OQ-066 are resolved.

## Changelog
- 2026-10-02: Initial draft (OQ-056, OQ-059…OQ-066).
- 2026-10-02: Approved by the owner.
