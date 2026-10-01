---
id: sec
title: Security
status: approved
owner: Marko Angelovski
last_updated: 2026-10-01
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

1. The user clicks "Continue with Google". W navigates the browser to `A/api/v1/auth/google?returnTo=/app/projects`.
   `returnTo` must be a relative path (open-redirect protection). W itself only ever sends a path under
   `/app`, and re-validates the value it gets back at `W/auth/callback` (`04-web/routing.md`, OQ-047).
   The API's rule stays "relative path": it holds no web route paths.
2. A creates `state` + a PKCE `code_verifier`, stores `{verifier, returnTo}` in Redis under
   `oauth:state:<state>` (TTL 10 min), and redirects to G's authorize URL (scopes `openid email profile`).
3. G redirects to `A/api/v1/auth/google/callback?code&state`. A loads and **deletes** the state
   entry (single use), exchanges the code with PKCE, validates the ID token (issuer, audience,
   `email_verified`), applies the sign-up policy (allow-list, see below), and upserts the user + identity.
4. A creates a one-time **login code** (32 random bytes, stored in Redis `auth:code:<hash>`, TTL 60 s)
   and redirects to `W/auth/callback?code=<code>&returnTo=…`.
5. W POSTs `{code}` to `A/api/v1/auth/token`. A consumes the code (single use) and returns
   `{accessToken, accessTokenExpiresAt, refreshToken}`. W replaces the URL (removing the code from history).
6. **Access token:** a JWT (HS256), `sub` = user id, TTL 15 min. Kept **in memory** only.
7. **Refresh token:** opaque, 32 random bytes. Redis stores `sha256(token)` → `{userId, familyId, expiresAt}`,
   with TTL = the refresh lifetime. A cross-site cookie isn't viable: the API stays on
   `*.azurewebsites.net`, because the Free tier has no custom domains (OQ-004, OQ-024). W keeps the token in
   **`localStorage`** (OQ-024), so all tabs share one session and it survives browser restarts. The
   refresh lifetime is **30 days, sliding** (every rotation issues a token valid for another 30 days),
   which covers the required minimum of 8 hours of use (OQ-023).
8. **Refresh:** `POST /auth/refresh {refreshToken}` → a new pair, and the old token is invalidated
   (**rotation**). Reusing an already-rotated token revokes the whole family (**reuse detection**).
   Concurrent refreshes from several tabs are serialized in the client (one in-flight refresh, shared through a BroadcastChannel/lock).
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
- Every table carries (or inherits via its parent) `userId`. Every query filters on the
  authenticated user. Implemented in the data-access layer, not only in controllers.
- A resource that doesn't exist or isn't owned returns **404** (existence isn't revealed).
- Linking checks ownership: a log's `taskId`/`projectId` must belong to the same user (and must not be deleted).
- Tests: every endpoint has a cross-user test (NFR-005).

## API hardening
- CORS: allow-list `CORS_ORIGINS` only, with no credentials. Methods and headers restricted to what's used.
- helmet, a JSON body limit (e.g. 100 kB), and `ValidationPipe` with whitelist + forbidNonWhitelisted.
- Rate limiting (Redis-backed, `@nestjs/throttler`, OQ-039):
  | Scope | Key | Limit |
  | --- | --- | --- |
  | `GET /auth/google`, `POST /auth/token` | IP | 10 / min |
  | `POST /auth/refresh` | IP | 30 / min |
  | Every other endpoint | user id | 300 / min |
  Over the limit → `429` with `Retry-After`. `/health` isn't limited.
- Never log tokens, codes, secrets or full request bodies of auth endpoints.

## Web hardening
- CSP via `<meta http-equiv="Content-Security-Policy">` (Pages can't set headers). Roughly:
  `default-src 'self'; connect-src 'self' <API origin>; img-src 'self' data: https://*.googleusercontent.com; script-src 'self' <hashes needed by Next>; style-src 'self' 'unsafe-inline'; frame-ancestors` (not
  enforceable via meta. Accept the risk). TODO: finalize and verify against the Next export output.
- No third-party scripts or analytics (they would widen the XSS surface for the refresh token).
- Render user text as text. No `dangerouslySetInnerHTML`.
- Nothing secret in `NEXT_PUBLIC_*`.

## Accepted risks
- **Redis traffic isn't encrypted.** The Redis Cloud free tier has TLS off, so the API connects with plain
  `redis://` (owner decision, 2026-09-27). The Redis password and the values in transit (OAuth state and PKCE
  verifiers, refresh-token hashes, login-code hashes, rate-limit counters, job payloads) could be read by
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
- 2026-09-27: Removed /internal endpoints (ADR-0011). Rate limits and allow-list revocation moved to OQ-039.
- 2026-09-27: OQ-039 resolved: rate limits set, allow-list checked on refresh too.
- 2026-09-27: Documented how future OIDC/SSO providers plug in.
- 2026-09-27: Approved by the owner.
- 2026-09-27: Real hosts filled in. Added accepted risk: Redis without TLS (free tier).
- 2026-09-29: OQ-047: `returnTo` example moved under `/app/`; the web validates `returnTo` as a path
  under `/app/` at each hop, while the API rule is unchanged. Back to `review` (feat-land-app-route-split).
- 2026-09-29: Approved by the owner.
- 2026-10-01: OQ-050: no trailing slashes (`trailingSlash: false`); detail routes `/app/project?id=` and `/app/task?id=`. Back to `review` (feat-land-app-route-split).
- 2026-10-01: Approved by the owner.
