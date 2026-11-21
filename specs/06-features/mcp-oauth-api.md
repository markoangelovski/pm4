---
id: feat-mcp-oauth-api
title: "Agent access: the OAuth authorization server, consent and Connected apps (API)"
status: approved
owner: Marko Angelovski
last_updated: 2026-11-21
milestone: M9
requirements: [FR-MCP-002, FR-MCP-003, FR-MCP-004, FR-MCP-005, FR-MCP-006, FR-MCP-007, FR-MCP-009, FR-MCP-010, API-MCP-001, API-MCP-002, API-MCP-003, API-MCP-004, API-MCP-005, API-MCP-006, API-MCP-007, API-MCP-008, API-MCP-009, API-MCP-010, API-MCP-011]
related: [req-agents, api-endpoints, api-data-model, sec, arch-environments, ADR-0007, ADR-0013, OQ-287, OQ-288, OQ-289, OQ-290, OQ-291, OQ-292, OQ-293, OQ-294, OQ-295, OQ-296, OQ-297, OQ-298, OQ-301, OQ-302, OQ-303, OQ-304, OQ-305]
prototype: 05db575
---

# Agent access: the OAuth authorization server, consent and Connected apps (API)

## Goal
An MCP client can discover PM4's OAuth server, identify itself (Client ID Metadata Document or DCR), send the user
to consent, and get MCP tokens that it refreshes and revokes; the web app gets the consent and Connected apps
endpoints the prototype calls (FR-MCP-002…007, FR-MCP-009, FR-MCP-010; API-MCP-001…011). The `/mcp` endpoint and its
tools are `feat-mcp-tools-api`; the screens are `feat-mcp-web` (OQ-304).

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | MCP access tokens: HS256 JWTs signed with HKDF-SHA256(`JWT_ACCESS_SECRET`, salt empty, info `pm4-mcp`, 32 B), `aud` = `RESOURCE`. The web guard can't verify them, and `/mcp` won't verify web tokens | OQ-301 (owner, 2026-11-21) |
| D2 | Deleting a grant sets `mcp:revoked:<grantId>` for `ACCESS_TOKEN_TTL` (checked by `/mcp` in feat-mcp-tools-api) | OQ-302 (owner, 2026-11-21) |
| D3 | `API_PUBLIC_URL` is the issuer; default `http://localhost:3001` outside production, required in production | OQ-303 (owner, 2026-11-21) |
| D4 | *Last used* and *expired* come from the grant's Redis family; the family is created at **Allow** (no token yet), so "no family" means expired | OQ-305 (owner, 2026-11-21) |
| D5 | Allow for an app the user already granted deletes the old grant (tokens included) and creates a new one: new id, new *connected at* | OQ-293 (owner, 2026-11-21) |
| D6 | A refresh with another `client_id` changes nothing (checked inside the rotation script) and answers `invalid_grant` | Agent |
| D7 | The app-facing OAuth endpoints answer RFC 6749 errors (`OAuthError` + its controller-scoped filter); they parse their bodies themselves (no DTO classes), so the global `ValidationPipe` doesn't turn their errors into Problem Details. They're left out of `openapi.json` (`@ApiExcludeController()`): the RFCs are their contract, and the web never calls them | Agent |
| D8 | CORS stays as it is (the web origin only): browser-based MCP clients aren't supported | Agent |
| D9 | `/oauth/revoke` with a refresh token deletes the grant (the app disconnected itself); access tokens can't be revoked there (`200`, no change) | Agent |
| D10 | A rate-limit scope may have its own window (`windowsMs`); `oauthRegister` uses 1 hour | OQ-297 (owner, 2026-11-21) |

## Scope
**In:** API-MCP-001…011; `oauth_clients`, `oauth_grants`, migration `0012`; `API_PUBLIC_URL`; three rate-limit scopes;
the MCP token service (exported for feat-mcp-tools-api); Sign out of all devices and account deletion ending grants;
`410` `gone` in the Problem Details filter; `api/openapi.json`.

**Test step (main session, before T1):** update `api/src/rate-limit/rate-limits.ac.spec.ts` AC-13 to D10's
`DEFAULT_RATE_LIMITS` (*Rate limits*) and `TEST_RATE_LIMITS` in `api/test/create-test-app.ts` (the three new scopes at
`1_000_000`); create the acceptance tests and the stubs (*Contract stubs*); run `npm run openapi:export`. Then `pm4 hash`.

**Non-goals** (implementers must not touch these):
- `/mcp`, its guard and tools (feat-mcp-tools-api); `web/**` (feat-mcp-web).
- `AccessTokenService` and `AccessTokenGuard` (D1 needs no change there), CORS (D8).
- Any acceptance test (`*.ac.*`), and `api/test/create-test-app.ts`.

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/03-api/endpoints.md#shared-agent-access-shapes-req-agents-adr-0013` and `#api-mcp-001-protected-resource-metadata` … `#api-mcp-011-revoke-a-connected-app` | Contracts |
| `specs/02-architecture/security.md#agent-access-m9-adr-0013-req-agents` | CIMD fetching rules, Redis keys, revocation, rate limits |
| `specs/03-api/data-model.md#oauth_clients`, `#oauth_grants` | Tables |
| `api/src/auth/session.store.ts` | Redis store: `hashSecret`, `randomSecret`, `execOrThrow`, `defineCommand` + Lua rotation (`ROTATE_SCRIPT`) to copy for MCP families (T3) |
| `api/src/auth/auth.service.ts` → `refresh`, `isAllowed`, `logoutAll` | The allow-list check to copy (T3); where Sign out of all devices goes (T4) |
| `api/src/auth/auth.controller.ts` | `@Public()`, `@RateLimit()`, `@Redirect()` returning `{url, statusCode: 302}`, `@ApiBearerAuth`, `@ApiProblemResponses` |
| `api/src/database/schema/integrations.ts` | `pgEnum`, `pgTable`, `uniqueIndex`, column order |
| `api/src/config/env.schema.ts`, `api/src/config/app-config.service.ts` | `urlWithProtocol`, getters (T1) |
| `api/src/rate-limit/rate-limits.ts`, `api/src/rate-limit/rate-limit.guard.ts` | Scopes and the window (T1) |
| `api/src/common/filters/problem-details/problem-details.filter.ts` | `SLUG_BY_STATUS` / `TITLE_BY_STATUS` (T3: add 410) |
| `api/src/account/account.service.ts` | Account deletion's best-effort Redis cleanups (T4) |
| `api/test/support/auth-test-utils.ts` | `createAuthTestApp`, `pkceChallenge` (tests) |
| `web/proto/features/agents/proposed-types.ts` | The DTOs the web expects (consent, Connected apps) |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| api | `api/test/mcp-oauth.ac.e2e-spec.ts` | C | tests | AC-1, AC-2, AC-8…AC-28 |
| api | `api/test/connected-apps.ac.e2e-spec.ts` | C | tests | AC-29…AC-33 |
| api | `api/src/oauth/redirect-uri.ac.spec.ts`, `api/src/oauth/cimd-fetcher.ac.spec.ts`, `api/src/config/api-public-url.ac.spec.ts` | C | tests | AC-6, AC-7, AC-4 |
| api | `api/src/rate-limit/rate-limits.ac.spec.ts`, `api/test/create-test-app.ts` | M | tests | AC-3 (D10) |
| api | `api/test/rate-limit.ac.e2e-spec.ts` | M | tests | Its `RateLimits` literals get `windowsMs: {}` and the three scopes (type only) |
| api | `api/src/common/decorators/api-problem-responses/api-problem-responses.decorator.ts` | M | tests | `410` in `ProblemStatus` (`ApiGoneResponse`), for `@ApiProblemResponses(401, 404, 410)` |
| api | `api/src/oauth/oauth.module.ts` | C | tests, T1 | `npx nest g module oauth`; stub in the test step |
| api | `api/src/oauth/consent.controller.ts`, `api/src/oauth/connected-apps.controller.ts`, `api/src/oauth/dto/*.ts` | C | tests, T3, T4 | `npx nest g controller oauth/consent --flat --no-spec` (likewise `connected-apps`); stubs in the test step |
| api | `api/src/app.module.ts` | M | tests | `OAuthModule` (added by `nest g module`) |
| api | `api/openapi.json` | M | tests | `npm run openapi:export` |
| web | `web/lib/api/schema.d.ts` | M | tests | `npm run api:types` (generated; CI's contract check, owner 2026-11-21) |
| api | `api/src/database/schema/oauth.ts`, `api/src/database/schema/index.ts` | C, M | T1 | |
| api | `api/drizzle/0012_oauth.sql`, `api/drizzle/meta/*` | C, M | T1 | `npx drizzle-kit generate --name oauth` |
| api | `api/src/config/env.schema.ts`, `api/src/config/app-config.service.ts`, `api/.env.example`, `api/test/setup-env.ts`, `api/src/config/env.schema.spec.ts`, `api/src/config/app-config.service.spec.ts` | M | T1 | `API_PUBLIC_URL` (the two unit-test fixtures gain the field) |
| api | `api/src/rate-limit/rate-limits.ts` | M | tests, T1 | Test step: the scope and `windowsMs` types; T1: values (D10) |
| api | `api/src/rate-limit/rate-limit.guard.ts` | M | T1 | D10 |
| api | `api/src/app.setup.ts` | M | T1 | Prefix exclusions, urlencoded body parser |
| api | `api/src/oauth/oauth-metadata.controller.ts`, `api/src/oauth/oauth-urls.ts` | C | T1 | API-MCP-001/002 |
| api | `api/src/oauth/redirect-uri.ts`, `api/src/oauth/cimd-fetcher.ts` | C | tests, T2 | Stubs in the test step: the pure functions only |
| api | `api/src/oauth/oauth-error.ts`, `api/src/oauth/client-registry.ts`, `api/src/oauth/grants.repository.ts`, `api/src/oauth/oauth.store.ts`, `api/src/oauth/oauth.controller.ts`, `api/src/oauth/oauth.service.ts` | C | T2, T3 | T2 creates them; T3 extends the store, service and controller |
| api | `api/src/oauth/mcp-token.service.ts` | C | T3 | Exported for feat-mcp-tools-api |
| api | `api/src/common/filters/problem-details/problem-details.filter.ts` | M | T3 | `410` → `gone`, "Gone" |
| api | `api/src/oauth/grants.service.ts` | C | T3, T4 | `deleteGrant` in T3; list, revoke-all, mark-all in T4 |
| api | `api/src/auth/auth.module.ts`, `api/src/auth/auth.service.ts`, `api/src/auth/auth.service.spec.ts` | M | T4 | `logoutAll` ends grants (OQ-294) |
| api | `api/src/account/account.module.ts`, `api/src/account/account.service.ts`, `api/src/account/account.service.spec.ts` | M | T4 | Markers before the delete |
| api | `api/src/oauth/*.spec.ts` | C | T2, T3, T4 | Ordinary unit tests, optional |

## Interfaces

### Shared (all tasks)
```ts
// api/src/oauth/oauth-urls.ts
/** `ISSUER` = API_PUBLIC_URL; `RESOURCE` = ISSUER + "/mcp" (endpoints.md *Shared agent-access shapes*). */
export function oauthUrls(config: AppConfigService): { issuer: string; resource: string };
export type OAuthScope = "pm4:read" | "pm4:write";
export type GrantScope = "read" | "write";            // = enum oauth_scope
export const SCOPES_SUPPORTED: OAuthScope[] = ["pm4:read", "pm4:write"];
/** "pm4:read" → read; "pm4:write", "pm4:read pm4:write", absent/empty → write; null = an unknown value. */
export function parseScope(raw: string | undefined): GrantScope | null;
/** read → ["pm4:read"]; write → ["pm4:read", "pm4:write"]. */
export function scopeList(scope: GrantScope): OAuthScope[];
```
Module: `OAuthModule` imports `RedisModule`, `UsersModule`, `RateLimitModule` and `JwtModule.register({})` (secrets per
call), declares every provider and controller below, and exports `McpTokenService`, `OAuthStore` and `GrantsService`.
`AuthModule` and `AccountModule` import `OAuthModule` (T4); `OAuthModule` never imports `AuthModule`.

### Foundation (T1)
- **Schema** `api/src/database/schema/oauth.ts`: `oauthScope = pgEnum("oauth_scope", ["read","write"])`;
  `oauthClients` (`created_at` timestamptz not null default now, `id` uuid PK default `uuidv7()`, `client_name`
  varchar(100) not null, `redirect_uris` varchar(2000) array not null); `oauthGrants` (`created_at`, `scope`, `id`,
  `user_id` FK users cascade, `client_id` varchar(2048), `client_name` varchar(100), all not null; `uniqueIndex
  ("oauth_grants_user_client_uq").on(userId, clientId)`). Column order as data-model.md. Export from `index.ts`.
- **Config:** `API_PUBLIC_URL: urlWithProtocol(["http","https"])`, no trailing slash, no path, query or fragment; default
  `http://localhost:3001` unless `NODE_ENV=production`, where it's required (a `superRefine` on the object). Getter
  `apiPublicUrl: string`. `.env.example` and `setup-env.ts` (`??= "http://localhost:3001"`) list it.
- **Rate limits:** `RateLimitScope` adds `"oauthAuthorize" | "oauthToken" | "oauthRegister"`; `RateLimits` gains
  `windowsMs: Partial<Record<RateLimitScope, number>>`; the guard uses `windowsMs[scope] ?? windowMs` for `ttl` and
  `blockDuration`. `DEFAULT_RATE_LIMITS` = `{ windowMs: 60_000, windowsMs: { oauthRegister: 3_600_000 }, limits: {
  google: 10, callback: 10, token: 10, refresh: 30, logout: 30, user: 300, oauthAuthorize: 30, oauthToken: 30,
  oauthRegister: 10 } }`.
- **`app.setup.ts`:** `setGlobalPrefix("api/v1", { exclude: ["health", ".well-known/oauth-protected-resource",
  ".well-known/oauth-protected-resource/mcp", ".well-known/oauth-authorization-server", "oauth/authorize", "oauth/token",
  "oauth/revoke", "oauth/register"] })` (check the exclude syntax against the installed Nest; AC-1 tests the real paths);
  `app.useBodyParser("urlencoded", { extended: false, limit: "10kb" })`.
- **`OAuthMetadataController`** (`@Controller(".well-known")`, `@Public()`, `@NoRateLimit()`, `@ApiExcludeController()`):
  `GET oauth-protected-resource` and `GET oauth-protected-resource/mcp` → API-MCP-001; `GET oauth-authorization-server`
  → API-MCP-002; `@Header("Cache-Control", "public, max-age=3600")`.

### Clients and authorize (T2)
```ts
// api/src/oauth/oauth-error.ts
export type OAuthErrorCode = "invalid_request" | "invalid_client" | "invalid_grant" | "unsupported_grant_type"
  | "invalid_scope" | "invalid_target" | "invalid_redirect_uri" | "invalid_client_metadata";
export class OAuthError extends Error {
  constructor(readonly error: OAuthErrorCode, readonly description?: string, readonly status = 400) { super(error); }
}
/** @Catch(OAuthError): status, `Cache-Control: no-store`, JSON `{error, error_description?}`. Other exceptions → global filter. */
export class OAuthErrorFilter implements ExceptionFilter { … }

// api/src/oauth/redirect-uri.ts (pure)
export function isLoopbackUri(uri: URL): boolean;        // http: + hostname 127.0.0.1 | [::1] | localhost
/** ≤ 2000 chars, absolute, no fragment, and https: or a loopback http: URL. */
export function isValidRedirectUri(raw: string): boolean;
/** endpoints.md *Redirect URI match*: exact, or loopback with same scheme/host/path/query on any port. */
export function matchRedirectUri(requested: string, registered: readonly string[]): boolean;

// api/src/oauth/cimd-fetcher.ts
/** false for loopback, private, link-local, CGNAT, multicast, unspecified and their IPv4-mapped forms (node:net BlockList). */
export function isPublicAddress(ip: string): boolean;
@Injectable() export class CimdFetcher {
  /** security.md *Agent access*: resolve, check every address, connect to the checked one (node:https `lookup`), no
   * redirects, 5 s, ≤ 10 kB, JSON. In development/test, http://localhost and http://127.0.0.1 skip the address check.
   * Throws on any failure. */
  fetchJson(url: URL): Promise<unknown>;
}

// api/src/oauth/client-registry.ts
export interface ResolvedClient { clientId: string; name: string; clientIdHost: string; redirectUris: string[] }
@Injectable() export class ClientRegistry {
  /** CIMD (`https://`, or the dev/test http hosts) via cache `oauth:cimd:<h(url)>` (10 min) then CimdFetcher and the
   * document rules; otherwise a UUID looked up in oauth_clients. null = unknown or invalid (never throws for bad input). */
  resolve(clientId: string): Promise<ResolvedClient | null>;
  /** API-MCP-003 rules; throws OAuthError("invalid_redirect_uri" | "invalid_client_metadata"). */
  register(body: unknown): Promise<RegisterResponse>;
}
export interface RegisterResponse { client_id: string; client_id_issued_at: number; client_name: string;
  redirect_uris: string[]; token_endpoint_auth_method: "none"; grant_types: ["authorization_code","refresh_token"];
  response_types: ["code"] }

// api/src/oauth/grants.repository.ts (Drizzle; T2 adds the client methods, T3 the grant methods)
findClient(id: string): Promise<{ id: string; name: string; redirectUris: string[]; createdAt: Date } | null>; // non-UUID → null
/** One transaction: delete clients created > 30 days ago that no grant names, then insert (API-MCP-003). */
registerClient(name: string, redirectUris: string[]): Promise<{ id: string; createdAt: Date }>;

// api/src/oauth/oauth.store.ts (T2 part)
export interface PendingRequest { clientId: string; clientName: string; clientIdHost: string; redirectUri: string;
  codeChallenge: string; scope: GrantScope; state: string | null; expiresAt: string }
saveRequest(request: PendingRequest): Promise<string>;       // id = randomSecret(); TTL 3600 s
getCachedClient(url: string): Promise<ResolvedClient | null>; cacheClient(url: string, client: ResolvedClient): Promise<void>;

// api/src/oauth/oauth.service.ts (T2 part)
/** API-MCP-004 in its order; returns the 302 target (consent page, or the app with `error=`). */
authorize(query: Record<string, unknown>): Promise<string>;
```
`OAuthController` (`@Controller("oauth")`, `@Public()`, `@UseFilters(OAuthErrorFilter)`, `@ApiExcludeController()`):
`GET authorize` (`@RateLimit("oauthAuthorize")`, `@Redirect()`, `@Req()` → `req.query`); `POST register`
(`@RateLimit("oauthRegister")`, `@HttpCode(201)`, `@Header("Cache-Control","no-store")`, `@Body() body: unknown`).
Query/body values that are arrays (repeated) count as invalid. `RateLimit(scope)`'s type accepts the new scopes.

### Consent, tokens and revoke (T3)
```ts
// oauth.store.ts (T3 part). Keys and TTLs: security.md *Agent access*.
export interface AuthCode { grantId: string; userId: string; clientId: string; redirectUri: string;
  codeChallenge: string; scope: GrantScope }
export interface McpFamily { userId: string; clientId: string; current: string | null; lastUsedAt: string | null }
getRequest(id: string): Promise<PendingRequest | null>;
takeRequest(id: string): Promise<PendingRequest | null>;    // GETDEL
createCode(code: AuthCode): Promise<string>;                 // TTL 60 s; returns the code
takeCode(code: string): Promise<AuthCode | null>;            // GETDEL by hash
startFamily(grantId: string, userId: string, clientId: string): Promise<void>; // current null, lastUsedAt null
/** First refresh token of a code exchange: sets current + lastUsedAt, slides the TTL. null = no family. */
issueFirstRefresh(grantId: string): Promise<string | null>;
/** Lua (copy ROTATE_SCRIPT): live token of a family whose current is its hash and whose clientId = clientId →
 * new token, rotated marker, current + lastUsedAt, TTLs slide. Another clientId → nil, no change (D6). A rotated
 * token → deletes the family and its live token, sets mcp:revoked:<gid> (access TTL) → nil. */
rotate(token: string, clientId: string): Promise<{ grantId: string; userId: string; refreshToken: string } | null>;
grantIdOfToken(token: string): Promise<string | null>;       // live or rotated
families(grantIds: string[]): Promise<(McpFamily | null)[]>; // one MGET
/** Deletes the family and its live token, sets mcp:revoked:<grantId> for ACCESS_TOKEN_TTL (D2). */
revokeGrant(grantId: string): Promise<void>;
isRevoked(grantId: string): Promise<boolean>;                // for feat-mcp-tools-api

// grants.repository.ts (T3 part)
export interface GrantRow { id: string; userId: string; clientId: string; clientName: string; scope: GrantScope; createdAt: Date }
findGrant(userId: string, clientId: string): Promise<GrantRow | null>;
findGrantById(id: string): Promise<GrantRow | null>;         // non-UUID → null
/** One transaction: delete the user's grant for clientId (returning its id), insert the new one (D5). */
replaceGrant(userId: string, clientId: string, clientName: string, scope: GrantScope): Promise<{ grant: GrantRow; replacedId: string | null }>;
deleteGrant(userId: string, id: string): Promise<boolean>;

// api/src/oauth/mcp-token.service.ts
export interface McpTokenClaims { userId: string; grantId: string; clientId: string; scopes: OAuthScope[] }
@Injectable() export class McpTokenService {
  /** D1 claims; `expiresIn` = ACCESS_TOKEN_TTL seconds. */
  sign(input: { userId: string; grantId: string; clientId: string; scope: GrantScope }): Promise<{ token: string; expiresIn: number }>;
  /** null unless HS256 with the MCP key, iss = ISSUER, aud = RESOURCE, unexpired, and sub/gid/client_id/scope present. */
  verify(token: string): Promise<McpTokenClaims | null>;
}

// grants.service.ts (T3 part)
/** Deletes the grant row (if the user's) and revokes it in Redis; false = not found. */
deleteGrant(userId: string, grantId: string): Promise<boolean>;

// oauth.service.ts (T3 part)
getConsent(userId: string, requestId: string): Promise<ConsentRequestDto>;   // 404 NotFoundException
allow(userId: string, requestId: string): Promise<ConsentResultDto>;         // 404; 410 GoneException past expiresAt (request deleted)
deny(userId: string, requestId: string): Promise<ConsentResultDto>;
token(body: Record<string, unknown>): Promise<TokenResponse>;                // throws OAuthError
revoke(body: Record<string, unknown>): Promise<void>;
export interface TokenResponse { access_token: string; token_type: "Bearer"; expires_in: number; refresh_token: string; scope: string }
```
- **Allow:** `takeRequest` (null → 404; past `expiresAt` → 410), `replaceGrant`; when `replacedId`, `store.revokeGrant
  (replacedId)`; `startFamily(grant.id, …)`; `createCode`; `redirectUrl` = `redirect_uri` with `code` and (if any)
  `state` set via `URL.searchParams`. **Deny** likewise with `error=access_denied`.
- **Token, code:** `takeCode` first (so a failed attempt still consumes it), then the API-MCP-008 checks, `findGrantById`,
  `issueFirstRefresh` (null → `invalid_grant`), `sign`. **Refresh:** `rotate(token, client_id)`, then grant + user +
  allow-list (copy `isAllowed`); a failure there → `grants.deleteGrant` and `invalid_grant`. `scope` in the answer is
  `scopeList(grant.scope).join(" ")`.
- **Controllers:** `OAuthController` gains `POST token` and `POST revoke` (`@RateLimit("oauthToken")`, `@HttpCode(200)`,
  `@Header("Cache-Control","no-store")`, `@Body() body: Record<string, unknown>`). `ConsentController`
  (`@Controller("oauth/consent")`, `@ApiBearerAuth("bearer")`): `GET :requestId` (`@ApiProblemResponses(401, 404)`),
  `POST :requestId/allow` and `POST :requestId/deny` (`@HttpCode(200)`, `@ApiProblemResponses(401, 404, 410)`).
- **DTOs** (`dto/consent.dto.ts`): `OAuthClientDto`, `ConsentRequestDto`, `ConsentResultDto` with the fields of
  `proposed-types.ts` (`@ApiProperty({ enum: ["pm4:read","pm4:write"], isArray: true })` for `scopes`,
  `nullable: true` for `existingGrant`).

### Connected apps, sign-out-all and account deletion (T4)
```ts
// dto/connected-app.dto.ts: ConnectedAppDto = proposed-types' ConnectedAppDto + `expired: boolean`; ConnectedAppListDto { items }
// grants.repository.ts (T4 part)
listGrants(userId: string): Promise<GrantRow[]>;            // created_at desc, id desc
deleteAllGrants(userId: string): Promise<string[]>;         // returning ids
grantIds(userId: string): Promise<string[]>;
findClients(ids: string[]): Promise<Map<string, { redirectUris: string[] }>>; // DCR hosts for the list
// grants.service.ts (T4 part)
list(userId: string): Promise<ConnectedAppDto[]>;           // families() → lastUsedAt, expired = family null
revokeAll(userId: string): Promise<void>;                   // deleteAllGrants, then revokeGrant for each id
markAllRevoked(userId: string): Promise<void>;              // revokeGrant for each of grantIds (rows go by cascade)
```
- `ConnectedAppsController` (`@Controller("connected-apps")`, bearer): `GET` → `{ items }` (`@ApiProblemResponses(401)`);
  `DELETE :id` (`@HttpCode(204)`, `@ApiProblemResponses(401, 404)`) → `deleteGrant`, false → `NotFoundException`.
- `clientIdHost`: CIMD → `new URL(clientId).host`; DCR → host of its first redirect URI.
- `AuthService.logoutAll`: `sessions.revokeAll(userId)`, then `grants.revokeAll(userId)` (OQ-294).
- `AccountService.deleteAccount`: `grants.markAllRevoked(userId)` **before** `usersRepository.deleteAccount` (the ids are
  gone after it), inside its own `cleanUp` (a failure is logged, the delete continues).

### Contract stubs (test step)
`OAuthModule`, `ConsentController`, `ConnectedAppsController` and their DTOs as above, and the three pure functions of
`redirect-uri.ts` plus `isPublicAddress` in `cimd-fetcher.ts` (the unit tests import them; T2 fills them in), with every handler throwing
`new Error("not implemented (feat-mcp-oauth-api)")`, so `openapi.json` is final and lint and typecheck pass while the
tests fail. The test step also adds the three scopes to `RateLimitScope` and `windowsMs` to `RateLimits` (type only;
`DEFAULT_RATE_LIMITS` stays unchanged until T1), so `create-test-app.ts` typechecks.

## Acceptance criteria
`ISSUER` = `http://localhost:3001` (`setup-env.ts`), `WEB` = `http://localhost:3000`. CIMD tests serve documents from a
local HTTP server on `127.0.0.1` (allowed in `test`). `PKCE`: verifier 43+ chars, challenge `pkceChallenge(verifier)`.

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `GET /.well-known/oauth-protected-resource/mcp` and `/.well-known/oauth-protected-resource` → `200`, body exactly API-MCP-001's, `Cache-Control: public, max-age=3600`, no token needed; `GET /api/v1/.well-known/oauth-protected-resource/mcp` → `404` | `api/test/mcp-oauth.ac.e2e-spec.ts` | T1 |
| AC-2 | `GET /.well-known/oauth-authorization-server` → `200`, body exactly API-MCP-002's | `api/test/mcp-oauth.ac.e2e-spec.ts` | T1 |
| AC-3 | feat-api-rate-limit AC-13 (updated): `DEFAULT_RATE_LIMITS` equals D10's object | `api/src/rate-limit/rate-limits.ac.spec.ts` | T1 |
| AC-4 | `envSchema`: no `API_PUBLIC_URL` → `http://localhost:3001` (development, test); none in production → fails; `ftp://x`, `https://a.b/`, `https://a.b/x`, `https://a.b?q=1` → fail; `https://api.example.com` → kept | `api/src/config/api-public-url.ac.spec.ts` | T1 |
| AC-5 | `api/drizzle/0012_oauth.sql` creates `oauth_scope`, `oauth_clients`, `oauth_grants` and `oauth_grants_user_client_uq` | check | T1 |
| AC-6 | `matchRedirectUri`: exact → true; other path, trailing slash, other https port → false; registered `http://127.0.0.1:3000/cb` matches `http://127.0.0.1:51234/cb`, not `/cb2` or `http://127.0.0.2:51234/cb`; same for `localhost` and `[::1]`. `isValidRedirectUri`: `http://example.com/cb`, a URL with `#x`, a relative URL, 2001 chars → false; `https://app.example/cb`, `http://localhost:8080/cb` → true | `api/src/oauth/redirect-uri.ac.spec.ts` | T2 |
| AC-7 | `isPublicAddress`: false for `127.0.0.1`, `10.1.2.3`, `172.16.0.1`, `192.168.1.1`, `169.254.169.254`, `100.64.0.1`, `0.0.0.0`, `224.0.0.1`, `::1`, `::`, `fc00::1`, `fe80::1`, `::ffff:127.0.0.1`, `::ffff:10.0.0.1`; true for `93.184.216.34`, `2606:4700::1111` | `api/src/oauth/cimd-fetcher.ac.spec.ts` | T2 |
| AC-8 | `POST /oauth/register` `{client_name:"Agent X", redirect_uris:["http://127.0.0.1:3333/cb"]}` → `201`, body per API-MCP-003 (`client_id` a UUID, `client_id_issued_at` ≈ now), `Cache-Control: no-store`, a row in `oauth_clients`. Clients inserted 31 days ago: one without a grant is gone afterwards, one named by a grant stays; one 29 days old stays | `api/test/mcp-oauth.ac.e2e-spec.ts` | T2 |
| AC-9 | Register errors (`application/json` `{error, error_description?}`, `Cache-Control: no-store`, `400`): no `client_name`, 101 chars, `token_endpoint_auth_method:"client_secret_basic"`, `response_types:["token"]` → `invalid_client_metadata`; `redirect_uris` missing, `[]`, 11 items, `["http://example.com/cb"]`, `["https://a.example/cb#x"]` → `invalid_redirect_uri` | `api/test/mcp-oauth.ac.e2e-spec.ts` | T2 |
| AC-10 | With `RATE_LIMITS` `oauthRegister: 2`: the third registration from one IP → `429` Problem Details `rate-limited` | `api/test/mcp-oauth.ac.e2e-spec.ts` | T2 |
| AC-11 | CIMD: `client_id` = `http://127.0.0.1:<port>/client.json` serving `{client_id: <same URL>, client_name: "Doc App", redirect_uris: ["http://127.0.0.1:4444/cb"]}`, a valid authorize → `302` `WEB/auth/consent?request=<43 chars>`; a second authorize within 10 min doesn't fetch the document again (the server counts 1 hit) | `api/test/mcp-oauth.ac.e2e-spec.ts` | T2 |
| AC-12 | Each → `302` `WEB/auth/consent?error=invalid_client`: no `client_id`; an unknown UUID; `not-a-url`; `ftp://127.0.0.1/x`; a document whose `client_id` differs, that isn't JSON, answers `404`, is over 10 kB, answers `302` to a valid document, lacks `redirect_uris`, or has `token_endpoint_auth_method:"private_key_jwt"` | `api/test/mcp-oauth.ac.e2e-spec.ts` | T2 |
| AC-13 | A DCR client with a valid query: no `redirect_uri` or an unregistered one → `302` `WEB/auth/consent?error=invalid_redirect_uri`; registered `http://127.0.0.1:3333/cb` with `redirect_uri=http://127.0.0.1:40000/cb` → `302` to the consent page. Then, each back to `redirect_uri` with `state=xyz`: `response_type=token` → `error=unsupported_response_type`; no `code_challenge`, or `code_challenge_method=plain` → `invalid_request`; `scope=pm4:admin` → `invalid_scope`; `resource=http://evil.example/mcp` → `invalid_target`. A 501-char `state` → `invalid_request` without `state` | `api/test/mcp-oauth.ac.e2e-spec.ts` | T2 |
| AC-14 | A valid authorize stores `oauth:request:<id>` with a TTL between 3590 and 3600 s; `scope` absent → the consent request lists `["pm4:read","pm4:write"]`, `scope=pm4:read` → `["pm4:read"]`; `resource=ISSUER/mcp` accepted | `api/test/mcp-oauth.ac.e2e-spec.ts` | T3 |
| AC-15 | With `RATE_LIMITS` `oauthAuthorize: 1`: the second authorize → `429` | `api/test/mcp-oauth.ac.e2e-spec.ts` | T2 |
| AC-16 | `GET /api/v1/oauth/consent/{id}` with a web token → `200` `{id, client:{name, clientIdHost}, redirectHost:"127.0.0.1:40000", loopback:true, scopes, expiresAt ≈ now+10 min, existingGrant:null}`; an https redirect → `loopback:false`, host without port; unknown id → `404`; no token → `401` | `api/test/mcp-oauth.ac.e2e-spec.ts` | T3 |
| AC-17 | Deny → `200` `{redirectUrl}` = the redirect URI with `error=access_denied&state=xyz`; the request is then `404`; no grant row | `api/test/mcp-oauth.ac.e2e-spec.ts` | T3 |
| AC-18 | Allow → `200` `{redirectUrl}` with `code` (43 chars) and `state=xyz`; one `oauth_grants` row (`scope` `write`, the client's name); the request is then `404`, a second Allow `404` | `api/test/mcp-oauth.ac.e2e-spec.ts` | T3 |
| AC-19 | A request whose stored `expiresAt` is in the past: `GET` → `200` with that `expiresAt`; Allow → `410` `gone`; then `GET` → `404`; no grant row | `api/test/mcp-oauth.ac.e2e-spec.ts` | T3 |
| AC-20 | `POST /oauth/token` (form) `grant_type=authorization_code`, the code, `redirect_uri`, `client_id`, the verifier → `200` `{access_token, token_type:"Bearer", expires_in:900, refresh_token (43 chars), scope:"pm4:read pm4:write"}`, `Cache-Control: no-store`. The access token verifies with the HKDF key and has `iss` ISSUER, `aud` ISSUER+`/mcp`, `sub`, `gid` = the grant id, `client_id`, `scope`; it does **not** verify with `JWT_ACCESS_SECRET` | `api/test/mcp-oauth.ac.e2e-spec.ts` | T3 |
| AC-21 | `invalid_grant` for: the code a second time; a wrong verifier (and the right one afterwards); another `client_id`; another `redirect_uri`; a code deleted from Redis. `resource=http://evil.example/mcp` → `invalid_target`; `grant_type=password` → `unsupported_grant_type`; no `code` → `invalid_request`; no `client_id` → `401` `invalid_client` | `api/test/mcp-oauth.ac.e2e-spec.ts` | T3 |
| AC-22 | `grant_type=refresh_token` → a new pair; the old refresh token → `invalid_grant`; then the new one → `invalid_grant` too (reuse); `mcp:family:<gid>` is gone and `mcp:revoked:<gid>` exists | `api/test/mcp-oauth.ac.e2e-spec.ts` | T3 |
| AC-23 | A refresh with another `client_id` → `invalid_grant`; the same token with the right `client_id` still works (D6) | `api/test/mcp-oauth.ac.e2e-spec.ts` | T3 |
| AC-24 | An app with `AUTH_ALLOWED_EMAILS` not listing the user: a refresh → `invalid_grant`, and the grant row is deleted | `api/test/mcp-oauth.ac.e2e-spec.ts` | T3 |
| AC-25 | An MCP access token on `GET /api/v1/me` → `401` | `api/test/mcp-oauth.ac.e2e-spec.ts` | T3 |
| AC-26 | Authorize again for an app the user granted: `existingGrant.connectedAt` = the old row's `created_at`; Allow → a new grant id, the old row gone, the old refresh token → `invalid_grant`, `mcp:revoked:<old gid>` exists | `api/test/mcp-oauth.ac.e2e-spec.ts` | T3 |
| AC-27 | `POST /oauth/revoke` `token=<refresh>&client_id=<its client>` → `200`, empty; the grant row is gone, `mcp:revoked:<gid>` exists, the token → `invalid_grant`. An unknown token, or another client's `client_id` → `200` and nothing changes; no `token` → `400` `invalid_request` | `api/test/mcp-oauth.ac.e2e-spec.ts` | T3 |
| AC-28 | With `RATE_LIMITS` `oauthToken: 1`: a token call then a revoke from one IP → the revoke gets `429` | `api/test/mcp-oauth.ac.e2e-spec.ts` | T3 |
| AC-29 | `GET /api/v1/connected-apps`: two grants newest first, each `{id, client:{name, clientIdHost}, scopes, connectedAt, lastUsedAt, expired}`. Right after Allow: `lastUsedAt:null, expired:false`; after the code exchange `lastUsedAt` ≈ now; a refresh moves it. A DCR client's `clientIdHost` is its first redirect URI's host. Another user's grants never appear | `api/test/connected-apps.ac.e2e-spec.ts` | T4 |
| AC-30 | `mcp:family:<gid>` deleted (as after 30 days) → the item has `expired:true, lastUsedAt:null` | `api/test/connected-apps.ac.e2e-spec.ts` | T4 |
| AC-31 | `DELETE /api/v1/connected-apps/{id}` → `204`; the list no longer has it; its refresh token → `invalid_grant`; `mcp:revoked:<id>` exists with a TTL ≤ 900 s. Another user's id, an unknown UUID, `abc` → `404` | `api/test/connected-apps.ac.e2e-spec.ts` | T4 |
| AC-32 | `POST /api/v1/auth/logout-all` → every grant row of the user is gone, each gid has `mcp:revoked:`, their refresh tokens → `invalid_grant`; another user's grant stays | `api/test/connected-apps.ac.e2e-spec.ts` | T4 |
| AC-33 | `DELETE /api/v1/me` → the user's grant rows are gone and each former gid has `mcp:revoked:` | `api/test/connected-apps.ac.e2e-spec.ts` | T4 |
| AC-34 | `openapi.json` is current and has `GET /api/v1/oauth/consent/{requestId}`, its `allow`/`deny` (`410` among their responses), `GET /api/v1/connected-apps` and `DELETE /api/v1/connected-apps/{id}`, and no `/oauth/token`, `/oauth/authorize` or `/.well-known/…` path | check | T4 |

## Checks
```bash
# AC-5: the migration creates the enum, both tables and the unique index
f=api/drizzle/0012_oauth.sql
grep -q 'CREATE TYPE "public"."oauth_scope"' "$f" && grep -q 'CREATE TABLE "oauth_clients"' "$f" && grep -q 'CREATE TABLE "oauth_grants"' "$f" && grep -q 'oauth_grants_user_client_uq' "$f"
```
```bash
# AC-34: the web-facing paths are in the contract, the protocol ones aren't, and it's current
node -e "const p=require('./api/openapi.json').paths; const ok=p['/api/v1/oauth/consent/{requestId}']?.get && p['/api/v1/oauth/consent/{requestId}/allow']?.post?.responses['410'] && p['/api/v1/oauth/consent/{requestId}/deny']?.post && p['/api/v1/connected-apps']?.get && p['/api/v1/connected-apps/{id}']?.delete && !Object.keys(p).some(k=>/^\/(oauth\/(token|authorize|revoke|register)|\.well-known)/.test(k)); process.exit(ok?0:1)"
tmp=$(mktemp -d)
cp api/openapi.json "$tmp/"
(cd api && npm run -s openapi:export) && cmp -s api/openapi.json "$tmp/openapi.json"
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Foundation: schema + migration, `API_PUBLIC_URL`, rate-limit scopes and windows, prefix exclusions, urlencoded parser, discovery documents | api | S | haiku | Spelled-out edits that copy existing patterns; no auth logic | — |
| T2 | Clients and authorize: redirect-URI matching, the SSRF-safe CIMD fetcher, DCR registration, `ClientRegistry`, `GET /oauth/authorize` | api | M | sonnet | Security logic (SSRF, open redirects) and an external fetch (task-routing sonnet triggers) | T1 |
| T3 | Consent, tokens, revoke: the Redis store with the rotation script, `McpTokenService`, the consent endpoints, `POST /oauth/token` and `/oauth/revoke` | api | M | sonnet | Auth and token logic with an atomic Lua script (sonnet triggers) | T2 |
| T4 | Connected apps list and revoke, Sign out of all devices and account deletion ending grants, `openapi.json` | api | S | sonnet | Revocation across Postgres and Redis in two existing auth flows (auth logic trigger) | T3 |

## Agents
| Step | Agent | Date |
| --- | --- | --- |
| Prototype | `claude-code/claude-opus-5-5` | 2026-11-21 |
| Spec | `claude-code/claude-opus-5-5` | 2026-11-21 |
| Tasks (`pm4 tasks`) | `claude-code/claude-opus-5-5` | 2026-11-21 |
| Acceptance tests | `claude-code/claude-sonnet-5-5`, checked by `claude-code/claude-opus-5-5`, fixes by `claude-code/claude-opus-5-5` | 2026-11-21 |

## Open questions
— (OQ-287…OQ-305 resolved)

## Changelog
- 2026-11-21: Initial draft (OQ-301…OQ-305 decided with the owner the same day). Status `review`.
- 2026-11-21: Approved by the owner.
- 2026-11-21: Contract stubs also cover `redirect-uri.ts` and `isPublicAddress` so the unit acceptance tests typecheck (found in the test step).
- 2026-11-21: The test step also touches `rate-limit.ac.e2e-spec.ts` (type only) and adds `410` to `ApiProblemResponses`.
- 2026-11-21: The test step regenerates `web/lib/api/schema.d.ts` so the pull request's contract check passes (owner).
- 2026-11-21: T1 also updates the `Env` fixtures in `env.schema.spec.ts` and `app-config.service.spec.ts` for the required `API_PUBLIC_URL` (found in T1).
