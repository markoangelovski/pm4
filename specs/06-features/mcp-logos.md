---
id: feat-mcp-logos
title: "Agent access: app logos in Connected apps"
status: approved
owner: Marko Angelovski
last_updated: 2026-11-21
milestone: M9
requirements: [FR-MCP-003, SCR-054, API-MCP-003, API-MCP-006, API-MCP-010]
related: [api-endpoints, api-data-model, arch-security, feat-mcp-oauth-api, feat-mcp-web]
prototype: c71d350
---

# Agent access: app logos in Connected apps

## Goal
An app that sends a logo (`logo_uri`) on its own host shows it in Settings → Connected apps instead of its letter
(FR-MCP-003, SCR-054). The consent page (SCR-090) still never shows a logo.

## Decisions

| # | Decision | Source |
| --- | --- | --- |
| D1 | Logo in Connected apps only; the consent page keeps the letter (any app can claim any logo) | OQ-314 (owner, 2026-11-21) |
| D2 | Kept only when HTTPS on the client ID host (CIMD: `client_id` URL host; DCR: first redirect URI host), never loopback; anything else → `null`, never an error | OQ-314 (owner, 2026-11-21) |
| D3 | The browser loads the logo directly (no API proxy), `referrerPolicy="no-referrer"`; CSP `img-src` allows `https:` | OQ-314 (owner, 2026-11-21) |
| D4 | Stored as a snapshot on the grant at Allow, like `client_name` (a list needs no CIMD fetch); DCR clients store theirs on `oauth_clients` | Agent (spec), OQ-314 |
| D5 | Letter tile with a plain `<img>` over it, shown once loaded (the theme's `Avatar` is always round and forces its size) | Owner, prototype `c71d350` |

## Scope
**In:** the logo check, storing it (migration `0013`), API-MCP-003 accepting and echoing `logo_uri`,
`ConnectedApp.logoUri`, the web mark and its Connected apps wiring.

**Non-goals** (implementers must not touch these):
- The consent page and `ConsentRequest` (no `logoUri` there).
- The CSP `<meta>` itself: it doesn't exist in `web/` yet (security.md *Web hardening* TODO).
- Fetching, proxying or caching logo images in the API.

## Read first

| Path | Why / copy this |
| --- | --- |
| `specs/03-api/endpoints.md` → *Shared agent-access shapes* (*App logo*, `ConnectedApp`), API-MCP-003 | Contract |
| `specs/03-api/data-model.md` → `oauth_clients`, `oauth_grants`, *Migrations* | Columns, migration `0013` |
| `api/src/oauth/client-registry.ts` | CIMD and DCR resolution, `register` (T1 changes it) |
| `api/src/oauth/redirect-uri.ts` | Pure URL-check style to copy for `client-logo.ts` |
| `api/src/oauth/grants.repository.ts`, `grants.service.ts`, `oauth.service.ts`, `oauth.store.ts` | Where the name flows from client → pending request → grant → list; the logo follows the same path |
| `api/test/connected-apps.ac.e2e-spec.ts` | DCR + authorize + Allow helpers for e2e tests |
| `web/proto/features/agents/components/app-mark.tsx` | The confirmed mark (T2 copies it) |
| `web/proto/features/agents/proposed-types.ts` | The `logoUri` shape the API must serve |

## Files

| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| api | `api/src/oauth/client-logo.ac.spec.ts` | C | tests | Unit: `clientLogoUri` |
| api | `api/src/oauth/client-registry.ac.spec.ts` | C | tests | Unit: CIMD resolve with fake fetcher/store |
| api | `api/test/mcp-logos.ac.e2e-spec.ts` | C | tests | DCR → Allow → list |
| api | `api/src/oauth/client-logo.ts` | C | tests | Typed stub; T1 implements |
| api | `api/src/oauth/client-registry.ts` | M | T1 | |
| api | `api/src/oauth/grants.repository.ts` | M | T1 | |
| api | `api/src/oauth/grants.service.ts` | M | T1 | |
| api | `api/src/oauth/oauth.service.ts` | M | T1 | |
| api | `api/src/oauth/oauth.store.ts` | M | T1 | |
| api | `api/src/oauth/dto/connected-app.dto.ts` | M | T1 | |
| api | `api/src/database/schema/oauth.ts` | M | T1 | |
| api | `api/drizzle/0013_oauth_logo_uri.sql`, `api/drizzle/meta/0013_snapshot.json`, `api/drizzle/meta/_journal.json` | C/M | T1 | `npm run db:generate -- --name oauth_logo_uri` |
| api | `api/openapi.json` | M | T1 | `npm run openapi:export` |
| web | `web/features/agents/components/app-mark.ac.test.tsx` | C | tests | Mark + Connected apps row |
| web | `web/features/agents/components/app-mark.tsx` | M | T2 | Replace with the prototype's file content (exists, so not a `P` row) |
| web | `web/features/agents/components/connected-apps-settings.tsx` | M | T2 | Pass `logoUri` |
| web | `web/lib/api/schema.d.ts` | M | T2 | `npm run api:types` |
| web | `web/proto/features/agents/api.ts`, `web/proto/mock/seed.ts` | M | T2 | Back to the schema type |
| web | `web/proto/features/agents/proposed-types.ts` | D | T2 | Replaced by `schema.d.ts` |

## Interfaces

### Logo check (tests, T1)
```ts
// api/src/oauth/client-logo.ts
/** The client's logo_uri when it passes endpoints.md *App logo*, otherwise null. Never throws. */
export function clientLogoUri(value: unknown, clientIdHost: string): string | null;
```
In order, each failure → `null`: `value` is a string of 1–2048 chars; `new URL(value)` parses; `protocol === "https:"`;
`username` and `password` are empty; `host === clientIdHost` (exact, port included); `hostname` is not in
`["127.0.0.1", "[::1]", "localhost"]` (own `const`, as `redirect-uri.ts` does). Returns `value` unchanged.

### Client resolution and registration (T1)
`api/src/oauth/client-registry.ts`:
- `ResolvedClient` gains `logoUri: string | null`.
- CIMD (`resolveCimd`): `logoUri: clientLogoUri(doc.logo_uri, url.host)`, cached with the client. A cached client
  without the field (cached before this release, TTL 10 min) is returned as `{ ...cached, logoUri: cached.logoUri ?? null }`.
- DCR (`resolve`): `logoUri: client.logoUri` from `findClient`.
- `register`: after the redirect URIs pass, `const logoUri = clientLogoUri(body.logo_uri, new URL(redirectUris[0]).host)`;
  `repository.registerClient(name, redirectUris, logoUri)`; the response adds `logo_uri: logoUri` only when it isn't
  `null` (`RegisterResponse.logo_uri?: string`). An invalid `logo_uri` never fails the registration.

### Storage and the grant (T1)
- `api/src/database/schema/oauth.ts`: `logoUri: varchar("logo_uri", { length: 2048 })` (nullable) on `oauthClients`
  and `oauthGrants`. Migration `0013` only adds the two columns.
- `grants.repository.ts`: `findClient` returns `logoUri`; `registerClient(name, redirectUris, logoUri: string | null)`
  inserts it; `GrantRow` gains `logoUri: string | null`; `replaceGrant(userId, clientId, clientName, logoUri, scope)`
  inserts it.
- `oauth.store.ts`: `PendingRequest` gains `logoUri?: string | null` (optional: requests saved before the release).
- `oauth.service.ts`: `authorize` saves `logoUri: client.logoUri`; `allow` passes `pending.logoUri ?? null` to
  `replaceGrant`. `getConsent` is unchanged (no logo on `ConsentRequest`).
- `grants.service.ts` `list`: each item adds `logoUri: row.logoUri`.
- `dto/connected-app.dto.ts`: `ConnectedAppDto.logoUri` with `@ApiProperty({ type: String, nullable: true })` and the
  doc comment "HTTPS URL of the app's logo, on the app's own host; null = none." Then `npm run openapi:export`.

### Web (T2)
1. `npm run api:types` (after T1's `openapi.json`): `ConnectedAppDto` gains `logoUri: string | null`.
   `features/agents/api.ts` needs no change (`ConnectedApp` is the schema type).
2. `cp web/proto/features/agents/components/app-mark.tsx web/features/agents/components/app-mark.tsx`: it imports only
   `react` and `@/lib/utils`, so no import rewrite.
3. `connected-apps-settings.tsx`: apply the prototype's change, shown by
   `git diff c409d83 c71d350 -- web/proto/features/agents/components/connected-apps-settings.tsx` (`logoUri={app.logoUri}`
   on the row's `AppMark`). `consent-page.tsx` stays as is.
4. Prototype back to the generated type: in `proto/features/agents/api.ts` restore
   `export type ConnectedApp = components["schemas"]["ConnectedAppDto"];` and drop the `proposed-types` import; in
   `proto/mock/seed.ts` replace the `proposed-types` import with
   `type ConnectedAppDto = components["schemas"]["ConnectedAppDto"];` (as it was before `c71d350`); delete
   `proto/features/agents/proposed-types.ts`.

## Acceptance criteria

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `clientLogoUri("https://claude.ai/logo.png", "claude.ai")` → the same string; also with a matching port (`"https://a.example:8443/l.svg"`, `"a.example:8443"`) | `api/src/oauth/client-logo.ac.spec.ts` | T1 |
| AC-2 | → `null` for: another host (`https://cdn.example/l.png`, host `claude.ai`), a subdomain (`https://x.claude.ai/l.png`), a different port, `http:`, `data:`, user info (`https://u:p@claude.ai/l.png`), > 2048 chars, `""`, a non-string (`42`, `null`, `undefined`), an unparseable string, a loopback host (`https://127.0.0.1:3333/l.png` with host `127.0.0.1:3333`, and `localhost`) | `api/src/oauth/client-logo.ac.spec.ts` | T1 |
| AC-3 | CIMD document with `logo_uri` on the `client_id` host → `resolve()` gives it as `logoUri`, and it's cached with the client | `api/src/oauth/client-registry.ac.spec.ts` | T1 |
| AC-4 | CIMD document with `logo_uri` on another host → `resolve()` succeeds with `logoUri: null` | `api/src/oauth/client-registry.ac.spec.ts` | T1 |
| AC-5 | A cached CIMD client without `logoUri` → `resolve()` returns `logoUri: null` | `api/src/oauth/client-registry.ac.spec.ts` | T1 |
| AC-6 | `POST /oauth/register` with `redirect_uris: ["https://agent.example.com/cb"]`, `logo_uri: "https://agent.example.com/logo.png"` → `201` with that `logo_uri`; the `oauth_clients` row has it | `api/test/mcp-logos.ac.e2e-spec.ts` | T1 |
| AC-7 | `POST /oauth/register` with `logo_uri` on another host, or with a loopback first redirect URI → `201` without a `logo_uri` key; the row's `logo_uri` is null | `api/test/mcp-logos.ac.e2e-spec.ts` | T1 |
| AC-8 | The AC-6 client authorized and allowed → `GET /api/v1/connected-apps` item has `logoUri` = its logo; `GET /api/v1/oauth/consent/{id}` before Allow has no `logoUri` anywhere in its body | `api/test/mcp-logos.ac.e2e-spec.ts` | T1 |
| AC-9 | A DCR client without `logo_uri`, allowed → its item has `logoUri: null` | `api/test/mcp-logos.ac.e2e-spec.ts` | T1 |
| AC-10 | `AppMark` without `logoUri` (or `null`) → the letter, no `<img>` | `web/features/agents/components/app-mark.ac.test.tsx` | T2 |
| AC-11 | `AppMark` with `logoUri` → an `<img>` with that `src` and `referrerpolicy="no-referrer"`; the letter shows until the image's `load` event, and is gone after it | `web/features/agents/components/app-mark.ac.test.tsx` | T2 |
| AC-12 | `AppMark` with `logoUri` whose image fires `error` → the letter stays | `web/features/agents/components/app-mark.ac.test.tsx` | T2 |
| AC-13 | Connected apps with an item whose `logoUri` is set → its row renders an `<img>` with that `src`; an item with `logoUri: null` renders none | `web/features/agents/components/app-mark.ac.test.tsx` | T2 |
| AC-14 | No prototype `proposed-types` left, and the consent page never passes a logo | `check` | T2 |

Typed stubs (created with the tests, so lint and typecheck pass while the tests fail):
- `api/src/oauth/client-logo.ts`: `clientLogoUri` as in *Interfaces*, body `throw new Error("not implemented (feat-mcp-logos)")`.

## Checks

```bash
# AC-14: proposed types replaced; the consent page shows no logo
test ! -e web/proto/features/agents/proposed-types.ts
! grep -n "logoUri" web/features/agents/components/consent-page.tsx web/proto/features/agents/components/consent-page.tsx
```

## Tasks

| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Logo check, `logo_uri` on clients and grants (migration `0013`), register echo, `ConnectedApp.logoUri`, OpenAPI | api | S | haiku | Every step is spelled out in *Interfaces*; copies the `client_name` path | — |
| T2 | `api:types`, copy the prototype's `AppMark`, pass `logoUri` in Connected apps, prototype back to the schema type | web | S | haiku | A copy plus a one-line diff | T1 |

## Agents

| Step | Agent | Date |
| --- | --- | --- |
| Prototype | `claude-code/claude-opus-5-5` | 2026-11-21 |
| Spec | `claude-code/claude-opus-5-5` | 2026-11-21 |
| Tasks (`pm4 tasks`) | `claude-code/claude-sonnet-5-5` | 2026-11-21 |
| Acceptance tests | `claude-code/claude-sonnet-5-5` (api, web), checked by `claude-code/claude-opus-5-5` | 2026-11-21 |

## Open questions
None.

## Changelog
- 2026-11-21: Initial draft from prototype `c71d350` (OQ-314). Status `review`.
- 2026-11-21: Approved by the owner.
