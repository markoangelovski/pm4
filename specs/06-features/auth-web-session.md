---
id: feat-auth-web-session
title: "Auth web: sign-in, session restore, refresh and sign-out"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-03
milestone: M1
requirements: [FR-AUTH-001, FR-AUTH-003, FR-AUTH-004, FR-AUTH-005, FR-LAND-002, SCR-001, SCR-002, SCR-003]
related: [req-auth, req-landing, sec, web-routing, web-screens, web-conventions, web-static-export, feat-auth-api-session, feat-land-app-route-split, ADR-0007, ADR-0009, OQ-056, OQ-063, OQ-067, OQ-068, OQ-069, OQ-070]
---

# Auth web: sign-in, session restore, refresh and sign-out

## Goal
The web app signs the user in through the API's Google flow, keeps the session in the browser (refresh
token in `localStorage`, access token in memory), refreshes on `401`, protects every `/app/**` page,
and signs out. The landing page shows "Go to app" when signed in. Behavior: FR-AUTH-001/003/004/005 in
[auth.md](../01-requirements/auth.md), FR-LAND-002, SCR-001/002/003 in [screens.md](../04-web/screens.md),
[routing.md](../04-web/routing.md#auth-guard-and-returnto-oq-047), flow in
[security.md](../02-architecture/security.md#authentication-flow-adr-0007). API: feat-auth-api-session.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | Only a rejected refresh (`401`/`400`) ends the session; network errors, `5xx` and `429` keep it and show Retry. | OQ-067 (owner, 2026-10-02) |
| D2 | This feature enables the existing header dropdown's **Sign out** item. | OQ-068 (owner) |
| D3 | A sign-out in another tab ends the session in every `/app/**` tab at once (`storage` event). | OQ-069 (owner) |
| D4 | `/auth/sign-in` with a stored token forwards to a valid `returnTo`, else `/app`. | OQ-070 (owner) |
| D5 | Storage key: `localStorage["pm4.refreshToken"]`. "Signed in" = the key holds a value (FR-LAND-002). Every storage access is wrapped in `try/catch`; a throwing storage behaves as empty. | Agent |
| D6 | The access token lives in a module variable in `lib/auth/session.ts` (memory only, per tab, ADR-0007). It is reused until 30 s before `accessTokenExpiresAt`. | Agent: avoids a refresh per request |
| D7 | Refreshes are single-flight per tab (one shared promise) and serialized across tabs with `navigator.locks.request("pm4-auth-refresh", …)` when available. The stored token is read **inside** the lock, so a tab never sends a token another tab already rotated. | security.md step 8 |
| D8 | Auth endpoints are called through a second, unauthenticated openapi-fetch client created inside `session.ts`, so `client.ts` → `session.ts` has no import cycle. | Agent |
| D9 | `apiClient` gets a custom `fetch` (openapi-fetch's `fetch` option) that adds the bearer token, except for the public endpoints, and on `401` refreshes once and retries once. | conventions.md *Data layer* |
| D10 | Session end and sign-out clear the TanStack Query cache, so no data of the previous user stays in memory. | Agent: single-user-per-account |
| D11 | The guard wraps the **whole** shell: until the session is known, the page shows only a centered spinner (no sidebar flash). | Agent |
| D12 | The Google button reads `returnTo` from `window.location.search` on click, so it needs no `useSearchParams`/`<Suspense>`. | Agent: static-export rule |
| D13 | The callback exchanges each code at most once per page load (module-level map), so React Strict Mode's double effect doesn't burn it. | Agent: the code is single use (API-AUTH-003) |

## Scope
**In:** `lib/auth/token-store.ts`, `lib/auth/session.ts`, the authenticated `apiClient`, the generated
types; `AuthGuard` around the shell; the callback page; the sign-in page (Google button, error alert,
signed-in forward); `LandingCta`'s signed-in branch; `useSignOut` and the dropdown's Sign out item.

**Before the tests are written:** feat-auth-api-session is done (T-0017 exported `openapi.json`), and
T-0007…T-0009 are `done` (this feature rewrites `landing-cta.ac.test.tsx`, whose hash T-0009 holds).

**Non-goals** (implementers must not touch these):
- Anything in `api/`. The user drawer, `GET /me` hooks and the profile page (feat-shell-user-menu).
- "Sign out of all devices" UI (feat-shell-user-menu). The time-zone warning and settings (FR-AUTH-006).
- NFR-003 request timeouts, CSP, `next.config.ts`, `web/components/ui/*`.
- `lib/auth/return-to.ts` and its tests (reuse the helpers as they are). `lib/routes.ts`.
- The sidebar, header layout, footer, landing page markup outside `LandingCta`.

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/04-web/routing.md#auth-guard-and-returnto-oq-047` | Redirect rules |
| `specs/03-api/endpoints.md` (*Shared auth shapes*, API-AUTH-001…005) | Contract |
| `web/lib/auth/return-to.ts` | `sanitizeReturnTo`, `landingHref`, `postSignInPath`, `RETURN_TO_PARAM` |
| `web/lib/routes.ts` | Paths |
| `web/lib/api/client.ts`, `web/lib/api/schema.d.ts` | The client and generated `paths` |
| `web/app/components/shared/landing-cta.tsx` | Current CTA, `useSearchParams` + `<Suspense>` |
| `web/app/(dashboard-layout)/layout.tsx`, `web/app/(dashboard-layout)/layout/shared/header/profile.tsx` | Where the guard and Sign out go |
| `web/components/ui/spinner.tsx`, `web/components/ui/alert.tsx`, `web/components/ui/button.tsx` | UI primitives |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| web | `web/lib/auth/token-store.ac.test.ts` | C | tests | Acceptance tests |
| web | `web/lib/auth/session.ac.test.ts` | C | tests | Acceptance tests |
| web | `web/lib/api/client.ac.test.ts` | C | tests | Acceptance tests |
| web | `web/features/auth/components/auth-guard.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/features/auth/components/auth-callback.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/features/auth/components/sign-in-state.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/app/auth/authforms/social-buttons.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/features/auth/use-sign-out.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/app/components/shared/landing-cta.ac.test.tsx` | M | tests | AC-7 narrowed, signed-in cases added |
| web | `web/lib/auth/token-store.ts` | C | T1 | Stub from the test writer |
| web | `web/lib/auth/session.ts` | C | T1 | Stub from the test writer |
| web | `web/lib/api/client.ts` | M | T1 | `authFetch` |
| web | `web/lib/api/schema.d.ts` | M | T1 | `npm run api:types` (generated) |
| web | `web/features/auth/components/auth-guard.tsx` | C | T2 | Stub from the test writer |
| web | `web/features/auth/components/auth-callback.tsx` | C | T2 | Stub from the test writer |
| web | `web/features/auth/components/sign-in-state.tsx` | C | T2 | Stub from the test writer |
| web | `web/features/auth/use-sign-out.ts` | C | T2 | Stub from the test writer |
| web | `web/app/(dashboard-layout)/layout.tsx` | M | T2 | Wrap in `AuthGuard`; drop the `TODO(M1)` |
| web | `web/app/auth/callback/page.tsx` | M | T2 | Render `AuthCallback` in `<Suspense>` |
| web | `web/app/auth/sign-in/page.tsx` | M | T2 | Add `SignInState` in `<Suspense>` |
| web | `web/app/auth/authforms/social-buttons.tsx` | M | T2 | Start the Google flow |
| web | `web/app/components/shared/landing-cta.tsx` | M | T2 | Signed-in branch |
| web | `web/app/(dashboard-layout)/layout/shared/header/profile.tsx` | M | T2 | Enable Sign out |
| web | `web/lib/auth/session.test.ts` | C | T1 | Review fix: sign-out vs. late refresh race (ordinary test) |
| web | `web/features/auth/components/auth-guard.test.tsx` | C | T2 | Review fix: unexpected errors reach the error boundary (ordinary test) |
| web | `web/AGENTS.md` | M | review | Main session: structure list and the shell's `AuthGuard` |
|  | `specs/06-features/auth-web-session.md` | M | review | Main session: refresh paragraph (review findings 1, 3) |

## Interfaces

### Token store (T1)
```ts
// web/lib/auth/token-store.ts
export const REFRESH_TOKEN_KEY = "pm4.refreshToken";
export function getRefreshToken(): string | null;      // null when absent, empty or storage throws
export function setRefreshToken(token: string): void;  // never throws
export function clearRefreshToken(): void;             // never throws
/** Calls `listener` on local set/clear and on `storage` events for the key (other tabs). Returns an unsubscribe. */
export function subscribe(listener: () => void): () => void;
/** Only `storage` events from other tabs where the key's new value is null (D3). Returns an unsubscribe. */
export function onRemovedElsewhere(listener: () => void): () => void;
/** true/false on the client; null during prerender and hydration (useSyncExternalStore server snapshot). */
export function useHasStoredSession(): boolean | null;
```

### Session (T1)
```ts
// web/lib/auth/session.ts
export class SessionUnavailableError extends Error {}   // the API couldn't be reached (D1)

/** A valid access token: the cached one (D6) or a fresh refresh. null = no session (no stored token, or the refresh was rejected). */
export function getAccessToken(): Promise<string | null>;  // throws SessionUnavailableError
/** Always refreshes (single-flight, D7). Same results as getAccessToken. */
export function refreshAccessToken(): Promise<string | null>;
/** API-AUTH-003. Stores the refresh token and caches the access token. Throws on any failure (nothing stored). */
export function exchangeLoginCode(code: string): Promise<void>;
/** API-AUTH-005 with the stored token (errors ignored), then clears the stored and cached tokens. Never throws. */
export function signOut(): Promise<void>;
/** Called when a session ends without a user sign-out: a rejected refresh, or removal by another tab (D3). */
export function onSessionEnded(listener: () => void): () => void;
/** `${NEXT_PUBLIC_API_BASE_URL}/api/v1/auth/google` with `returnTo` (only if sanitizeReturnTo accepts it) then `timeZone` (the browser zone), URLSearchParams-encoded. */
export function googleSignInUrl(returnTo: string | null): string;
/** Test helper: resets the cached token, the in-flight promise and the code map. */
export function resetSessionForTests(): void;
```
Refresh, inside the lock: `token = getRefreshToken()`; `null` → return `null`, no request. `POST /api/v1/auth/refresh`:
`200` → `setRefreshToken`, cache `{accessToken, expiresAt}`, return it; `401`/`400` → `clearRefreshToken()`,
drop the cache, notify `onSessionEnded`, return `null`; a thrown fetch, `5xx`, `429` or any other status → throw
`SessionUnavailableError`, keep everything. A `200` that arrives after the session ended (sign-out, rejected refresh,
removal elsewhere) stores nothing and returns `null`. At import, subscribe to `onRemovedElsewhere`: drop the cache and notify `onSessionEnded`.

### API client (T1)
```ts
// web/lib/api/client.ts
export const PUBLIC_API_PATHS: readonly string[] = [
  "/api/v1/version", "/api/v1/auth/google", "/api/v1/auth/google/callback",
  "/api/v1/auth/token", "/api/v1/auth/refresh", "/api/v1/auth/logout",
];
export async function authFetch(request: Request): Promise<Response>;
export const apiClient = createClient<paths>({ baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL, fetch: authFetch });
```
`authFetch`: a public path (exact `URL.pathname` match) → `fetch(request)` unchanged. Otherwise keep
`request.clone()` for a retry, `getAccessToken()` (a `SessionUnavailableError` propagates), set
`Authorization: Bearer <token>` when there is one, and send. Not `401` → return it. `401` →
`refreshAccessToken()`; `null` → return the `401`; a token → send the clone once with it and return that
response, whatever it is. Run `npm run api:types` first, so the auth paths exist in `paths`.

### Components and hooks (T2)
```tsx
// web/features/auth/components/auth-guard.tsx ("use client")
export function AuthGuard({ children }: { children: React.ReactNode }): React.JSX.Element;
```
- State `checking` → `<div role="status" aria-label="Loading" className="flex min-h-screen items-center justify-center"><Spinner className="size-8" /></div>`, children not rendered.
- On mount (and on Retry): `getAccessToken()`. Token → `ready` (render children). `null` → `clearRefreshToken()`,
  `queryClient.clear()`, `router.replace(landingHref(window.location.pathname + window.location.search))`.
  `SessionUnavailableError` → `unavailable`: `<p>Can't reach PM4 right now.</p>` and `<Button>Retry</Button>` (back to `checking`).
- While mounted, `onSessionEnded` → `queryClient.clear()` and the same `router.replace(landingHref(…))`.
- `layout.tsx`: `<AuthGuard>` wraps the whole `<SidebarProvider>…</SidebarProvider>`.

```tsx
// web/features/auth/components/auth-callback.tsx ("use client"; page.tsx renders it in <Suspense> with the current spinner markup as fallback)
export function AuthCallback(): React.JSX.Element; // the spinner + "Signing in…" markup the page has today
```
- `code = useSearchParams().get("code")`, `returnTo = …get(RETURN_TO_PARAM)`. No code → failure.
- `exchangeLoginCode(code)` once per code (D13) → `router.replace(postSignInPath(returnTo))`.
- Failure → `router.replace` to `routes.signIn` + `?error=failed`, plus `&returnTo=<sanitized>` when valid (URLSearchParams).

```tsx
// web/features/auth/components/sign-in-state.tsx ("use client"; sign-in page.tsx renders it in <Suspense fallback={null}> between the heading and SocialButtons)
export function SignInState(): React.JSX.Element | null;
export function signInErrorMessage(error: string | null): string | null;
```
- `signInErrorMessage`: `null` → `null`; `"cancelled"` → `"Sign-in was cancelled."`; `"not-allowed"` →
  `"This account isn't allowed to use PM4. Continue with Google to choose a different account."`; anything else → `"Sign-in failed. Please try again."`.
- Renders `<Alert variant="destructive"><AlertDescription>{message}</AlertDescription></Alert>` when there's a message, else `null`.
- Effect: `getRefreshToken()` → `router.replace(postSignInPath(returnTo))` (D4).

`social-buttons.tsx`: `onClick={() => window.location.assign(googleSignInUrl(new URLSearchParams(window.location.search).get(RETURN_TO_PARAM)))}`.
The page keeps its `PM4` link to `/` (`app/links.ac.test.tsx`).

```ts
// web/features/auth/use-sign-out.ts
export function useSignOut(): () => Promise<void>; // await signOut(); queryClient.clear(); router.replace(routes.signIn)
```
`profile.tsx`: the Sign out item loses `disabled` and gets `onClick={() => void signOut()}` with `const signOut = useSignOut()`.

`landing-cta.tsx` (`LandingCta`): `const signedIn = useHasStoredSession()`. `null` → render
`<LandingCtaFallback variant={variant} size={size} />`; `true` → the same link as Login, as
`<Link href={postSignInPath(raw)} className={buttonVariants({ variant, size })}>` (no `Button`; web-conventions, links styled as buttons) and the label **Go to app**; `false` → today's Login.

## Acceptance criteria
| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | Token store: set/get/clear use `pm4.refreshToken`; empty value → `null`; a throwing `localStorage` → `get` returns `null`, `set`/`clear` don't throw | `web/lib/auth/token-store.ac.test.ts` | T1 |
| AC-2 | `subscribe` fires on local set/clear and on a `storage` event for the key, not for other keys; `onRemovedElsewhere` fires only for a `storage` event with `newValue: null` | `web/lib/auth/token-store.ac.test.ts` | T1 |
| AC-3 | `getAccessToken()` with no stored token → `null`, no request | `web/lib/auth/session.ac.test.ts` | T1 |
| AC-4 | Stored `R1`: refresh `200` → `POST …/api/v1/auth/refresh` with `{ refreshToken: "R1" }`; stored token is now `R2`; returns the access token; a second call before expiry − 30 s makes no request; after it, refreshes again | `web/lib/auth/session.ac.test.ts` | T1 |
| AC-5 | Three concurrent `getAccessToken()` calls → one refresh request; with `navigator.locks` present, it runs inside `request("pm4-auth-refresh", …)` and reads the stored token inside the callback | `web/lib/auth/session.ac.test.ts` | T1 |
| AC-6 | Refresh `401` and `400` → `null`, stored token removed, `onSessionEnded` called once; fetch rejects, `500`, `429` → `SessionUnavailableError`, stored token kept, listener not called | `web/lib/auth/session.ac.test.ts` | T1 |
| AC-7 | `LandingCta` (FR-LAND-002): no `fetch` call; `localStorage.getItem` is called only with `pm4.refreshToken` (feat-land-app-route-split AC-7, narrowed) | `web/app/components/shared/landing-cta.ac.test.tsx` | T2 |
| AC-8 | `exchangeLoginCode("c")`: `POST …/auth/token {code: "c"}` `200` → refresh token stored, next `getAccessToken()` makes no request; `401` → throws, nothing stored | `web/lib/auth/session.ac.test.ts` | T1 |
| AC-9 | `signOut()`: `POST …/auth/logout` with the stored token, then token removed; logout rejecting or `500` → token still removed, no throw; no stored token → no request | `web/lib/auth/session.ac.test.ts` | T1 |
| AC-10 | A `storage` event removing the key → `onSessionEnded` called and the cached token dropped (next `getAccessToken()` → `null`) | `web/lib/auth/session.ac.test.ts` | T1 |
| AC-11 | `googleSignInUrl("/app/projects")` with zone `Europe/Zagreb` → `<API>/api/v1/auth/google?returnTo=%2Fapp%2Fprojects&timeZone=Europe%2FZagreb`; `"/home"`, `"https://evil.example"`, `null` → no `returnTo` | `web/lib/auth/session.ac.test.ts` | T1 |
| AC-12 | `authFetch`: `/api/v1/me` gets `Authorization: Bearer <token>`; `/api/v1/version` and the auth public paths get none and trigger no refresh; `/api/v1/auth/logout-all` gets the token | `web/lib/api/client.ac.test.ts` | T1 |
| AC-13 | `authFetch` `401` → one refresh, one retry with the new token and the same method and body; a second `401` → returned, no more refreshes; refresh rejected → the first `401` returned, no retry | `web/lib/api/client.ac.test.ts` | T1 |
| AC-14 | `AuthGuard`: while checking → `role="status"`, children absent; token → children; no session (path `/app/tasks?x=1`) → token cleared, `router.replace("/?returnTo=%2Fapp%2Ftasks%3Fx%3D1")`, children absent; path `/app` → `router.replace("/")` | `web/features/auth/components/auth-guard.ac.test.tsx` | T2 |
| AC-15 | `AuthGuard` with `SessionUnavailableError` → "Can't reach PM4 right now." and Retry, token kept; Retry → children once `getAccessToken` resolves | `web/features/auth/components/auth-guard.ac.test.tsx` | T2 |
| AC-16 | `AuthGuard` ready, then `onSessionEnded` fires → query cache cleared, `router.replace(landingHref(current path))` | `web/features/auth/components/auth-guard.ac.test.tsx` | T2 |
| AC-17 | `AuthCallback`: `?code=c&returnTo=%2Fapp%2Fprojects` → `exchangeLoginCode("c")` once even when rendered twice (Strict Mode) → `router.replace("/app/projects")`; invalid `returnTo` → `/app`; no code → `/auth/sign-in?error=failed`; exchange fails with valid `returnTo` → `/auth/sign-in?error=failed&returnTo=%2Fapp%2Fprojects` | `web/features/auth/components/auth-callback.ac.test.tsx` | T2 |
| AC-18 | `signInErrorMessage` for `null`, `cancelled`, `not-allowed`, `whatever`; `SignInState` shows the alert text, none without `error` | `web/features/auth/components/sign-in-state.ac.test.tsx` | T2 |
| AC-19 | `SignInState` with a stored token → `router.replace` with a valid `returnTo` (`/app/projects`), else `/app`; no stored token → no `replace` | `web/features/auth/components/sign-in-state.ac.test.tsx` | T2 |
| AC-20 | Google button: on `/auth/sign-in?returnTo=%2Fapp%2Fprojects`, a click calls `window.location.assign(googleSignInUrl("/app/projects"))` | `web/app/auth/authforms/social-buttons.ac.test.tsx` | T2 |
| AC-21 | `LandingCta` with a stored token → link **Go to app**: no `returnTo` → `/app`; `%2Fapp%2Fprojects` → `/app/projects`; `%2Fhome` → `/app`. Without one → Login (AC-6 unchanged) | `web/app/components/shared/landing-cta.ac.test.tsx` | T2 |
| AC-22 | `useSignOut()` → `signOut()` called, query cache cleared, then `router.replace("/auth/sign-in")` | `web/features/auth/use-sign-out.ac.test.tsx` | T2 |
| AC-23 | Built site against the local API (`npx serve out` + `npm run start:dev`): `/app/projects` signed out → `/?returnTo=…` → Login → Google → back on `/app/projects`; reload stays signed in; a second tab shares the session; Sign out → `/auth/sign-in`, and the other tab goes to `/?returnTo=…`; landing shows "Go to app" when signed in; stopping the API → reload shows Retry | `manual` | T2 |

Typed stubs (created with the tests, so lint and typecheck pass while the tests fail):
- `token-store.ts` (`REFRESH_TOKEN_KEY` real), `session.ts` (`SessionUnavailableError` real), `auth-guard.tsx`,
  `auth-callback.tsx`, `sign-in-state.tsx`, `use-sign-out.ts`: the signatures from *Interfaces*, each body
  `throw new Error("not implemented (feat-auth-web-session)")`.
- `client.ts`: `PUBLIC_API_PATHS` real; `authFetch` exported, throwing the same error; `apiClient` unchanged until T1.

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Token storage, session refresh and the authenticated API client | web | M | opus | Auth tokens, cross-tab locking and single-flight refresh: concurrency and security logic, first instance | — |
| T2 | Auth guard, sign-in, callback, landing "Go to app" and sign-out | web | M | sonnet | Composes T1's functions into components over ~8 files; every behavior and string is given | T1 |

## Open questions
None. OQ-063 and OQ-067…OQ-070 are resolved.

## Changelog
- 2026-10-02: Initial draft (OQ-067…OQ-070).
- 2026-10-03: Approved by the owner.
- 2026-10-03: `not-allowed` message gets a hint to choose another account (OQ-075). Back to `review`.
- 2026-10-03: Approved by the owner.
- 2026-10-03: "Go to app" is a `<Link>` styled with `buttonVariants`, not a `Button` with a `Link` `render` (web-conventions, links styled as buttons).
- 2026-10-03: Review fixes: refresh paragraph covers any other status and a `200` after the session ended; Files table lists the two review-fix tests and `web/AGENTS.md`.
