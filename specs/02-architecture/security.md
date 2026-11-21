---
id: sec
title: Security
status: review
owner: Marko Angelovski
last_updated: 2026-11-21
related: [web-routing, req-auth, arch-env, api-conventions, ADR-0007, NFR-004, NFR-005]
---

# Security

## Purpose
Security requirements and the authentication/authorization design.

## Threat model summary
Assets: the user's project/time data, Google identity linkage, tokens. Main threats: token theft via
XSS (tokens live in the browser), IDOR (accessing other users' rows), OAuth CSRF / code injection,
brute force against the refresh endpoint, and leaked secrets.

## Authentication flow (ADR-0007)
Actors: **W** = web (`https://pm4.angelovski.top`), **A** = API (`https://pm4-api-heagfvepgbcje5c3.westeurope-01.azurewebsites.net`), **G** = Google.

1. The user clicks "Continue with Google". W navigates the browser to
   `A/api/v1/auth/google?returnTo=/app/projects&timeZone=Europe/Zagreb` (the browser's zone, used only for a new account, OQ-061).
   `returnTo` must be a relative path (open-redirect protection). W itself only ever sends a path under
   `/app`, and re-validates the value it gets back at `W/auth/callback` (`04-web/routing.md`, OQ-047).
   The API's rule stays "relative path": it holds no web route paths.
2. A creates `state` + a PKCE `code_verifier`, stores `{verifier, returnTo, timeZone}` in Redis under
   `oauth:state:<state>` (TTL 10 min), and redirects to G's authorize URL (scopes `openid email profile`,
   `prompt=select_account`, OQ-065).
3. G redirects to `A/api/v1/auth/google/callback?code&state`. A loads and **deletes** the state
   entry (single use), exchanges the code with PKCE, validates the ID token (issuer, audience,
   `email_verified`), applies the sign-up policy (allow-list, see below), and upserts the user + identity:
   a new identity creates the user (time zone from the state entry, else `UTC`); a known one updates the
   user's email, name and avatar URL when they changed (OQ-062). Any failure redirects to
   `W/auth/sign-in?error=cancelled|not-allowed|failed` instead (API-AUTH-002, OQ-063).
4. A creates a one-time **login code** (32 random bytes, stored in Redis `auth:code:<hash>`, TTL 60 s)
   and redirects to `W/auth/callback?code=<code>&returnTo=…`.
5. W POSTs `{code}` to `A/api/v1/auth/token`. A consumes the code (single use) and returns
   `{accessToken, accessTokenExpiresAt, refreshToken}`. W replaces the URL (removing the code from history).
6. **Access token:** a JWT (HS256), `sub` = user id, TTL 15 min. Kept **in memory** only.
7. **Refresh token:** opaque, 32 random bytes. Redis stores `auth:refresh:<sha256(token)>` → `{userId, familyId}`,
   with TTL = the refresh lifetime. Each sign-in starts a **family** (`auth:family:<familyId>` → `{userId, current}`,
   where `current` is the hash of its live token). A cross-site cookie isn't viable: the API stays on
   `*.azurewebsites.net`, because the Free tier has no custom domains (OQ-004, OQ-024). W keeps the token in
   **`localStorage`** (OQ-024), so all tabs share one session and it survives browser restarts. The
   refresh lifetime is **30 days, sliding** (every rotation issues a token valid for another 30 days),
   which covers the required minimum of 8 hours of use (OQ-023).
8. **Refresh:** `POST /auth/refresh {refreshToken}` → a new pair, and the old token is invalidated
   (**rotation**; a marker `auth:rotated:<hash>` → `familyId` remembers it for the refresh lifetime).
   Reusing an already-rotated token revokes the whole family (**reuse detection**).
   Concurrent refreshes are serialized in the client: within a tab, every caller shares one in-flight refresh; across
   tabs, the refresh runs inside the Web Locks API lock `pm4-auth-refresh` (`navigator.locks`; without it, the tab
   refreshes on its own) and reads the stored token inside the lock, so a tab that waited uses the token another tab
   just rotated. Tabs learn of a sign-out through `storage` events on the refresh-token key.
9. **Logout:** `POST /auth/logout {refreshToken}` revokes the family. W clears its storage.
10. **Logout everywhere:** `POST /auth/logout-all` (authenticated) revokes every refresh-token family of
    the user. Redis keeps a per-user set of family ids (`auth:families:<userId>`) for this. Access tokens
    already issued stay valid until they expire (≤ 15 min).

## Sign-up policy (OQ-022)
`AUTH_ALLOWED_EMAILS` holds a comma-separated list of emails, compared case-insensitively after trimming.
If it's set, only a verified Google email on the list can sign in or create an account. Anyone else is
sent back to the sign-in screen with a "not allowed" error, and no user row is created. If it's empty,
sign-up is open. The check runs on **every sign-in and every refresh** (OQ-039). Removing an email blocks new sessions, and
existing ones end at their next refresh, so within 15 minutes. The refresh fails with `401`, and the family is revoked.

Adding a provider later: any **OpenID Connect** provider (e.g. a self-hosted Authentik, Keycloak or
Entra ID) is added mainly through configuration: issuer URL (discovered via `/.well-known/openid-configuration`),
client id and secret, plus a callback route. It reuses the same `openid-client` flow and writes to the
same `user_identities` table (`provider` = the configured provider key). Providers that are OAuth 2.0-only
(no OIDC) or SAML-only need their own adapter.

## Authorization
- **Default-deny (OQ-066):** a global guard requires a valid access token on every endpoint. Only handlers
  marked `@Public()` skip it: `/health`, `GET /api/v1/version`, `GET /api/v1/changelog` (API-SYS-004, OQ-272) and API-AUTH-001…005.
- Every table carries (or inherits via its parent) `userId`. Every query filters on the
  authenticated user. Implemented in the data-access layer, not only in controllers.
- A resource that doesn't exist or isn't owned returns **404** (existence isn't revealed).
- Linking checks ownership: a log's `taskId`/`projectId` must be an existing task/project of the same user.
- Linking a task to a project checks ownership the same way: the `projectId` must be an existing project of the caller's.
- **The one cross-user read (OQ-076, OQ-077):** a project or task may name **any registered user** as its
  project lead. To support that, API-USR-003 returns other users' `id`, `displayName` and `avatarUrl` for
  the lead picker (search by name only: at least 2 characters, at most 10 results, OQ-089, OQ-277), and
  project/task responses include the lead user's `id`, `displayName` and `avatarUrl`. No endpoint returns or
  matches another user's email (OQ-277).
  Naming someone as lead gives them **no access**: every project/task query stays scoped to the owner, and
  nothing tells a user which items name them (FR-PRJ-007). No other endpoint reads another user's data.
- Tests: every endpoint has a cross-user test (NFR-005).

## API hardening
- CORS: allow-list `CORS_ORIGINS` only, with no credentials. Methods and headers restricted to what's used.
- helmet, a JSON body limit (e.g. 100 kB), and `ValidationPipe` with whitelist + forbidNonWhitelisted.
- Rate limiting (Redis-backed, `@nestjs/throttler`, OQ-039, feat-api-rate-limit). One fixed one-minute window
  per counter. Each auth route has its own counter per client IP (OQ-253); every other endpoint shares **one**
  counter per user across the whole API (OQ-254):
  | Scope | Key | Limit |
  | --- | --- | --- |
  | `GET /auth/google` | IP | 10 / min |
  | `GET /auth/google/callback` | IP | 10 / min |
  | `POST /auth/token` | IP | 10 / min |
  | `POST /auth/refresh` | IP | 30 / min |
  | `POST /auth/logout` | IP | 30 / min |
  | Every other endpoint (one counter in total) | user id | 300 / min |
  Over the limit → `429` `…/errors/rate-limited` with `Retry-After` and `retryAfterSeconds`, except the two
  browser navigations (`GET /auth/google` and its callback), which redirect to the web's
  `/auth/sign-in?error=rate-limited` (OQ-257). A request rejected with `401` (missing or invalid access token)
  isn't counted. `/health`, `GET /api/v1/version` (API-SYS-003) and `GET /api/v1/changelog` (API-SYS-004, OQ-272), public and without DB/Redis, aren't limited.
  **Client IP:** Express `trust proxy` = 1 (the Azure App Service front end is the one proxy), so the IP is the
  last `X-Forwarded-For` entry; a `:port` suffix is stripped and an IPv6 address counts by its /64.
  **Redis unreachable or slower than 500 ms:** the request is allowed and a warning is logged (fail open, OQ-255).
- Never log tokens, codes, secrets or full request bodies of auth endpoints.

## Outbound calls to PMSPA (M6, req-integrations)
- **Only the API calls PMSPA.** The browser never sees the PMSPA URL's credentials or token (FR-INT-003).
- **SSRF (OQ-145, OQ-160):** the PMSPA URL must be `https://`; the host's resolved addresses are checked on save and
  before every call, and a private, loopback, link-local or unique-local address (IPv4 and IPv6) is refused. Redirects
  aren't followed. In `development` only, `http://localhost` and `http://127.0.0.1` (any port) are allowed.
- **Credentials at rest:** the password and the cached PMSPA token are encrypted with AES-256-GCM (random 12-byte IV,
  auth tag) under `PMSPA_ENCRYPTION_KEY` (environments.md). Neither is ever returned, logged or put in an error.
- **Ownership on the PMSPA side:** PMSPA doesn't enforce it on every write, so before writing to a PMSPA project, task or
  event the API checks it belongs to the connected PMSPA account (design principle 10, OQ-161).
- **Budget:** a 60-second timeout per call; a 429 pauses every call to that host until `Retry-After` (OQ-177).
- PMSPA payloads are never logged, only the operation, status and duration.

## Agent access (M9, ADR-0013, req-agents)
PM4's API is the OAuth 2.1 authorization server for its own MCP endpoint `/mcp`. Contracts: endpoints.md
*Shared agent-access shapes* and API-MCP-001…011.

- **Threats:** consent phishing (any app can call itself anything), SSRF through `client_id` metadata URLs, open
  redirects through `redirect_uri`, code interception, token replay against the REST API, stolen refresh tokens, and
  registration spam.
- **Separate tokens:** MCP access tokens are signed with an HKDF-derived key (OQ-301), carry `aud` = the `/mcp` URL,
  and are verified only at `/mcp`. The web's `AccessTokenGuard` verifies with `JWT_ACCESS_SECRET`, so an MCP token
  fails there (`401`), and a web token fails at `/mcp`.
- **Consent is the gate** (open clients): the consent page shows the client ID's host and the return host next to
  the claimed name, and warns for a loopback redirect. Nothing is granted without the signed-in user's **Allow**
  through the web app's bearer-authenticated API-MCP-006. The app never sees the user's Google or web tokens.
- **Redirects:** `/oauth/authorize` redirects to an app's `redirect_uri` only after it matched the client's registered
  URIs (endpoints.md *Redirect URI match*); before that, errors go to the web's consent page. Loopback URIs match on
  any port (OQ-295).
- **PKCE S256 only**; authorization codes are single use, live 60 s, and are bound to client, redirect URI, challenge
  and grant. Codes and refresh tokens are stored only as `sha256` hashes.
- **Client ID Metadata Documents:** fetched only for an `https://` `client_id` with a path, no fragment, ≤ 2048 chars.
  The host must resolve only to public addresses: loopback, private (RFC 1918, `fc00::/7`), link-local, CGNAT
  (`100.64.0.0/10`), multicast, unspecified and IPv4-mapped forms of these are refused (`node:net` `BlockList`), and
  the connection goes to the checked address. No redirects followed, 5 s timeout, at most 10 kB, JSON only. The
  document must have `client_id` equal to the URL, a `client_name` (trimmed 1–100 chars) and 1–10 `redirect_uris`
  (as API-MCP-003), and no `token_endpoint_auth_method` other than `none`. A valid document is cached in Redis for 10
  minutes; a failure isn't cached. In `development` and `test`, `http://localhost` and `http://127.0.0.1` URLs are
  allowed too (as OQ-160), so tests can serve documents.
- **Refresh tokens:** one family per grant, rotated on every use with reuse detection (as the web's, *Authentication
  flow* step 8); a reuse deletes the family, and the grant shows as expired. Every refresh re-checks that the user exists and
  passes the allow-list (*Sign-up policy*); a failure deletes the grant.
- **Revocation (OQ-302):** deleting a grant (Revoke, Allow replacing it, Sign out of all devices, the app's own
  `/oauth/revoke`, a failed allow-list check) deletes its family and refresh token, and sets `mcp:revoked:<grantId>`
  for `ACCESS_TOKEN_TTL`; `/mcp` refuses tokens whose `gid` has the marker. Account deletion (API-USR-004) sets the
  marker for each of the user's grants before deleting the user.
- **Redis keys:**
  | Key | Value | TTL |
  | --- | --- | --- |
  | `oauth:request:<id>` | pending authorization request (client, redirect URI, challenge, scope, state, `expiresAt`) | 1 h (`expiresAt` = +10 min) |
  | `oauth:code:<h(code)>` | `{grantId, userId, clientId, redirectUri, codeChallenge, scope}` | 60 s |
  | `oauth:cimd:<h(url)>` | a validated Client ID Metadata Document | 10 min |
  | `mcp:refresh:<h(token)>` | `{grantId, userId}` | `REFRESH_TOKEN_TTL` |
  | `mcp:rotated:<h(token)>` | `grantId` (reuse detection) | `REFRESH_TOKEN_TTL` |
  | `mcp:family:<grantId>` | `{userId, clientId, current: h \| null, lastUsedAt: ISO \| null}` | `REFRESH_TOKEN_TTL`, sliding |
  | `mcp:revoked:<grantId>` | `1` | `ACCESS_TOKEN_TTL` |
- **Rate limits (OQ-297)**, per client IP: `GET /oauth/authorize` 30 / min (`oauth-authorize`); `POST /oauth/token` and
  `POST /oauth/revoke` 30 / min together (`oauth-token`); `POST /oauth/register` 10 / **hour** (`oauth-register`, its
  own window). The consent and Connected apps endpoints share the user counter. The discovery documents aren't limited.
- **Registration spam:** besides its rate limit, a DCR client that no grant names is deleted after 30 days (OQ-290).
- Never log codes, tokens, `code_verifier`s or OAuth request bodies.

## Web hardening
- CSP via `<meta http-equiv="Content-Security-Policy">` (Pages can't set headers). Roughly:
  `default-src 'self'; connect-src 'self' <API origin>; img-src 'self' data: https://*.googleusercontent.com https://images.unsplash.com; script-src 'self' <hashes needed by Next>; style-src 'self' 'unsafe-inline'; frame-ancestors` (not
  enforceable via meta. Accept the risk). TODO: finalize and verify against the Next export output.
- No third-party scripts or analytics (they would widen the XSS surface for the refresh token).
- Render user text as text. No `dangerouslySetInnerHTML`.
- Nothing secret in `NEXT_PUBLIC_*`.

## Accepted risks
- **A deleted account's access tokens live on for up to 15 minutes** (OQ-281). API-USR-004 revokes every session,
  but the access-token guard doesn't look the user up, so another device's access token still passes it until it
  expires: reads see no data, writes fail, and the next refresh answers `401` and signs that device out.
- **Redis traffic isn't encrypted.** The Redis Cloud free tier has TLS off, so the API connects with plain
  `redis://` (owner decision, 2026-09-27). The Redis password and the values in transit (OAuth state and PKCE
  verifiers, refresh-token hashes, login-code hashes, rate-limit counters) could be read by
  someone on the network path between Azure and Redis Cloud. Mitigations: tokens and codes are stored only as
  SHA-256 hashes, entries are short-lived, and no user content is stored in Redis. Revisit if the Redis plan
  changes (switch to `rediss://`, which the API already accepts).

## Secrets management
Secrets live in Azure App Settings and in GitHub Actions secrets. They are never committed and never read by agents.

## Open questions
—

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Updated with owner answers to OQ-001–018.
- 2026-09-26: Owner answers to OQ-022–026, OQ-032–034.
- 2026-09-27: OQ-024 resolved: localStorage, 30-day sliding refresh.
- 2026-09-27: Rate limits and allow-list revocation moved to OQ-039.
- 2026-09-27: OQ-039 resolved: rate limits set, allow-list checked on refresh too.
- 2026-09-27: Documented how future OIDC/SSO providers plug in.
- 2026-09-27: Approved by the owner.
- 2026-09-27: Real hosts filled in. Added accepted risk: Redis without TLS (free tier).
- 2026-09-29: OQ-047: `returnTo` example moved under `/app/`; the web validates `returnTo` as a path
  under `/app/` at each hop, while the API rule is unchanged. Back to `review` (feat-land-app-route-split).
- 2026-09-29: Approved by the owner.
- 2026-10-01: OQ-050: no trailing slashes (`trailingSlash: false`); detail routes `/app/project?id=` and `/app/task?id=`. Back to `review` (feat-land-app-route-split).
- 2026-10-01: Approved by the owner.
- 2026-10-02: `GET /api/v1/version` is not rate limited, like `/health` (OQ-052).
- 2026-10-02: Time zone and account chooser at sign-in start, profile sync, failure redirects, refresh-family keys, default-deny guard, rate limiting deferred (OQ-060…066). Back to `review` (feat-auth-api-session).
- 2026-10-02: Approved by the owner.
- 2026-10-03: The project-lead exception: other users' public profile in the lead picker and in project/task responses, no access (OQ-076, OQ-077, OQ-089). Back to `review` (feat-prj-api).
- 2026-10-03: Approved by the owner.
- 2026-10-17: Outbound calls to PMSPA (SSRF, encryption, ownership checks, budget) and `https://images.unsplash.com` in `img-src` (OQ-166) (feat-int-conn-api, feat-int-web). Back to `review`.
- 2026-10-17: Approved by the owner.
- 2026-11-01: Rate limiting specified: a counter per auth route, one per-user counter, the callback and logout limits, redirects for the sign-in navigations, the client IP behind Azure, fail open (OQ-253…OQ-257, feat-api-rate-limit). Back to `review`.
- 2026-11-01: Approved by the owner with feat-api-rate-limit.
- 2026-11-07: `GET /api/v1/changelog` (API-SYS-004) added to the public and the not-limited endpoints (OQ-272, feat-shell-documentation review).
- 2026-11-12: The lead picker exposes no emails (OQ-277); a deleted account's access tokens are an accepted risk (OQ-281). Back to `review`.
- 2026-11-21: Flow step 8 describes the cross-tab refresh as built: the Web Locks lock `pm4-auth-refresh` and `storage` events, not a BroadcastChannel.
- 2026-11-21: *Agent access*: the MCP OAuth server's threats, token separation, CIMD fetching, revocation, Redis keys and rate limits (ADR-0013, OQ-290, OQ-295, OQ-297, OQ-301, OQ-302, feat-mcp-oauth-api).
