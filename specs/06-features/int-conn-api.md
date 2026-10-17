---
id: feat-int-conn-api
title: "PMSPA connection API: connect, test, disconnect, and the PMSPA client"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-17
milestone: M6
requirements: [FR-INT-002, FR-INT-003, FR-INT-004, FR-INT-005, FR-INT-013, FR-INT-014, API-INT-001, API-INT-002, API-INT-003, API-INT-004]
related: [req-integrations, api-endpoints, api-data-model, sec, arch-environments, feat-int-sync-api, feat-int-time-api, feat-int-web, OQ-138, OQ-142, OQ-145, OQ-160, OQ-161, OQ-165, OQ-166, OQ-177, OQ-178, OQ-183, OQ-186, OQ-187, OQ-188]
prototype: eefe787
---

# PMSPA connection API: connect, test, disconnect, and the PMSPA client

## Goal
The API stores one PMSPA connection per user (credentials encrypted), checks it against PMSPA, reports its status and
account, and disconnects; and it has the one PMSPA HTTP client every later connector endpoint goes through (timeouts,
SSRF guard, token cache with re-login, the shared rate-limit pause, status updates).
Contract: [endpoints.md → Shared PMSPA shapes, PMSPA errors, API-INT-001…004](../03-api/endpoints.md#shared-pmspa-shapes).
Tables: [data-model.md → pmspa_connections, the link tables](../03-api/data-model.md#pmspa_connections). Rules:
FR-INT-002…005, FR-INT-013, FR-INT-014, [security.md → Outbound calls to PMSPA](../02-architecture/security.md#outbound-calls-to-pmspa-m6-req-integrations).
The web side is feat-int-web.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | All PMSPA tables (the connection and the three link tables) and both enums come in this feature's one migration, so the account switch (FR-INT-002) can count and drop links. Their logic is feat-int-sync-api / feat-int-time-api. | Agent |
| D2 | Problems get their own slug and extension members through `ProblemException` in `common/`; the filter uses them. The status-based slugs stay as they are. | Agent: `pmspa-*` slugs and `retryAfterSeconds` / `linkCount` need it |
| D3 | Every PMSPA HTTP call goes through `PmspaTransport` (fetch, 60 s timeout, no redirects, SSRF check on the resolved addresses before each call, the 429 pause). Its `fetch` and DNS lookup are injected (`PMSPA_FETCH`, `DNS_LOOKUP`), so e2e tests run the real transport against `FakePmspa.fetch` and a fake resolver. | Agent, as `GoogleOidc` / `FakeGoogleOidc` |
| D4 | The account check is `POST /v1/auth/login`, then `POST /v1/auth`; both answer `{user: {_id, email, avatar_url, role}}` (PMSPA docs `users.login`, `users.checkAuth`). Login `409` or `422` = invalid credentials. | OQ-138 (owner), PMSPA docs |
| D5 | Redis: `pmspa:token:<userId>` (the encrypted token, 23 h), `pmspa:account:<userId>` (the last `PmspaAccount`, no expiry), `pmspa:pause:<host>` (expires after `Retry-After`). | FR-INT-003, OQ-166, OQ-177 |
| D6 | The status row is written only when it changes, or on save / Test (OQ-178). | OQ-178 (owner) |
| D7 | Saving with an unresolvable host stores the row as Unreachable; a host that resolves to a private address is a `400` and nothing is stored. | Agent, FR-INT-002 ("stores the settings whatever the result") |
| D8 | Test connection with credentials that now log in as another account than `pmspa_user_id` sets Invalid credentials: switching accounts goes through Save and its confirmation only. | Agent, OQ-161 |

## Scope
**In:** the migration for every PMSPA table; `ProblemException` and the filter change; `PMSPA_ENCRYPTION_KEY`; the `integrations/pmspa` module
with the crypto, URL policy, host guard, transport, Redis store, client, the connection repository, service and controller (API-INT-001…004);
the OpenAPI export.

**Non-goals** (implementers must not touch these):
- Anything in `web/`. Browse, import, sync, push and link endpoints (feat-int-sync-api, feat-int-time-api). PMSPA calls other than login and who-am-I.
- `projects/*`, `tasks/*`, `time/*`, `auth/*`, `users/*`. API rate limiting of PM4's own endpoints.
- `api/test/*` files written in the test step.

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/03-api/endpoints.md#shared-pmspa-shapes`, *PMSPA errors*, API-INT-001…004 | Contract |
| `specs/03-api/data-model.md#pmspa_connections` and the link tables | Columns, enums, indexes |
| `specs/01-requirements/integrations.md` FR-INT-002…005, FR-INT-013, FR-INT-014 | The rules |
| `api/src/projects/` (module, controller, service, repository, DTOs) | Module wiring, `@CurrentUser`, `@ApiProblemResponses`, repository style, `.js` suffixes |
| `api/src/database/schema/projects.ts`, `api/src/database/schema/index.ts` | Table style, enums, column order |
| `api/src/redis/redis.ts`, `api/src/auth/session.store.ts` | Using `Redis.client` with key prefixes and TTLs |
| `api/src/config/env.schema.ts`, `api/src/config/app-config.service.ts` | Adding an env var and its getter |
| `api/src/common/filters/problem-details/` | The filter D2 extends |
| `api/test/fake-google-oidc.ts`, `api/test/create-test-app.ts`, `api/test/support/auth-test-utils.ts` | Faking an outbound dependency in e2e tests |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| api | `api/test/pmspa-connection.ac.e2e-spec.ts` | C | tests | API-INT-001…004 against `FakePmspa` |
| api | `api/test/support/fake-pmspa.ts` | C | tests | `FakePmspa`, `fakeLookup` (Interfaces → Test doubles) |
| api | `api/src/integrations/pmspa/pmspa-crypto.ac.spec.ts`, `api/src/integrations/pmspa/pmspa-url-policy.ac.spec.ts` | C | tests | Unit acceptance tests |
| api | `api/src/integrations/pmspa/pmspa-crypto.ts`, `api/src/integrations/pmspa/pmspa-url-policy.ts` | C/M | tests, T2 | Typed stubs in the test step, implemented in T2 |
| api | `api/src/common/filters/problem-details/problem-exception.ts` | C | T1 | D2 |
| api | `api/src/common/filters/problem-details/problem-details.filter.ts`, `api/src/common/filters/problem-details/problem-details.filter.spec.ts` | M | T1 | D2 |
| api | `api/src/common/decorators/api-problem-responses/api-problem-responses.decorator.ts` | M | T1 | Add `502`, `503` |
| api | `api/src/config/env.schema.ts`, `api/src/config/app-config.service.ts`, `api/src/config/env.schema.spec.ts`, `api/.env.example`, `api/test/setup-env.ts`, `api/src/config/app-config.service.spec.ts` | M | T1 | `PMSPA_ENCRYPTION_KEY` (fixtures get a dummy key, OQ-184) |
| api | `api/src/config/env.schema.ac.spec.ts` | M | tests | feat-auth-api-session's AC-6 fixture gets a dummy key (OQ-184) |
| api | `api/src/integrations/pmspa/pmspa-problems.ts` | C | T1 | Hand-written |
| api | `api/src/integrations/pmspa/pmspa-host-guard.ts` | C/M | tests, T2 | Typed stub in the test step (OQ-183), implemented in T2 |
| api | `api/src/integrations/pmspa/pmspa-store.ts` | C | T2 | Hand-written |
| api | `api/src/integrations/pmspa/pmspa-transport.ts` | C/M | tests, T4 | Typed stub in the test step (OQ-183), implemented in T4 |
| api | `api/src/integrations/pmspa/pmspa-host-guard.spec.ts`, `api/src/integrations/pmspa/pmspa-store.spec.ts` | C | T2 | Unit tests (AC-15 covers the crypto) |
| api | `api/src/integrations/pmspa/pmspa-transport.spec.ts` | C | T4 | Unit tests |
| api | `api/src/database/schema/integrations.ts`, `api/src/database/schema/index.ts` | C/M | T3 | Tables, enums, `objectId`, `bytea` |
| api | `api/drizzle/0007_pmspa.sql`, `api/drizzle/meta/*` | C/M | T3 | `npm run db:generate -- --name pmspa` |
| api | `api/src/integrations/pmspa/pmspa.module.ts` | C/M | T3, T4, T5 | `npx nest g module integrations/pmspa --flat` (T3); providers (T4); controller and service (T5) |
| api | `api/src/integrations/pmspa/pmspa-connection.controller.ts`, `api/src/integrations/pmspa/pmspa-connection.controller.spec.ts`, `api/src/integrations/pmspa/pmspa-connection.service.ts`, `api/src/integrations/pmspa/pmspa-connection.service.spec.ts` | C | T5 | `npx nest g controller integrations/pmspa/pmspa-connection --flat`, `npx nest g service integrations/pmspa/pmspa-connection --flat` |
| api | `api/src/integrations/pmspa/pmspa-connection.repository.ts`, `api/src/integrations/pmspa/pmspa-connection.repository.spec.ts`, `api/src/integrations/pmspa/pmspa-client.spec.ts` | C | T4 | Hand-written |
| api | `api/src/integrations/pmspa/pmspa-client.ts` | C/M | tests, T4 | Typed stub in the test step (OQ-183), implemented in T4 |
| api | `api/src/integrations/pmspa/dto/pmspa-connection-response.dto.ts` | C | T2 | Hand-written; T2 because the store and `PmspaCheck` use `PmspaAccountDto` (OQ-185) |
| api | `api/src/integrations/pmspa/dto/save-pmspa-connection.dto.ts` | C | T5 | Hand-written |
| api | `api/src/app.module.ts` | M | T3 | The CLI adds `PmspaModule` |
| api | `api/openapi.json` | M | T5 | `npm run openapi:export` |

## Interfaces

### Problems (T1)
```ts
// api/src/common/filters/problem-details/problem-exception.ts
export class ProblemException extends HttpException {
  constructor(status: number, readonly slug: string, readonly title: string, detail: string,
              readonly extensions: ProblemExtensions = {}) { super(detail, status); }
}
/** Extension members never redefine the standard ones (RFC 9457). */
export type ProblemExtensions = Record<string, unknown> &
  { type?: never; title?: never; status?: never; detail?: never; instance?: never; errors?: never };
```
The filter: a `ProblemException` → `type` `<WEB_APP_URL>/errors/<slug>`, its `title`, `detail` = the message (also for 5xx: these
details are written for the user), and the `extensions` spread into the body after the standard members. A `ProblemException` is an expected
condition: the filter logs it with `warn` (status and slug, no stack), never `error`. Everything else is unchanged.
`ProblemStatus` gains `502` (`ApiBadGatewayResponse`, "PMSPA failed or couldn't be reached.") and `503` (`ApiServiceUnavailableResponse`, "PMSPA is busy.").
```ts
// api/src/integrations/pmspa/pmspa-problems.ts: one factory per row of endpoints.md *PMSPA errors*, plus the account switch
export const pmspaProblems = {
  notConnected: () => new ProblemException(409, "pmspa-not-connected", "PMSPA isn't connected", "Connect PMSPA in Settings → Integrations."),
  invalidCredentials: () => new ProblemException(409, "pmspa-invalid-credentials", "PMSPA rejected the credentials", "PMSPA rejected the saved email or password."),
  unreachable: () => new ProblemException(502, "pmspa-unreachable", "PMSPA is unreachable", "PMSPA couldn't be reached or didn't answer in time."),
  error: () => new ProblemException(502, "pmspa-error", "PMSPA failed", "PMSPA answered with an error."),
  rateLimited: (retryAfterSeconds: number) => new ProblemException(503, "pmspa-rate-limited", "PMSPA is busy", "PMSPA is busy. Try again later.", { retryAfterSeconds }),
  syncRunning: () => new ProblemException(409, "pmspa-sync-running", "A sync is running", "Another import, sync or push is still running."),
  accountSwitch: (linkCount: number, accountEmail: string) => new ProblemException(409, "pmspa-account-switch", "Different PMSPA account", "The credentials log in as a different PMSPA account.", { linkCount, accountEmail })
};
```

### Config (T1)
`PMSPA_ENCRYPTION_KEY`: required; base64 that decodes to exactly 32 bytes (else boot fails with that message). `AppConfigService.pmspaEncryptionKey: Buffer`.
`.env.example` and `test/setup-env.ts` get a fixed dummy key (`Buffer.alloc(32, 7).toString("base64")`).

### Crypto, URL policy, host guard (T2)
```ts
// pmspa-crypto.ts (FR-INT-003)
@Injectable() export class PmspaCrypto {
  constructor(config: AppConfigService);
  encrypt(plain: string): Buffer;   // AES-256-GCM: randomBytes(12) IV ‖ ciphertext ‖ 16-byte tag
  decrypt(blob: Buffer): string;    // throws on a wrong key or a changed blob
}
// pmspa-url-policy.ts (FR-INT-002, OQ-145, OQ-160): syntax and protocol only, no DNS
export type PmspaUrlProblem = "not-a-url" | "not-https" | "private";
export function pmspaUrlProblem(url: string, nodeEnv: "development" | "test" | "production"): PmspaUrlProblem | null;
// not parseable, or not http(s) → "not-a-url"; development and hostname localhost/127.0.0.1 (http or https, any port) → null;
// protocol not https → "not-https"; hostname localhost, an IP literal in a private range (below) → "private"; else null
export const PMSPA_URL_MESSAGES: Record<PmspaUrlProblem, string> = {
  "not-a-url": "Enter a full URL starting with https://.",
  "not-https": "The URL must start with https://.",
  private: "This address is private or local, so PM4 can't connect to it."
};
export function isPrivateAddress(address: string): boolean;
// net.BlockList: IPv4 0.0.0.0/8, 10/8, 100.64/10, 127/8, 169.254/16, 172.16/12, 192.168/16, 224/3; IPv6 ::/128, ::1/128, fc00::/7, fe80::/10,
// and ::ffff:<IPv4> checked as its IPv4
// pmspa-host-guard.ts (security.md: resolved addresses, before every call)
export const DNS_LOOKUP = Symbol("DNS_LOOKUP");
export type DnsLookup = (host: string) => Promise<{ address: string; family: number }[]>;  // default: dns.promises.lookup(host, { all: true })
@Injectable() export class PmspaHostGuard {
  constructor(config: AppConfigService, @Inject(DNS_LOOKUP) lookup: DnsLookup);
  check(url: string): Promise<"ok" | "private" | "unresolved">;   // dev localhost exemption as pmspaUrlProblem; any resolved address private → "private"
}
```

### Transport and store (T2, T4)
```ts
// pmspa-transport.ts (D3)
export interface PmspaRequest {
  method: "GET" | "POST" | "PATCH" | "DELETE"; baseUrl: string; path: string;   // path starts with /v1/
  query?: Record<string, string>; token?: string; body?: unknown;
}
export interface PmspaResponse { status: number; headers: Headers; body: unknown }   // body: parsed JSON, or null
export class PmspaUnreachableError extends Error {}   // timeout, DNS, connection, a private address
export const PMSPA_FETCH = Symbol("PMSPA_FETCH");      // provided as globalThis.fetch
@Injectable() export class PmspaTransport {
  constructor(guard: PmspaHostGuard, store: PmspaStore, @Inject(PMSPA_FETCH) fetch: typeof globalThis.fetch);
  send(req: PmspaRequest): Promise<PmspaResponse>;
}
```
`send`: `store.pausedFor(host)` > 0 → throw `pmspaProblems.rateLimited(seconds)`. `guard.check(baseUrl)` not `ok` → `PmspaUnreachableError`.
URL = `baseUrl` without a trailing slash + `path` + `?` + `new URLSearchParams(query)` (each key once). `fetch` with `redirect: "manual"`,
`signal: AbortSignal.timeout(60_000)`, `Accept`/`Content-Type: application/json`, `Cookie: auth=Bearer%20<token>` when a token is given, the
JSON body. Any thrown fetch error → `PmspaUnreachableError`. A `3xx` → `PmspaUnreachableError`. A `429` → `store.pause(host, Retry-After seconds,
default 900)`, then throw `pmspaProblems.rateLimited(seconds)`. Logs only method, path, status and duration (never the body, query or token).
`host` = `new URL(baseUrl).host.toLowerCase()`.
```ts
// pmspa-store.ts (D5)
@Injectable() export class PmspaStore {
  constructor(redis: Redis, crypto: PmspaCrypto);
  getToken(userId: string): Promise<string | null>;  // a token that no longer decrypts → warn (no value), delete the key, null
  setToken(userId: string, token: string): Promise<void>;   // EX 82800
  getAccount(userId: string): Promise<PmspaAccountDto | null>;  setAccount(userId: string, a: PmspaAccountDto): Promise<void>;
  clear(userId: string): Promise<void>;                // token and account
  pausedFor(host: string): Promise<number>;            // PTTL rounded up to seconds; 0 = not paused
  pause(host: string, seconds: number): Promise<void>; // SET … PX, only if longer than the current pause
}
```

### Database and module (T3, T4)
```ts
// api/src/database/schema/integrations.ts
export const objectId = customType<{ data: string; driverData: Buffer }>({
  dataType: () => "bytea", toDriver: (hex) => Buffer.from(hex, "hex"), fromDriver: (b) => b.toString("hex") });
export const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });
export const pmspaStatus = pgEnum("pmspa_status", ["connected", "invalid-credentials", "unreachable"]);
export const pmspaLinkOrigin = pgEnum("pmspa_link_origin", ["imported", "pushed", "linked"]);
export const pmspaConnections = pgTable("pmspa_connections", {
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }).notNull(),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  status: pmspaStatus("status").notNull(),
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  pmspaUserId: objectId("pmspa_user_id"),
  url: varchar("url", { length: 500 }).notNull(),
  email: varchar("email", { length: 254 }).notNull(),
  passwordEnc: bytea("password_enc").notNull()
});
// pmspaProjectLinks / pmspaTaskLinks / pmspaLogLinks: synced_at, origin, project_id|task_id|time_log_id (PK, FK cascade), user_id (FK users cascade),
// pmspa_user_id objectId notNull, pmspa_id objectId notNull, pm4_hash bytea notNull, pmspa_hash bytea notNull;
// uniqueIndex("pmspa_<type>_links_pmspa").on(userId, pmspaUserId, pmspaId)   (<type> = project | task | log)
```
The migration is generated, never hand-written.
`pmspa.module.ts` imports `DatabaseModule` and `RedisModule` (as `projects.module.ts`); `ConfigModule` is global. T3 creates it empty;
T4 adds the providers `PmspaCrypto`, `PmspaHostGuard`, `PmspaStore`, `PmspaTransport`, `PmspaConnectionRepository`, `PmspaClient`,
`{ provide: PMSPA_FETCH, useValue: globalThis.fetch }`, `{ provide: DNS_LOOKUP, useValue: defaultDnsLookup }` (exported by `pmspa-host-guard.ts`: `dns.promises.lookup(h, { all: true })`) and exports `PmspaClient`;
T5's CLI adds the controller and service.

### Repository and client (T4)
```ts
// pmspa-connection.repository.ts
export interface PmspaConnectionRow { userId: string; url: string; email: string; passwordEnc: Buffer; status: PmspaStatus;
  pmspaUserId: string | null; lastCheckedAt: Date; lastSyncAt: Date | null }
find(userId: string): Promise<PmspaConnectionRow | null>;
upsert(row: Omit<PmspaConnectionRow, "lastSyncAt">): Promise<PmspaConnectionRow>;        // keeps last_sync_at
setStatus(userId: string, status: PmspaStatus, pmspaUserId?: string): Promise<void>;     // also last_checked_at = now()
delete(userId: string): Promise<void>;
/** Links of other accounts than `pmspaUserId` across the three link tables (FR-INT-002). */
countOtherAccountLinks(userId: string, pmspaUserId: string): Promise<number>;
/** One transaction: delete those links, then upsert the row. */
switchAccount(row: Omit<PmspaConnectionRow, "lastSyncAt">): Promise<PmspaConnectionRow>;
// pmspa-client.ts
export type PmspaCheck = { status: "connected"; token: string; account: PmspaAccountDto } | { status: "invalid-credentials" | "unreachable" };
@Injectable() export class PmspaClient {
  constructor(transport: PmspaTransport, store: PmspaStore, repo: PmspaConnectionRepository, crypto: PmspaCrypto);
  /** D4: login + who-am-I, no cache. 409/422 on login → invalid-credentials; PmspaUnreachableError or a 5xx → unreachable; rate limit throws. */
  check(url: string, email: string, password: string): Promise<PmspaCheck>;
  /** An authenticated call for the user's saved connection (FR-INT-003): */
  request(userId: string, req: Omit<PmspaRequest, "baseUrl" | "token">): Promise<PmspaResponse>;
}
```
`request`: no row → `pmspaProblems.notConnected()`. Token = `store.getToken`, else a login with the decrypted password (`check`, then `setToken`, `setAccount`).
A stored password that no longer decrypts (`PMSPA_ENCRYPTION_KEY` changed) counts as a failed login, without calling PMSPA (OQ-187).
Send; a `500` whose `body.error.name` (or `body.name`) is `TokenExpiredError` or `JsonWebTokenError` → log in again once and resend. A failed login →
`setStatus(invalid-credentials)` if it changed, `store.clear`, throw `invalidCredentials()`. `PmspaUnreachableError` → `setStatus(unreachable)` if it
changed, throw `unreachable()`. A response (any status) → `setStatus(connected)` if the stored status wasn't `connected`. Returns the response;
callers map PMSPA's statuses. `avatarUrl` = PMSPA's `avatar_url` only when its host is `images.unsplash.com` and it's `https`, else null (OQ-166).

### Service and controller (T5)
```ts
// dto/save-pmspa-connection.dto.ts
export class SavePmspaConnectionDto {
  @IsString() @MaxLength(500) url: string;                       // then pmspaUrlProblem → 400 on "url" with PMSPA_URL_MESSAGES
  @IsEmail() @MaxLength(254) email: string;
  @IsOptional() @IsString() @Length(1, 200) password?: string;
  @IsOptional() @IsBoolean() confirmAccountSwitch?: boolean;
}
// dto/pmspa-connection-response.dto.ts: PmspaAccountDto, PmspaConnectionResponseDto (endpoints.md *Shared PMSPA shapes*), status enum named PmspaConnectionStatus
// pmspa-connection.service.ts
get(userId): Promise<PmspaConnectionResponseDto>;
save(userId, dto): Promise<PmspaConnectionResponseDto>;
test(userId): Promise<PmspaConnectionResponseDto>;
disconnect(userId): Promise<void>;
// pmspa-connection.controller.ts: @ApiBearerAuth('bearer') @Controller('integrations/pmspa'):
// @Get() get · @Put() save (@HttpCode 200) · @Post('test') @HttpCode(200) test · @Delete() @HttpCode(204) disconnect; @ApiProblemResponses per endpoints.md
```
`save`: the URL rule (400 `url`); no `password` and no stored one that decrypts (no row, or the key changed, OQ-187) → 400 `password`
"Enter the password."; `host guard` `private` → 400 `url` (`PMSPA_URL_MESSAGES.private`). Password = `dto.password` or the stored one (decrypted). `check`. When connected: the previous account =
the row's `pmspa_user_id`, else any link's `pmspa_user_id` of the user; it differs and `countOtherAccountLinks > 0` → without
`confirmAccountSwitch` throw `accountSwitch(count, account.email)` (nothing stored), with it `switchAccount`. Else `upsert` with the check's status,
`pmspa_user_id` (the new one when connected, else the stored one), `last_checked_at = now`. Connected → `setToken` and `setAccount`; otherwise `store.clear`, because a cached token may belong to
the previous URL or account (OQ-186).
`test`: no row → 404. A stored password that no longer decrypts → Invalid credentials without calling PMSPA (OQ-187). Else `check` with the
stored credentials; a connected account other than `pmspa_user_id` → Invalid credentials (D8). Write the status (also when unchanged: Test
always writes, D6). Connected (and not D8) → `setToken` and `setAccount`; otherwise `store.clear` (OQ-186).
`disconnect`: `repo.delete`, `store.clear`. `get`: the row and `store.getAccount` (`account` null unless the status is connected).

### Test doubles (tests)
```ts
// api/test/support/fake-pmspa.ts: an in-memory PMSPA behind fetch
// createTestApp([{ provide: PMSPA_FETCH, useValue: fake.fetch }, { provide: DNS_LOOKUP, useValue: fakeLookup }])
export class FakePmspa {
  accounts: { id: string; email: string; password: string; avatarUrl: string | null; role: "admin" | "user" }[];
  unreachable: boolean;                  // fetch rejects with TypeError("fetch failed")
  rateLimitOnce: number | null;          // the next request answers 429 with that Retry-After
  expireTokens(): void;                  // every token issued so far answers 500 {error: {name: "TokenExpiredError"}}
  readonly calls: { method: string; path: string; query: URLSearchParams; body: unknown }[];
  readonly fetch: typeof globalThis.fetch;  // POST /v1/auth/login (sets X-Auth), POST /v1/auth (reads the auth cookie); other paths 404 until later features add them
}
export function fakeLookup(host: string): Promise<{ address: string; family: number }[]>;
// pmspa.test → 203.0.113.10, internal.test → 10.0.0.5, anything else rejects (ENOTFOUND)
```

## Acceptance criteria
Signed in as user A unless stated; B is another user. `FakePmspa` has account X (`x@pmspa.test`, password `secret`, avatar
`https://images.unsplash.com/photo-1?w=150`, admin) and Y (`y@pmspa.test`, `secret`, avatar `https://example.com/y.png`, user). URL `https://pmspa.test`.

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `GET /integrations/pmspa` with no connection → `200` `{status: "not-configured", url: null, email: null, account: null, lastCheckedAt: null, lastSyncAt: null}` | `api/test/pmspa-connection.ac.e2e-spec.ts` | T5 |
| AC-2 | `PUT {url, email: x, password: secret}` → `200` `status "connected"`, `account {id: X, email, avatarUrl: <unsplash>, role: "admin"}`, `lastCheckedAt` ≈ now; `GET` returns the same; no field anywhere holds `secret` or the token | `api/test/pmspa-connection.ac.e2e-spec.ts` | T5 |
| AC-3 | The row's `password_enc` isn't `secret` in any encoding and `PmspaCrypto.decrypt` gives `secret`; the Redis token key's value isn't the fake's token | `api/test/pmspa-connection.ac.e2e-spec.ts` | T5 |
| AC-4 | `PUT` with password `wrong` → `200` `status "invalid-credentials"`, the row is stored; with `fake.unreachable` → `200` `"unreachable"` | `api/test/pmspa-connection.ac.e2e-spec.ts` | T5 |
| AC-5 | `PUT` → `400` naming `url` for `http://pmspa.test`, `https://localhost`, `https://10.0.0.5`, `https://internal.test`, `pmspa.test`; naming `email` for `nope`; naming `password` when there is no row and none is given; nothing is stored | `api/test/pmspa-connection.ac.e2e-spec.ts` | T5 |
| AC-6 | After AC-2, `PUT {url, email: x}` (no password) → `200` connected (the stored password was used) | `api/test/pmspa-connection.ac.e2e-spec.ts` | T5 |
| AC-7 | Y's account for A with a project link row of account X seeded: `PUT {email: y}` → `409` `…/errors/pmspa-account-switch`, `linkCount 1`, `accountEmail "y@pmspa.test"`, nothing changed; again with `confirmAccountSwitch: true` → `200`, `account.id` Y, the link row is gone, the PM4 project stays | `api/test/pmspa-connection.ac.e2e-spec.ts` | T5 |
| AC-8 | Y's avatar host isn't Unsplash → `account.avatarUrl null` | `api/test/pmspa-connection.ac.e2e-spec.ts` | T5 |
| AC-9 | `POST /integrations/pmspa/test` → `200`, `lastCheckedAt` later than before; after the password changed in the fake → `"invalid-credentials"`; no row → `404` | `api/test/pmspa-connection.ac.e2e-spec.ts` | T5 |
| AC-10 | `DELETE /integrations/pmspa` → `204`; `GET` → not-configured; Redis has no token or account key for A; a link row of A stays; a second `DELETE` → `204` | `api/test/pmspa-connection.ac.e2e-spec.ts` | T5 |
| AC-11 | `PmspaClient.request(A, GET /v1/projects)` after `fake.expireTokens()` → one new login, the call is resent once and succeeds; the cached token changed | `api/test/pmspa-connection.ac.e2e-spec.ts` | T5 |
| AC-12 | `request` with `fake.unreachable` → throws `pmspa-unreachable` and the status becomes unreachable; the next successful `request` → connected; a successful call while connected writes nothing (`last_checked_at` unchanged) | `api/test/pmspa-connection.ac.e2e-spec.ts` | T5 |
| AC-13 | `fake.rateLimitOnce = 600`: `POST /test` → `503` `…/errors/pmspa-rate-limited`, `retryAfterSeconds 600`; then B's `PUT` to the same host → `503` and the fake got no call | `api/test/pmspa-connection.ac.e2e-spec.ts` | T5 |
| AC-14 | B never sees A's connection (`GET` as B → not-configured); every endpoint without a token → `401` | `api/test/pmspa-connection.ac.e2e-spec.ts` | T5 |
| AC-18 | After connecting as X: `PUT` with password `wrong` → no token or account key for A in Redis; connected again, `PUT` with `fake.unreachable` → no keys; connected again, `POST /test` after the password changed in the fake → no keys; connected again, `POST /test` when the fake answers with another account id (D8) → `invalid-credentials`, no keys (OQ-186) | `api/test/pmspa-connection.ac.e2e-spec.ts` | T5 |
| AC-19 | After connecting, A's `password_enc` is replaced by bytes that don't decrypt and the token key is deleted: `PUT {url, email}` (no password) → `400` naming `password`, the row unchanged; `PmspaClient.request` → throws `pmspa-invalid-credentials`, status `invalid-credentials`; `POST /test` → `200` `invalid-credentials`, no token key; neither called PMSPA; `PUT` with password `secret` → `200` connected (OQ-187) | `api/test/pmspa-connection.ac.e2e-spec.ts` | T5 |
| AC-15 | `PmspaCrypto`: `decrypt(encrypt(s)) === s`; two `encrypt(s)` differ; a flipped byte → throws | `api/src/integrations/pmspa/pmspa-crypto.ac.spec.ts` | T2 |
| AC-16 | `pmspaUrlProblem`: `https://pmspa.example.com` → null; `http://pmspa.example.com` → not-https; `https://10.1.2.3`, `https://[::1]`, `https://[fd00::1]`, `https://169.254.1.1`, `https://localhost` → private; `ftp://x`, `x` → not-a-url; `http://localhost:3000` → null in development, not-https in production; `isPrivateAddress("::ffff:192.168.1.1")` → true | `api/src/integrations/pmspa/pmspa-url-policy.ac.spec.ts` | T2 |
| AC-17 | `api/openapi.json` has the four operations under `/api/v1/integrations/pmspa` with `bearer`; `PmspaConnectionResponseDto` has no `password` property | `check` | T5 |

Typed stubs (created with the tests, so lint and typecheck pass while the tests fail; not registered in any module): `pmspa-crypto.ts`
(`PmspaCrypto` with both methods) and `pmspa-url-policy.ts` (`pmspaUrlProblem`, `isPrivateAddress`, `PMSPA_URL_MESSAGES`), each body
`throw new Error("not implemented (feat-int-conn-api)")`; and, for the e2e test (OQ-183), `pmspa-host-guard.ts` (`DNS_LOOKUP`, `DnsLookup`),
`pmspa-transport.ts` (`PMSPA_FETCH`, `PmspaRequest`, `PmspaResponse`, `PmspaUnreachableError`) and `pmspa-client.ts` (`PmspaClient` with only
`request`, throwing; T4 adds its constructor and `check`). The e2e test is written against the *Interfaces* and passes once T5 is done
(as feat-auth-api-session's tests).

## Checks
```bash
# AC-17: the connection endpoints are in the contract, protected, and never expose a password
node -e "
const d=require('./api/openapi.json'), p='/api/v1/integrations/pmspa', s=d.components?.schemas??{};
const want=[[p,'get'],[p,'put'],[p,'delete'],[p+'/test','post']];
for (const [path,m] of want) { const o=d.paths[path]?.[m]; if(!o){console.error('missing',m,path);process.exit(1)} if(!JSON.stringify(o.security??[]).includes('bearer')){console.error('not protected',m,path);process.exit(1)} }
if (JSON.stringify(s.PmspaConnectionResponseDto??{}).includes('password')) { console.error('password in the response schema'); process.exit(1) }"
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | `ProblemException` and the filter, `502`/`503` in `@ApiProblemResponses`, `pmspaProblems`, `PMSPA_ENCRYPTION_KEY` | api | S | haiku | Copy the filter's status slugs and an existing env var + getter; the code is in *Interfaces* | — |
| T2 | `PmspaCrypto`, URL policy, host guard, `PmspaStore` (AC-15, AC-16) | api | M | haiku | Fully specified in *Interfaces* (AES-GCM layout, ranges, keys/TTLs); the store copies `session.store.ts`. Owner's call against the security trigger; AC-15/16 and the Opus review cover it | T1 |
| T3 | PMSPA tables, migration `0007`, `PmspaModule` scaffold | api | S | haiku | Copy `schema/projects.ts`; columns, enums, indexes in *Interfaces*; the migration is generated | T1 |
| T4 | `PmspaTransport`, the connection repository, `PmspaClient`, the module's providers | api | M | sonnet | First outbound HTTP client, tokens and re-login, a transaction over four tables (owner: sonnet, as it is specified line by line) | T2, T3 |
| T5 | DTOs, service, controller, OpenAPI export (API-INT-001…004) | api | M | haiku | Copy `projects/` (controller, service, DTOs, `@ApiProblemResponses`); the save/test/disconnect rules are in *Interfaces* | T4 |

## Open questions
None.

## Changelog
- 2026-10-17: Initial draft (prototype `eefe787`; OQ-138, OQ-142, OQ-145, OQ-160, OQ-161, OQ-165, OQ-166, OQ-175…OQ-178). Ready for review.
- 2026-10-17: Approved by the owner.
- 2026-10-17: Tasks re-split for Haiku (owner): T1–T5, T2 haiku and T4 sonnet; Files, AC and *Interfaces* task tags follow; module wiring per task. Ready for review.
- 2026-10-17: Approved by the owner. Test step: typed stubs of the host guard, transport and client for the e2e test (OQ-183).
- 2026-10-17: Implementation: the env fixtures get a dummy key (OQ-184); the response DTO file moves to T2 (OQ-185).
- 2026-10-17: After the Opus review (owner approved its suggestions): the token cache is cleared whenever a save or Test doesn't connect (OQ-186,
  AC-18); a stored password that no longer decrypts is treated as invalid credentials (OQ-187, AC-19); AC-14's anonymous requests are built
  lazily (OQ-188); `ProblemExtensions` can't redefine the standard members; problems log at `warn`; `getToken` logs and drops an undecryptable
  token; the module uses `defaultDnsLookup`; the migration is named `0007_pmspa`; `pmspa-crypto.spec.ts` is dropped (AC-15 covers it).
