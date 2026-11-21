---
id: feat-mcp-web
title: "Agent access: the consent page and Settings → Connected apps (web)"
status: approved
owner: Marko Angelovski
last_updated: 2026-11-21
milestone: M9
requirements: [FR-MCP-003, FR-MCP-004, FR-MCP-005, FR-MCP-009, SCR-054, SCR-090]
related: [req-agents, web-screens, web-routing, web-conventions, web-prototype, feat-mcp-oauth-api, feat-acct-web, ADR-0013, OQ-292, OQ-298, OQ-299, OQ-300, OQ-305, OQ-311, OQ-312, OQ-313]
prototype: 3fc62290d053a9c473a487d0a451a22a6b2fda2c
---

# Agent access: the consent page and Settings → Connected apps (web)

## Goal
An app sent to PM4 by `/oauth/authorize` lands on the consent page (SCR-090, FR-MCP-005): the user signs in if needed,
sees who is asking and what it may do, and allows or denies; untrusted requests end on an error page (FR-MCP-003/004).
In Settings → Connected apps (SCR-054, FR-MCP-009) the user copies the MCP server address, sees their grants (last used,
**Expired — reconnect from the app**) and revokes them. The UI is prototype `05db575` + `3fc6229`; this spec lists only
the delta. The API is live (feat-mcp-oauth-api).

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | `proto/features/agents/proposed-types.ts` is deleted: the prototype takes the shapes from `lib/api/schema` (already generated), the mock client drops `ProposedPaths`, and `scopes.ts` / `consent-page.tsx` define the two small types they used | prototype.md (*Mock data layer*), as feat-acct-web D3 |
| D2 | Existing production files take their prototype change by the twin copy: `sed -e 's#@/proto/mock/client#@/lib/api/client#' -e 's#@/proto/#@/#g' web/proto/<f> > web/<f>`, then Prettier (`npx prettier --write <f>` in `web/`). New files are `P` rows | As feat-acct-web D4 |
| D3 | `returnTo` accepts `/auth/consent` (with its query) besides `/app/**`; the consent page's signed-out visitor goes straight to `/auth/sign-in?returnTo=<the page>`, not the landing page | OQ-298 (owner, 2026-11-21) · Owner, prototype `05db575` (`MockConsentGate`) |
| D4 | One guard: `AuthGuard` gets an optional `signedOutHref` (default `landingHref`), the consent route passes `signInHref`. No second guard component | Agent |
| D5 | `?error=…`, or no `request`, shows the error page without a session | OQ-298 (owner, 2026-11-21) |
| D6 | Allow / Deny answering `404` shows the "This request isn't valid" page (no toast), in the prototype too | OQ-311 (owner, 2026-11-21) |
| D7 | The consent route mounts `RateLimitNotifier` (the `429` toast) | OQ-312 (owner, 2026-11-21) |
| D8 | The MCP server address is `${NEXT_PUBLIC_API_BASE_URL}/mcp` as prototyped (the API's `API_PUBLIC_URL` is the same origin in every environment) | Owner, prototype `05db575` (OQ-300) |
| D9 | Layout, copy and behaviour of both screens (expiry timer, Use another account, revoke dialog, empty / error states) are as prototyped | Owner, prototypes `05db575`, `3fc6229` |
| D10 | The Documentation page's tabs aren't updated for MCP | OQ-313 (owner, 2026-11-21) |

## Scope
**In:** `/auth/consent` (route, guard, page), `routes.consent`, the `returnTo` rule, `AuthGuard`'s `signedOutHref`, the
sign-in page on the shared `AuthFrame`, `features/agents/**`, the Connected apps settings tab, D1, D6 in the prototype.

**Non-goals** (implementers must not touch these):
- `api/**`, `web/lib/api/schema.d.ts` (already current), `web/lib/api/client.ts`, `web/lib/auth/session.ts`.
- The Documentation page (D10), the landing page, the profile's Sign out of all devices.
- The prototype's `app/proto/**` pages and `mock/**` beyond D1. Any `*.ac.test.ts(x)` file.

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/04-web/screens.md` (SCR-054, SCR-090), `specs/04-web/routing.md#auth-guard-and-returnto-oq-047` | Screens and the `returnTo` rule |
| `web/proto/features/agents/api.ts` | The mock hooks; production `features/agents/api.ts` is its twin (T1) |
| `web/proto/features/agents/proposed-types.ts` | What D1 replaces with `components["schemas"][…]` (T1) |
| `web/lib/auth/return-to.ts`, `web/features/auth/components/auth-guard.tsx` | D3, D4 (T1) |
| `web/proto/mock/shell/mock-consent.tsx` (`MockConsentGate`) | The guard behaviour `ConsentRoute` replaces (T2) |
| `web/app/auth/sign-in/page.tsx`, `web/app/proto/auth/consent/page.dev.tsx` | The page to copy for `app/auth/consent/page.tsx` (T2) |
| `web/features/settings/components/settings-view.tsx` | The tab list (T3) |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| web | `web/lib/auth/return-to-consent.ac.test.ts` | C | tests | AC-1, AC-2 |
| web | `web/features/auth/components/auth-guard-consent.ac.test.tsx` | C | tests | AC-3 |
| web | `web/features/agents/api.ac.test.tsx` | C | tests | AC-4…AC-6 |
| web | `web/features/agents/components/consent-page.ac.test.tsx` | C | tests | AC-7…AC-13 |
| web | `web/features/agents/components/consent-route.ac.test.tsx` | C | tests | AC-14, AC-15 |
| web | `web/features/agents/components/connected-apps-settings.ac.test.tsx` | C | tests | AC-16…AC-19 |
| web | `web/features/settings/components/settings-view.ac.test.tsx` | C | tests | AC-20 |
| web | `web/lib/routes.ts` | M | tests | `consent: "/auth/consent"` after `authCallback` (the tests build URLs from it) |
| web | `web/features/auth/components/auth-guard.tsx` | M | tests, T1 | Test step: the optional prop in the type only; T1: D4 |
| web | `web/lib/auth/return-to.ts` | M | T1 | D3 |
| web | `web/proto/features/agents/api.ts`, `web/proto/features/agents/scopes.ts` | M | T1 | D1 (their part) |
| web | `web/proto/features/agents/components/consent-page.tsx`, `web/proto/mock/client.ts`, `web/proto/mock/seed.ts` | M | T2 | D1 (the rest), D6 |
| web | `web/proto/features/agents/proposed-types.ts` | D | T2 | `rm` (D1) |
| web | `web/features/agents/api.ts` | C | tests, T1 | Stub in the test step; T1 = twin copy (D2) |
| web | `web/features/agents/scopes.ts` | C | T1 | Twin copy (D2) after D1 |
| web | `proto/features/agents/components/app-mark.tsx` → `features/agents/components/app-mark.tsx` | P | T1 | |
| web | `proto/features/auth/components/auth-frame.tsx` → `features/auth/components/auth-frame.tsx` | P | T2 | |
| web | `web/features/auth/components/sign-in-page.tsx` | M | T2 | Twin copy (D2): now uses `AuthFrame` |
| web | `proto/features/agents/components/consent-page.tsx` → `features/agents/components/consent-page.tsx` | P | tests, T2 | Stub in the test step (`pm4 promote` then skips it); T2 = twin copy (D2) after D6 |
| web | `web/features/agents/components/consent-route.tsx` | C | tests, T2 | Stub in the test step; no prototype twin |
| web | `web/app/auth/consent/page.tsx` | C | tests, T2 | Stub in the test step (AC-15 imports it); T2: *Consent route* |
| web | `proto/features/agents/components/mcp-server-url.tsx` → `features/agents/components/mcp-server-url.tsx` | P | T3 | |
| web | `proto/features/agents/components/connected-apps-settings.tsx` → `features/agents/components/connected-apps-settings.tsx` | P | tests, T3 | Stub in the test step; T3 = twin copy (D2) |
| web | `web/features/settings/components/settings-view.tsx` | M | T3 | Twin copy (D2) |

## Interfaces

### Routes and `returnTo` (T1)
- `lib/routes.ts` (done in the test step): `consent: "/auth/consent"` after `authCallback`.
- `lib/auth/return-to.ts`, `sanitizeReturnTo`: steps 1–5 unchanged; steps 6–7 become (normalize first, then check):
  ```ts
  // 6. No trailing slashes; the hash is dropped.
  const path = url.pathname.replace(/\/+$/, "");
  // 7. A private route, or the consent page (OQ-298), checked after parsing so dot segments are normalized.
  if (path !== routes.app.dashboard && !path.startsWith(APP_PREFIX) && path !== routes.consent) return null;
  return path + url.search;
  ```
  `landingHref`, `signInHref`, `postSignInPath` are unchanged (they all go through `sanitizeReturnTo`).

### `AuthGuard` (tests, T1)
```ts
export function AuthGuard({ children, signedOutHref = landingHref }: {
  children: React.ReactNode;
  /** Where a signed-out visitor goes, from `window.location.pathname + search` (default: the landing page). */
  signedOutHref?: (currentPathAndQuery: string) => string;
}): React.JSX.Element;
```
Both redirects (no session at restore, and `onSessionEnded`) call `router.replace(signedOutHref(window.location.pathname + window.location.search))`;
add `signedOutHref` to both effects' dependency arrays. Nothing else changes. The test step adds the prop to the type only.

### Types and hooks (T1)
1. D1, T1's part (in the prototype): in `proto/features/agents/api.ts` replace the `./proposed-types` import with
   `import type { components } from "@/lib/api/schema";` and
   `ConsentRequest = components["schemas"]["ConsentRequestDto"]`, `ConsentResult = …["ConsentResultDto"]`,
   `ConnectedApp = …["ConnectedAppDto"]`. `scopes.ts`: `import type { components } from "@/lib/api/schema";`
   `export type OAuthScope = components["schemas"]["ConnectedAppDto"]["scopes"][number];`. `proposed-types.ts` stays
   until T2 (the consent page and the mock still import it; T1 leaves the consent-page pair untouched for the twin check).
2. Twin copy (D2) of `features/agents/api.ts` and `features/agents/scopes.ts`. The hooks are then (names, keys and
   invalidations as the mock):
   ```ts
   agentKeys = { all: ["agents"], consent: (id) => ["agents","consent",id], connectedApps: () => ["agents","connected-apps"] };
   useConsentRequest(requestId: string): UseQueryResult<ConsentRequest, Error>;  // GET /api/v1/oauth/consent/{requestId}
   useAllowConsent(): UseMutationResult<ConsentResult, Error, string>;           // POST …/allow; onSuccess invalidates connectedApps()
   useDenyConsent(): UseMutationResult<ConsentResult, Error, string>;            // POST …/deny; no invalidation
   useConnectedApps(): UseQueryResult<ConnectedApp[], Error>;                    // GET /api/v1/connected-apps → .items
   useRevokeConnectedApp(): UseMutationResult<void, Error, string>;              // DELETE /api/v1/connected-apps/{id}; onSettled invalidates connectedApps()
   ```
   Errors are `unwrap` / `unwrapVoid`'s `ApiError` (`isApiError(e, 404 | 410)`); mutations don't retry (default).

### Consent page and route (T2)
- **D1, the rest** (in the prototype): `components/consent-page.tsx`: drop the `../proposed-types` import, add
  `type ConsentErrorCode = "invalid_client" | "invalid_redirect_uri";` below the imports. `mock/seed.ts`:
  `type ConnectedAppDto = components["schemas"]["ConnectedAppDto"];` and likewise `ConsentRequestDto` (instead of the
  import). `mock/client.ts`: drop the `ProposedPaths` import, `createClient<paths>`. Then
  `rm proto/features/agents/proposed-types.ts`; `npm run typecheck` must pass.
- **D6** in `proto/features/agents/components/consent-page.tsx` (then the twin copy, D2, over the test step's stub):
  `ConsentRequestView` gets `const [invalid, setInvalid] = useState(false);`, returns `<ConsentError code={null} />` first
  when `invalid`, and passes `onInvalid={() => setInvalid(true)}` to `ConsentForm` (prop `onInvalid: () => void`). In
  `answer`'s `onError`: `if (isApiError(e, 410)) onExpired(); else if (isApiError(e, 404)) onInvalid(); else toastError(…)`.
- `features/agents/components/consent-route.tsx`:
  ```tsx
  "use client";
  /** D3, D5: `?request=` without `?error=` needs a session (signed out → sign-in, back here); the error page doesn't. Render inside <Suspense>. */
  export function ConsentRoute({ children }: { children: React.ReactNode }): React.JSX.Element {
    const params = useSearchParams();
    if (params.get("error") !== null || !params.get("request")) return <>{children}</>;
    return <AuthGuard signedOutHref={signInHref}>{children}</AuthGuard>;
  }
  ```
- `app/auth/consent/page.tsx` (*Consent route*), outside `(dashboard-layout)`:
  ```tsx
  export const metadata: Metadata = { title: "Connect an app" };
  /** The consent page (SCR-090, FR-MCP-005): `?request=<id>` or `?error=`. */
  export default function ConsentRoutePage() {
    return (
      <Suspense fallback={null}>
        <ConsentRoute><AuthFrame><ConsentPage /></AuthFrame></ConsentRoute>
        <RateLimitNotifier />
      </Suspense>
    );
  }
  ```
- `features/auth/components/sign-in-page.tsx`: twin copy (D2) of the prototype, which renders inside `AuthFrame`
  (`git diff 39be2bd 3fc6229 -- web/proto/features/auth/components/sign-in-page.tsx` shows the change). The rendered page is unchanged.

### Connected apps tab (T3)
Promote `mcp-server-url.tsx`; twin copy (D2) of `connected-apps-settings.tsx` over the stub and of `settings-view.tsx`
(adds the `connected-apps` tab, `Bot` icon, after `integrations`). No other change.

## Acceptance criteria
| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | D3: `sanitizeReturnTo("/auth/consent?request=abc")` → itself; `"/auth/consent/?request=abc"` → `"/auth/consent?request=abc"`; `"/auth/consent#x"` → `"/auth/consent"`; `null` for `/auth/consent/x`, `/auth/consentx?request=a`, `/auth/sign-in`, `/auth/callback`, `//auth/consent`, `https://evil.example/auth/consent`; `/app/projects?q=a` → itself | `web/lib/auth/return-to-consent.ac.test.ts` | T1 |
| AC-2 | `signInHref("/auth/consent?request=abc")` → `/auth/sign-in?returnTo=%2Fauth%2Fconsent%3Frequest%3Dabc`; `postSignInPath` of it → `/auth/consent?request=abc`; `googleSignInUrl` of it carries `returnTo=/auth/consent?request=abc` | `web/lib/auth/return-to-consent.ac.test.ts` | T1 |
| AC-3 | D4: `<AuthGuard signedOutHref={signInHref}>` at `/auth/consent?request=abc` without a session → `replace("/auth/sign-in?returnTo=%2Fauth%2Fconsent%3Frequest%3Dabc")`, children not rendered; with a session, children render, and a session-ended event then → the same `replace`. Without the prop at `/app/projects` → `replace("/?returnTo=%2Fapp%2Fprojects")` | `web/features/auth/components/auth-guard-consent.ac.test.tsx` | T1 |
| AC-4 | `useConsentRequest("abc")` → one `GET /api/v1/oauth/consent/{requestId}` with `requestId` `abc`, data = the body; a `404` → error with `isApiError(e, 404)` | `web/features/agents/api.ac.test.tsx` | T1 |
| AC-5 | `useAllowConsent().mutate("abc")` → one `POST …/{requestId}/allow`, resolves `{ redirectUrl }`, invalidates `["agents","connected-apps"]`; `useDenyConsent` → `POST …/deny`, invalidates nothing; a `410` → error `isApiError(e, 410)`, one request | `web/features/agents/api.ac.test.tsx` | T1 |
| AC-6 | `useConnectedApps()` → `GET /api/v1/connected-apps`, data = `items`; `useRevokeConnectedApp().mutate("g1")` → `DELETE /api/v1/connected-apps/{id}` with `g1`, resolves on `204`, invalidates the list after success and after a `404` | `web/features/agents/api.ac.test.tsx` | T1 |
| AC-7 | D5: `?error=invalid_client` → heading "PM4 couldn't verify this app"; `?error=invalid_redirect_uri` → "This app asked to return somewhere it isn't allowed to"; `?error=other`, and no params → "This request isn't valid"; none calls the API; each has **Open PM4** → `/app` | `web/features/agents/components/consent-page.ac.test.tsx` | T2 |
| AC-8 | `?request=abc`, the GET answers `404` → "This request isn't valid" | `web/features/agents/components/consent-page.ac.test.tsx` | T2 |
| AC-9 | FR-MCP-005: request `{client:{name:"Claude Code", clientIdHost:"claude.ai"}, redirectHost:"127.0.0.1:40000", loopback:true, scopes:["pm4:read","pm4:write"], existingGrant:{connectedAt:"2026-11-01T10:00:00Z"}, expiresAt: now+10 min}` and `useMe` (name, email, `Europe/Zagreb`) → heading "Allow Claude Code to use your PM4 account?", the name and email, `claude.ai`, `127.0.0.1:40000`, "This app runs on this computer", "Already connected since" + `formatDate(connectedAt, "Europe/Zagreb")`, both `SCOPE_TEXT` lines and "It can't delete anything."; with `loopback:false, existingGrant:null, scopes:["pm4:read"]` → no warning, no "Already connected", only the read line | `web/features/agents/components/consent-page.ac.test.tsx` | T2 |
| AC-10 | **Allow** → one allow mutation with `abc`; on success `window.location.assign(redirectUrl)`, both buttons disabled and "Returning you to Claude Code…"; **Deny** → the deny mutation, then `assign` of its `redirectUrl` | `web/features/agents/components/consent-page.ac.test.tsx` | T2 |
| AC-11 | `expiresAt` in the past → "This request has expired", no **Allow**; **Allow** answering `410` → the same view | `web/features/agents/components/consent-page.ac.test.tsx` | T2 |
| AC-12 | D6: **Allow** answering `404` → "This request isn't valid", no toast; `500` → toast "Couldn't send your answer. Try again.", the form stays; `429` → no such toast | `web/features/agents/components/consent-page.ac.test.tsx` | T2 |
| AC-13 | OQ-299: **Use another account** → `lib/auth/session` `signOut`, then `replace("/auth/sign-in?returnTo=%2Fauth%2Fconsent%3Frequest%3Dabc")` | `web/features/agents/components/consent-page.ac.test.tsx` | T2 |
| AC-14 | D5: `ConsentRoute` at `?error=invalid_client` renders its children without a session check (`getAccessToken` not called); at `?request=abc` signed out → `replace("/auth/sign-in?returnTo=%2Fauth%2Fconsent%3Frequest%3Dabc")`, children not rendered; signed in → children | `web/features/agents/components/consent-route.ac.test.tsx` | T2 |
| AC-15 | D7: the page `app/auth/consent/page.tsx` at `?request=abc` (signed in), the GET answers `429` with `retryAfterSeconds: 30` → toast "Too many requests. Try again in 30 seconds." | `web/features/agents/components/consent-route.ac.test.tsx` | T2 |
| AC-16 | FR-MCP-009: two apps in the API's order, each with name, **Read and write** / **Read only**, `clientIdHost`, "Connected " + `formatShortDate`; `lastUsedAt` set → "Last used … ago"; `null` → "Not used yet"; `expired:true` → "Expired — reconnect from the app" and no "Last used" | `web/features/agents/components/connected-apps-settings.ac.test.tsx` | T3 |
| AC-17 | No apps → "No connected apps"; load error → "Couldn't load your connected apps." and **Retry** refetches; the MCP server address shows in all three states | `web/features/agents/components/connected-apps-settings.ac.test.tsx` | T3 |
| AC-18 | OQ-300: the address field's value is `${NEXT_PUBLIC_API_BASE_URL}/mcp`; **Copy** → `navigator.clipboard.writeText` of it and the button reads "Copied"; a rejected write → toast "Couldn't copy to the clipboard." | `web/features/agents/components/connected-apps-settings.ac.test.tsx` | T3 |
| AC-19 | **Revoke** → dialog "Revoke Claude Code?"; its **Revoke** → the revoke mutation with the id, toast "Claude Code disconnected", dialog closed; a failure → toast "Couldn't revoke the app.", the dialog stays; **Cancel** → no mutation | `web/features/agents/components/connected-apps-settings.ac.test.tsx` | T3 |
| AC-20 | OQ-292: `SettingsView` lists the tabs User settings, Integrations, Connected apps in that order; `?tab=connected-apps` selects the last and shows the "Connected apps" card | `web/features/settings/components/settings-view.ac.test.tsx` | T3 |
| AC-21 | The build has the consent page and no prototype trace; the proposed types are gone | check | T2 |

Typed stubs (created with the tests, so lint and typecheck pass while the tests fail), each body
`throw new Error("not implemented (feat-mcp-web)")`:
- `web/features/agents/api.ts`: `agentKeys` (as *Types and hooks*) and the five hooks with their signatures; the types
  `ConsentRequest`, `ConsentResult`, `ConnectedApp` from `components["schemas"]`.
- `web/features/agents/components/consent-page.tsx`: `export function ConsentPage(): React.JSX.Element`.
- `web/features/agents/components/consent-route.tsx`: `export function ConsentRoute({ children }: { children: React.ReactNode }): React.JSX.Element`.
- `web/features/agents/components/connected-apps-settings.tsx`: `export function ConnectedAppsSettings(): React.JSX.Element`.
- `web/features/auth/components/auth-guard.tsx`: the optional `signedOutHref` prop in the props type only.
- `web/app/auth/consent/page.tsx`: `export default function ConsentRoutePage(): React.JSX.Element` (AC-15 imports it).

## Checks
```bash
# AC-21: the consent page is in the export (postbuild fails on any prototype trace); D1 removed the proposed types
(cd web && npm run -s build) && test -f web/out/auth/consent.html && test ! -e web/proto/features/agents/proposed-types.ts
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | `returnTo` accepts the consent page, `AuthGuard`'s `signedOutHref`, D1 for `api.ts` / `scopes.ts` and their twins, promote `app-mark` | web | S | sonnet | Auth redirect rule and the guard's signed-out target (auth trigger); the rest is spelled out | — |
| T2 | Consent page: the rest of D1, promote `auth-frame` and `consent-page` (D6 in both), sign-in page twin, `ConsentRoute`, `app/auth/consent/page.tsx` | web | S | haiku | Promotion plus spelled-out code (*Consent page and route*) | T1 |
| T3 | Connected apps tab: promote `mcp-server-url` and `connected-apps-settings`, settings view twin | web | S | haiku | Promotion and twin copies only | T1 |

## Agents
| Step | Agent | Date |
| --- | --- | --- |
| Prototype | `claude-code/claude-opus-5-5` | 2026-11-21 |
| Spec | `claude-code/claude-opus-5-5` | 2026-11-21 |
| Tasks (`pm4 tasks`) | `claude-code/claude-sonnet-5-5` | 2026-11-21 |
| Acceptance tests | `claude-code/claude-sonnet-5-5`, checked by `claude-code/claude-opus-5-5` (fixes by `claude-code/claude-opus-5-5`: AC-16 "Not used yet" matcher, Prettier; AC-17 list-call baseline after `BLOCKED: test` on T-0183) | 2026-11-21 |

## Open questions
None. OQ-311…OQ-313 are resolved.

## Changelog
- 2026-11-21: Initial draft from prototypes `05db575` and `3fc6229`; OQ-311 (Allow 404 → invalid page), OQ-312 (`429`
  toast on the consent page), OQ-313 (no Documentation update) resolved. Status `review`.
- 2026-11-21: AC-17 counts list calls from a baseline before the error render (the shared mock made the absolute counts
  unreachable; found by T-0183's implementer); re-hashed. Review: `?error=` lookup uses `Object.hasOwn`.
