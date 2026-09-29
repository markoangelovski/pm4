---
id: feat-land-app-route-split
title: Landing page at the root, app under /app/
status: approved
owner: Marko Angelovski
last_updated: 2026-09-29
milestone: M1
requirements: [FR-LAND-001, FR-LAND-002, FR-LAND-003, FR-AUTH-001, FR-AUTH-004, FR-AUTH-005, FR-AUTH-007]
related: [web-routing, web-screens, web-conventions, web-static-export, req-landing, req-auth, sec, OQ-047, OQ-048, OQ-049]
---

# Landing page at the root, app under /app/

## Goal
The public landing page is served at the site root `/`, and every app screen moves under `/app/`.
A signed-out visitor who opens a private deep link goes to the landing page. The deep link is kept as
`?returnTo=` and carried through **Login** and sign-in, so the visitor ends up where they started.
This is a web-only change (OQ-047).

## Behavior
- URL layout, route map, auth guard rule and the `returnTo` validation rule:
  [routing.md](../04-web/routing.md#url-layout-oq-047-decided),
  [routing.md → Auth guard and `returnTo`](../04-web/routing.md#auth-guard-and-returnto-oq-047).
- Landing page at `/`: FR-LAND-001, and FR-LAND-002's Login target with `returnTo`
  ([landing.md](../01-requirements/landing.md)), SCR-003 ([screens.md](../04-web/screens.md)).
- Redirect and default destination: FR-AUTH-005, FR-AUTH-001 (`/app/`), FR-AUTH-004 (sign-out →
  `/auth/sign-in/`) ([auth.md](../01-requirements/auth.md)).
- Old URLs (`/home/`, `/projects/`, `/tasks/`, `/time/`, `/trash/`, `/settings/`, `…/view/`) are no longer
  built, so GitHub Pages serves the existing `404.html`. There are no redirects.

### What exists today, and what this feature builds
The web app has **no auth code yet**. The auth guard, token storage, session detection ("Go to app"),
the sign-in → API hand-off and the callback's token exchange are all `TODO(M1)`. The landing page
always shows "Login". So this feature:
1. moves the routes and fixes every internal link;
2. adds the **route constants** and the **`returnTo` helpers** that the M1 auth work must use, with
   their rules fully pinned down here (so the guard, sign-in and callback don't make new decisions);
3. makes the landing page's **Login** forward a valid `returnTo` to sign-in.

The guard's redirect to `/?returnTo=`, clearing a stale token, the refresh-failure redirect (D13),
"Go to app" (D12), passing `returnTo` to API-AUTH-001, and the callback's final redirect are
**implemented by the M1 auth feature spec** (not written yet), using `landingHref`, `sanitizeReturnTo`
and `postSignInPath` from this spec. This
feature updates the `TODO(M1)` comments at those places so they point to the helpers.

### Decisions recorded here
| # | Decision | Why |
| --- | --- | --- |
| D1 | The `/app/` segment is a folder **inside** the existing route group: `app/(dashboard-layout)/app/…`. The group's `layout.tsx`, `loading.tsx`, `error.tsx` and `layout/` stay where they are. | The shell imports (`@/app/(dashboard-layout)/layout/…`) don't change. The group now wraps only `/app/**`, so the landing page at `/` is outside the shell. |
| D2 | The landing page moves from `app/home/page.tsx` to `app/page.tsx`. `app/home/` is deleted. | OQ-047 (3): no `/home/`, no redirect. |
| D3 | All internal paths come from `web/lib/routes.ts`. No other file hard-codes a route path literal (tests excepted). | One place to change, and it's greppable. |
| D4 | `returnTo` is valid only when it is a same-origin relative path **under `/app/`** (full rule in `sanitizeReturnTo` below). Invalid values are treated as absent at every hop: they are never echoed into a link, and the page doesn't rewrite its own URL. | Open-redirect protection. Only `/app/**` routes need a return; sending someone "back" to `/auth/…` or `/` makes no sense. |
| D5 | The guard builds `returnTo` from `window.location.pathname + window.location.search` (path + query, no hash). `returnTo` is left out when that is exactly `/app/` (so `/app/` → plain `/`). | GitHub Pages serves trailing-slash URLs, so `window.location` has the canonical `/app/…/` form. `/app/` is already the default destination. |
| D6 | Encoding: `returnTo` is always written with `encodeURIComponent` (e.g. `/?returnTo=%2Fapp%2Fprojects%2F`) and read with `URLSearchParams.get` (first value wins when repeated). | One exact, testable format. |
| D7 | Default post-sign-in destination: `/app/` (`postSignInPath`). | OQ-047 (1). |
| D8 | The API is unchanged. Its `returnTo` rule stays "relative path" (security.md). The web re-validates the value at `/auth/callback/`. | OQ-047 (2): web-only. `api/src` holds no web route paths (verified: only `WEB_APP_URL`, an origin, and `${WEB_APP_URL}/errors/…` Problem Details type URIs, which aren't routes). |
| D9 | The landing page stays a Server Component (static metadata). Only the call-to-action is a client component (`LandingCta`), which reads `returnTo` with `useSearchParams` inside `<Suspense>`. Its fallback is a neutral placeholder the size of the button. | static-export.md: `useSearchParams` needs a `<Suspense>` boundary, or the build fails. FR-LAND-002: no wrong-label flash. |
| D10 | `noindex` on `/` comes from the root layout's `robots` metadata (already there). Open Graph tags on `/` are **not** part of this feature. | FR-LAND-003 OG needs an image asset and copy that don't exist yet. They belong with the landing content work. |
| D11 | Sign-out (M1) navigates to `routes.signIn` with no `returnTo`. | FR-AUTH-004, unchanged by OQ-047. |
| D12 | "Go to app" (M1, the signed-in branch of `LandingCta`) links to `postSignInPath(searchParams.get(RETURN_TO_PARAM))`: a valid `returnTo`, otherwise `/app/`. No new helper. | OQ-048 (owner, 2026-09-29): the same check as Login. |
| D13 | When a session ends inside `/app/**` (a failed refresh after a 401 in `lib/api`), the client removes the stored refresh token, then calls `router.replace(landingHref(window.location.pathname + window.location.search))` (M1). This is the same call as the guard's. | OQ-049 (owner, 2026-09-29). A user-initiated sign-out stays D11. |

## Scope
**In:**
- Moving the dashboard, projects, tasks, time, trash and settings pages under `/app/`, and the landing page to `/`.
- `web/lib/routes.ts` and `web/lib/auth/return-to.ts`.
- Every internal link and redirect target: sidebar, app logo, user menu, entity-view list redirects,
  sign-in logo, not-found button, landing Login.
- `LandingCta` (Login with `returnTo`) and its placeholder.
- Updating the `TODO(M1)` comments in the shell layout, the callback page and the Google button.

**Non-goals** (implementers must not touch these):
- The auth guard's logic, token storage, session restore, the refresh-failure redirect, "Go to app",
  sign-out, the Google OAuth start and the callback's token exchange (M1 auth feature, following D11–D13).
- Open Graph tags and the landing page's marketing content (hero, feature grid, footer, FR-LAND-001 copy).
- Redirects from old URLs (OQ-047: none).
- `web/next.config.ts`, `web/app/layout.tsx`, `.github/workflows/*`, anything in `api/`.
- `app/(dashboard-layout)/layout/vertical/sidebar/nav-collapse/index.tsx` (its exact `pathname === url` match is unchanged).
- `app/components/shared/view-id-guard.tsx` and `view-id-guard.test.tsx` (the component takes `listPath` as a prop; the test's literal paths are just inputs).
- `web/AGENTS.md` (see *Follow-ups*).

## Read first
| File | Why |
| --- | --- |
| `specs/04-web/routing.md` | Route map, guard and `returnTo` rules |
| `specs/01-requirements/landing.md#fr-land-002-header-applogin-button` | Login target with `returnTo` |
| `specs/04-web/static-export.md` | `useSearchParams` + `<Suspense>`, trailing slashes, verification |
| `web/app/(dashboard-layout)/projects/view/page.tsx` | Server page wrapping a client part in `<Suspense>` |
| `web/app/components/shared/view-id-guard.tsx` | Client component reading `useSearchParams` |
| `web/app/components/shared/view-id-guard.test.tsx` | Mocking `next/navigation` in Vitest |
| `web/app/home/page.tsx` | The landing page being moved |
| `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ts` | Nav config |
| `web/components/ui/button.tsx`, `web/components/ui/skeleton.tsx` | `Button` (`render` prop), `buttonVariants`, `Skeleton` |

## Files
Moves use plain `mv` (never `git mv`, which stages; AGENTS.md §3). A moved file keeps its content
unless the row says otherwise. Approving this spec approves the listed moves and the deletion of `web/app/home/`.

| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| web | `web/lib/routes.ts` | C | T1 | Stub from the test writer; exact content in *Interfaces* |
| web | `web/lib/auth/return-to.ts` | C | T1 | Stub from the test writer; implement per *Interfaces* |
| web | `web/app/(dashboard-layout)/page.tsx` → `web/app/(dashboard-layout)/app/page.tsx` | M (move) | T2 | Dashboard `/app/` |
| web | `web/app/(dashboard-layout)/projects/page.tsx` → `web/app/(dashboard-layout)/app/projects/page.tsx` | M (move) | T2 | |
| web | `web/app/(dashboard-layout)/projects/view/page.tsx` → `web/app/(dashboard-layout)/app/projects/view/page.tsx` | M (move) | T2 | `listPath={routes.app.projects}` |
| web | `web/app/(dashboard-layout)/tasks/page.tsx` → `web/app/(dashboard-layout)/app/tasks/page.tsx` | M (move) | T2 | |
| web | `web/app/(dashboard-layout)/tasks/view/page.tsx` → `web/app/(dashboard-layout)/app/tasks/view/page.tsx` | M (move) | T2 | `listPath={routes.app.tasks}` |
| web | `web/app/(dashboard-layout)/time/page.tsx` → `web/app/(dashboard-layout)/app/time/page.tsx` | M (move) | T2 | |
| web | `web/app/(dashboard-layout)/trash/page.tsx` → `web/app/(dashboard-layout)/app/trash/page.tsx` | M (move) | T2 | |
| web | `web/app/(dashboard-layout)/settings/page.tsx` → `web/app/(dashboard-layout)/app/settings/page.tsx` | M (move) | T2 | |
| web | `web/app/home/page.tsx` → `web/app/page.tsx` | M (move) | T2 | Then delete the empty `web/app/home/`. T3 edits it |
| web | `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ts` | M | T2 | `url`s from `routes.app.*` |
| web | `web/app/(dashboard-layout)/layout/shared/logo/full-logo.tsx` | M | T2 | `href={routes.app.dashboard}` |
| web | `web/app/(dashboard-layout)/layout/shared/header/profile.tsx` | M | T2 | Settings `href={routes.app.settings}` |
| web | `web/app/auth/sign-in/page.tsx` | M | T2 | Logo `href={routes.landing}` |
| web | `web/app/not-found.tsx` | M | T2 | `href={routes.landing}` (label unchanged) |
| web | `web/app/(dashboard-layout)/layout.tsx` | M | T2 | Comment only: see *Interfaces → TODO comments* |
| web | `web/app/auth/callback/page.tsx` | M | T2 | Comment only |
| web | `web/app/auth/authforms/social-buttons.tsx` | M | T2 | Comment only |
| web | `web/app/components/shared/landing-cta.tsx` | C | T3 | Stub from the test writer |
| web | `web/app/page.tsx` | M | T3 | Use `LandingCta` in the header and the hero |
| web | `web/lib/auth/return-to.ac.test.ts` | C | tests | Acceptance tests |
| web | `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ac.test.ts` | C | tests | Acceptance tests |
| web | `web/app/components/shared/landing-cta.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/app/links.ac.test.tsx` | C | tests | Acceptance tests (logos, not-found, sign-in) |

## Reuse
| Use / mirror | Path | Copy this |
| --- | --- | --- |
| Server page + `<Suspense>` around a client part | `web/app/(dashboard-layout)/projects/view/page.tsx` | `export const metadata`, `<Suspense fallback>` wrapping the client component |
| Client component reading the query | `web/app/components/shared/view-id-guard.tsx` | `"use client"`, `useSearchParams()` |
| Router/search-param mocks in tests | `web/app/components/shared/view-id-guard.test.tsx` | `vi.mock("next/navigation", …)` |
| Link-as-button | `web/app/home/page.tsx` | `<Button render={<Link href=… />}>` (Base UI `render`, not `asChild`) |
| Placeholder | `web/components/ui/skeleton.tsx` + `buttonVariants` from `web/components/ui/button.tsx` | Size the skeleton with the button's own variant classes |
| Class merging | `web/lib/utils.ts` | `cn()` |

## Interfaces

### Web

#### `web/lib/routes.ts` (exact content, T1)
```ts
/** Every internal route (routing.md). Trailing slashes match `trailingSlash: true`. */
export const routes = {
  landing: "/",
  signIn: "/auth/sign-in/",
  authCallback: "/auth/callback/",
  app: {
    dashboard: "/app/",
    time: "/app/time/",
    projects: "/app/projects/",
    projectView: "/app/projects/view/",
    tasks: "/app/tasks/",
    taskView: "/app/tasks/view/",
    trash: "/app/trash/",
    settings: "/app/settings/",
  },
} as const;

/** Prefix of every private route. */
export const APP_PREFIX = "/app/";
```

#### `web/lib/auth/return-to.ts` (T1)
```ts
export const RETURN_TO_PARAM = "returnTo";
export const RETURN_TO_MAX_LENGTH = 2048;

/** The valid `returnTo` (pathname + search), or null. Never throws. */
export function sanitizeReturnTo(raw: string | null | undefined): string | null;

/** Where the guard sends a signed-out visitor. Input: window.location.pathname + search. */
export function landingHref(currentPathAndQuery: string | null | undefined): string;

/** The landing page's Login target. */
export function signInHref(returnTo: string | null | undefined): string;

/** Where the callback sends the user after the token exchange. */
export function postSignInPath(returnTo: string | null | undefined): string;
```
`sanitizeReturnTo(raw)`. Apply these steps in order. The first failing step returns `null`:
1. `raw` is a non-empty string.
2. `raw.length <= RETURN_TO_MAX_LENGTH`.
3. `raw` starts with `/`, and doesn't start with `//`.
4. `raw` contains no `\` and no character with code `< 0x20` or `=== 0x7f`.
5. `const url = new URL(raw, "https://pm4.invalid")` doesn't throw, and `url.origin === "https://pm4.invalid"`.
6. `url.pathname.startsWith(APP_PREFIX)` (checked **after** parsing, so dot segments such as `/app/../auth/` or `/app/%2e%2e/` are normalized first).
7. Return `url.pathname + url.search` (the hash is dropped).

`landingHref(x)`: `r = sanitizeReturnTo(x)`. If `r` is `null` or equals `routes.app.dashboard` → `routes.landing`,
otherwise `` `${routes.landing}?${RETURN_TO_PARAM}=${encodeURIComponent(r)}` ``.

`signInHref(x)`: `r = sanitizeReturnTo(x)`. `r` null → `routes.signIn`, otherwise
`` `${routes.signIn}?${RETURN_TO_PARAM}=${encodeURIComponent(r)}` ``. `/app/` is kept (no special case).

`postSignInPath(x)`: `sanitizeReturnTo(x) ?? routes.app.dashboard`. It is also the "Go to app" target (D12).

#### `web/app/components/shared/landing-cta.tsx` (T3)
```tsx
"use client";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";

type ButtonProps = ComponentProps<typeof Button>;
export interface LandingCtaProps {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}

/** Login link that forwards a valid `?returnTo=` (FR-LAND-002). Render inside <Suspense>. */
export function LandingCta(props: LandingCtaProps): React.JSX.Element;

/** Neutral, same-size placeholder shown until the CTA is known (Suspense fallback). */
export function LandingCtaFallback(props: LandingCtaProps): React.JSX.Element;
```
- `LandingCta`: `const raw = useSearchParams().get(RETURN_TO_PARAM)`, then render
  `<Button variant={variant} size={size} render={<Link href={signInHref(raw)} />}>Login</Button>`.
  It makes no network call and doesn't touch `localStorage` (M1 adds the signed-in branch here).
- `LandingCtaFallback`: `<Skeleton aria-hidden="true" data-testid="landing-cta-placeholder" className={cn(buttonVariants({ variant, size }), "w-24 border-transparent bg-muted text-transparent")} />`.
  It contains no link and no text.

#### `web/app/page.tsx` (T3)
- The component is renamed `LandingPage`, and `metadata` is kept as it is (`title` only; `robots` is inherited from `app/layout.tsx`).
- Header: `<Suspense fallback={<LandingCtaFallback variant="outline" size="sm" />}><LandingCta variant="outline" size="sm" /></Suspense>`.
- Hero: `<Suspense fallback={<LandingCtaFallback />}><LandingCta /></Suspense>`.
- It has no other changes, and no `"use client"`.

#### Link targets (T2)
| Place | Target |
| --- | --- |
| Sidebar `dashboard`, `time`, `projects`, `tasks`, `trash`, `settings` | `routes.app.dashboard`, `.time`, `.projects`, `.tasks`, `.trash`, `.settings` (names, ids, icons and order unchanged) |
| App logo (`full-logo.tsx`) | `routes.app.dashboard` |
| User menu → Settings (`profile.tsx`) | `routes.app.settings` |
| Project view, missing `id` | `routes.app.projects` |
| Task view, missing `id` | `routes.app.tasks` |
| Sign-in logo | `routes.landing` |
| Not-found "Go back home" | `routes.landing` |

#### TODO comments (T2, text only)
- `(dashboard-layout)/layout.tsx`: `// TODO(M1): auth guard. Wait for session restore. With no session (or a failed restore: remove the stored refresh token first), router.replace(landingHref(window.location.pathname + window.location.search)) (routing.md, feat-land-app-route-split).`
- `auth/callback/page.tsx`: `TODO(M1): exchange \`code\` for a session, then router.replace(postSignInPath(searchParams.get(RETURN_TO_PARAM))) (feat-land-app-route-split).`
- `auth/authforms/social-buttons.tsx`: `/* TODO(M1): start the Google OAuth flow, passing sanitizeReturnTo(searchParams.get(RETURN_TO_PARAM)) as API-AUTH-001's returnTo (omit it when null). */`

## Edge cases and errors
| Case | Expected result | Covered by |
| --- | --- | --- |
| `sanitizeReturnTo("/app/projects/")` | `"/app/projects/"` | `AC-1` |
| `sanitizeReturnTo("/app/projects/view/?id=0199a1b2-…")` | Same string (the query is kept) | `AC-1` |
| `sanitizeReturnTo("/app/")` | `"/app/"` | `AC-1` |
| `sanitizeReturnTo("/app/time/?date=2026-09-29#top")` | `"/app/time/?date=2026-09-29"` (hash dropped) | `AC-1` |
| `null`, `undefined`, `""` | `null` | `AC-2` |
| Absolute or protocol-relative: `https://evil.example/app/`, `//evil.example/app/`, `/\evil.example/app/`, `javascript:alert(1)` | `null` | `AC-2` |
| Relative but outside `/app/`: `/`, `/home/`, `/auth/sign-in/`, `/app` (no slash), `/application/`, `app/projects/` (no leading `/`) | `null` | `AC-2` |
| Dot segments escaping `/app/`: `/app/../auth/sign-in/`, `/app/%2e%2e/home/` | `null` | `AC-2` |
| Control character (`/app/\n`, `/app/\t`) or longer than 2048 characters | `null` | `AC-2` |
| `landingHref("/app/projects/")` | `"/?returnTo=%2Fapp%2Fprojects%2F"` | `AC-3` |
| `landingHref("/app/projects/view/?id=abc")` | `"/?returnTo=%2Fapp%2Fprojects%2Fview%2F%3Fid%3Dabc"` | `AC-3` |
| `landingHref("/app/")`, `landingHref("/home/")`, `landingHref(null)` | `"/"` | `AC-3` |
| `signInHref("/app/tasks/")` | `"/auth/sign-in/?returnTo=%2Fapp%2Ftasks%2F"` | `AC-4` |
| `signInHref(null)`, `signInHref("https://evil.example/")`, `signInHref("/auth/callback/")` | `"/auth/sign-in/"` | `AC-4` |
| `postSignInPath("/app/trash/")` | `"/app/trash/"` | `AC-5` |
| `postSignInPath(null)`, `postSignInPath("//evil.example/")` | `"/app/"` | `AC-5` |
| `postSignInPath("/app/projects/?x=1")`, `postSignInPath("/home/")` (the "Go to app" inputs, D12) | `"/app/projects/?x=1"`; `"/app/"` | `AC-5` |
| Landing `/` with no `returnTo` | Login `href="/auth/sign-in/"` | `AC-6` |
| Landing `/?returnTo=%2Fapp%2Fprojects%2F` | Login `href="/auth/sign-in/?returnTo=%2Fapp%2Fprojects%2F"` | `AC-6` |
| Landing `/?returnTo=https%3A%2F%2Fevil.example%2F` or `/?returnTo=%2Fhome%2F` | Login `href="/auth/sign-in/"`; the invalid value appears nowhere in the DOM | `AC-6` |
| Landing `?returnTo=` given twice | The first value is used | `AC-6` |
| `LandingCta` renders | No `fetch` call, no `localStorage` read | `AC-7` |
| Suspense fallback | An `aria-hidden` placeholder with no link and no text | `AC-8` |
| Sidebar | URLs `/app/`, `/app/time/`, `/app/projects/`, `/app/tasks/`, `/app/trash/`, `/app/settings/`, in the existing order | `AC-9` |
| App logo → `/app/`; sign-in logo → `/`; not-found "Go back home" → `/` | As stated | `AC-10` |
| Build output has the new pages | `out/index.html`, `out/app/index.html`, `out/app/{time,projects,projects/view,tasks,tasks/view,trash,settings}/index.html`, `out/auth/sign-in/index.html`, `out/auth/callback/index.html`, `out/404.html` exist | `AC-11` |
| Old URLs dropped (not-found, no redirect) | `out/home`, `out/projects`, `out/tasks`, `out/time`, `out/trash`, `out/settings` don't exist, so Pages serves `404.html` | `AC-11` |
| `/` is not indexable | `out/index.html` contains `<meta name="robots" content="noindex, nofollow"` | `AC-12` |
| No stray path literals | No `"/home/"`, `"/projects/"`, `"/tasks/"`, `"/time/"`, `"/trash/"`, `"/settings/"` in non-test `web/app/**` or `web/lib/**` source | `AC-13` |
| Deep route on a static server | `npx serve out`, hard-refresh `/app/projects/view/?id=x`: it loads, no 404 | `AC-14` |

Not covered here (M1 auth feature, which tests them): the guard redirect and stale-token clearing
(FR-AUTH-005), "Go to app" rendering (D12, FR-LAND-002), the refresh-failure redirect (D13, FR-AUTH-005/007),
and the round trip through the API and callback (FR-AUTH-001). This feature covers the helpers they call (AC-1–AC-5).

## Acceptance tests
Written by the test writer **before** implementation. Implementers must not modify these files.

| ID | Test | File | Level |
| --- | --- | --- | --- |
| AC-1 | `sanitizeReturnTo` accepts valid `/app/…` paths, keeps the query, drops the hash | `web/lib/auth/return-to.ac.test.ts` | unit |
| AC-2 | `sanitizeReturnTo` rejects every invalid input in the edge-case table | `web/lib/auth/return-to.ac.test.ts` | unit |
| AC-3 | `landingHref` exact outputs | `web/lib/auth/return-to.ac.test.ts` | unit |
| AC-4 | `signInHref` exact outputs | `web/lib/auth/return-to.ac.test.ts` | unit |
| AC-5 | `postSignInPath` exact outputs (default `/app/`; also the "Go to app" target, D12) | `web/lib/auth/return-to.ac.test.ts` | unit |
| AC-6 | FR-LAND-002: `LandingCta` Login `href` for no, valid, invalid and repeated `returnTo` (mocked `useSearchParams`) | `web/app/components/shared/landing-cta.ac.test.tsx` | component |
| AC-7 | FR-LAND-002: `LandingCta` makes no `fetch` call and doesn't read `localStorage` (spies) | `web/app/components/shared/landing-cta.ac.test.tsx` | component |
| AC-8 | FR-LAND-002: `LandingCtaFallback` is `aria-hidden`, has no link and no text | `web/app/components/shared/landing-cta.ac.test.tsx` | component |
| AC-9 | Sidebar URLs and order | `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ac.test.ts` | unit |
| AC-10 | `FullLogo` → `/app/`; `SignInPage` logo → `/`; `NotFound` button → `/` | `web/app/links.ac.test.tsx` | component |
| AC-11 | Build output: new pages exist, old ones don't, `404.html` exists | DoD command (below) | build |
| AC-12 | FR-LAND-003: `out/index.html` is `noindex` | DoD command | build |
| AC-13 | No old path literals in source | DoD command | static |
| AC-14 | Deep route loads from a static server | Manual (static-export.md → Verification) | manual |

Typed stubs created with the tests, so lint and typecheck pass while the tests fail:
- `web/lib/routes.ts`: the exact content from *Interfaces* (it's data, so the stub is final).
- `web/lib/auth/return-to.ts`: the constants plus the four signatures, each `throw new Error("not implemented (feat-land-app-route-split)")`.
- `web/app/components/shared/landing-cta.tsx`: `LandingCta` and `LandingCtaFallback` with the signatures above, each throwing the same error.

## Tasks
Ordered. Tier rules: `specs/05-quality/task-routing.md`.

| # | Task | App | Tier | Why this tier | Depends on | Done when |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Implement `sanitizeReturnTo`, `landingHref`, `signInHref` and `postSignInPath` in `web/lib/auth/return-to.ts` (`routes.ts` is final from the stub) | web | opus | Open-redirect validation is security logic, and it's the first instance of `lib/auth/` | — | `AC-1`–`AC-5` pass; lint/typecheck green |
| T2 | Move the app pages under `app/(dashboard-layout)/app/` and the landing page to `app/page.tsx` (plain `mv`, delete `app/home/`); switch every link in *Link targets* to `routes.*`; update the three TODO comments | web | sonnet | One app, ~19 files, mechanical but spread over the route tree and the shell. More than 3 files rules out haiku | T1 | `AC-9`, `AC-10`, `AC-11`, `AC-12`, `AC-13`, `AC-14` pass; lint/typecheck/test/build green |
| T3 | Implement `LandingCta` / `LandingCtaFallback` and use them in `app/page.tsx` | web | haiku | 2 files, fully specified in *Interfaces*; copies `view-id-guard.tsx`'s `useSearchParams` + `<Suspense>` pattern. Validation lives in T1's helper | T1, T2 | `AC-6`–`AC-8` pass, and `AC-11`/`AC-12` still pass; lint/typecheck/test/build green |

## Definition of done
Run from `web/`. Expected result: every command exits 0, and the acceptance tests pass.

```bash
cd web && npm run lint && npm run typecheck && npm test && npm run build
# AC-11: new pages exist, old ones don't
cd web && for p in index.html app/index.html app/time/index.html app/projects/index.html \
  app/projects/view/index.html app/tasks/index.html app/tasks/view/index.html app/trash/index.html \
  app/settings/index.html auth/sign-in/index.html auth/callback/index.html 404.html; do test -f "out/$p" || { echo "missing $p"; exit 1; }; done \
  && for p in home projects tasks time trash settings; do test ! -e "out/$p" || { echo "stale $p"; exit 1; }; done
# AC-12: the landing page is noindex
cd web && grep -q '<meta name="robots" content="noindex, nofollow"' out/index.html
# AC-13: no old path literals in source (tests excluded)
cd web && ! grep -rnE --include='*.ts' --include='*.tsx' --exclude='*.test.*' \
  '"/(home|projects|tasks|time|trash|settings)/' app lib
```
AC-14: `npx serve out`, then hard-refresh `/`, `/app/` and `/app/projects/view/?id=x`. Each loads with no
404 and no missing assets, and `/home/` shows the not-found page.

Plus `specs/05-quality/definition-of-done.md`.

## Follow-ups (outside this feature)
- `web/AGENTS.md` → *Structure* and *Patterns to copy* still say `home/` and `app/(dashboard-layout)/projects/…`.
  Update them from the main session after T2 (implementers can't edit agent config).
- The M1 auth feature spec must implement the guard, stale-token clearing, sign-in → API `returnTo`,
  the callback redirect, "Go to app" (D12) and the refresh-failure redirect (D13) with the helpers above.
- ADR-0001 cites `/projects/view/?id=…` as an example of a query-param route. The decision is unchanged,
  so the ADR isn't edited (accepted ADRs aren't edited).

## Open questions
— (OQ-047, OQ-048, OQ-049 resolved)

## Changelog
- 2026-09-29: Initial draft (OQ-047). OQ-048 and OQ-049 raised.
- 2026-09-29: OQ-048 resolved (D12: "Go to app" → `postSignInPath(returnTo)`), and OQ-049 resolved (D13:
  a failed refresh clears the token and goes to `landingHref(current)`). Edge cases and AC-5 extended. Moved to `review`.
- 2026-09-29: Approved by the owner.
