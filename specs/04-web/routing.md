---
id: web-routing
title: Routing and Navigation
status: approved
owner: Marko Angelovski
last_updated: 2026-10-03
related: [web-static-export, web-screens, req-landing, req-auth, feat-land-app-route-split]
---

# Routing and Navigation

## Purpose
Defines the URL structure and navigation. Every route must exist at build time (static export).

## URL layout (OQ-047, OQ-050: decided)
- **No URL has a trailing slash** (`trailingSlash: false`, OQ-050): `/app/projects`, not `/app/projects/`.
- `/` is the public landing page (SCR-003).
- `/auth/sign-in` and `/auth/callback` are public, outside `/app`.
- **Everything else lives under `/app`, and every `/app/**` route is private.**
- The old URLs (`/home`, `/projects`, `/tasks`, `/time`, `/trash`, `/settings`, and their
  `view/` pages, and every trailing-slash form) don't exist. There are no redirects: they show the normal not-found page (`404.html`).

## Entity routes (OQ-014: decided)
Single-entity pages use **query-param routes**: `/app/project?id=<uuid>`, `/app/task?id=<uuid>`. Each is a
flat sibling of its list, never a child route (static-export.md, OQ-050). There's one static page,
and the client reads `id` with `useSearchParams` (inside `<Suspense>`).
- **`id` missing or empty → redirect (replace) to the list** (`/app/projects`, `/app/tasks`).
- `id` not found → a "Not found" state with a link back to the list. If it's in the trash → a "This project is in the trash" state with **Restore**.

## Route map
| Route | Screen | Auth |
| --- | --- | --- |
| `/?returnTo=` | SCR-003 Landing page (marketing, "Go to app" / "Login" header button) | public |
| `/auth/sign-in?returnTo=` | SCR-001 Sign in (Google) | public |
| `/auth/callback?code=&returnTo=` | SCR-002 OAuth callback (token exchange, then redirect) | public |
| `/app` | SCR-010 Dashboard (range, total, breakdown, chart) | required |
| `/app/projects?q=&sort=&page=` | SCR-020 Project list | required |
| `/app/project?id=&status=&q=&sort=&page=` | SCR-021 Project detail (details, task statistics, tasks) | required |
| `/app/tasks?project=&status=&q=&sort=&page=` | SCR-030 Task list (all projects) | required |
| `/app/task?id=` | SCR-031 Task detail (its time logs come with M4) | required |
| `/app/time?date=&view=sequential\|project` | SCR-040 Day view (workday header, logs, view toggle) | required |
| `/app/trash` | SCR-060 Trash | required |
| `/app/user-profile` | SCR-051 Profile (Google identity, sign out of all devices) | required |
| `/app/settings` | SCR-050 Settings (time zone) | required |

## Navigation
- Sidebar (OQ-054), in sections with a heading (shown in capitals):
  **Dashboard** → Default (`/app`) · **Project management** → Projects, Tasks · **Time** → Logs (`/app/time`).
  A fixed footer at the bottom of the sidebar (stays put while the nav scrolls) holds Trash and Settings.
  The app logo links to `/app`.
- Header: a global **Log time** button (FR-TLOG-008), the theme toggle and the user's avatar. The avatar
  opens the **user drawer** (SCR-005) with **Home** (`/app`), **Profile** (`/app/user-profile`) and **Sign out** (OQ-057, OQ-074).
- Landing page (`/`, FR-LAND-001/002): public, outside the app shell and its auth guard. It has its own
  marketing header with the "Go to app" / "Login" button, not the sidebar.
- The sign-in screen's logo links to the landing page `/`.
- The not-found page's "Go back home" button links to `/` (the landing page).
- No page is indexable (FR-LAND-003): every page carries a `noindex` robots directive, and there is no sitemap.
- App footer (every `/app/**` screen, OQ-055): **PM4** in the copyright line links to `/`; **Terms and
  Conditions** → `/terms-and-conditions`, **Privacy** → `/privacy`. Those two routes have no page yet (not in
  the route map), so they show the not-found page until a later feature adds them.
- All internal links use `next/link`.

## Auth guard and `returnTo` (OQ-047)
- The shell layout of `/app/**` waits for session restore (refresh). **Without a session, it redirects
  (replace) to the landing page `/`, keeping the deep link as `/?returnTo=<path+query>`.** When the
  path+query is exactly `/app`, the `returnTo` is left out (plain `/`).
- If session restore fails because the stored refresh token is expired or revoked, the client
  **removes the stored refresh token before redirecting**, so the landing page shows "Login" (FR-LAND-002).
- If the API **can't be reached** during restore (network error, timeout, `5xx`/`429`), the session is kept:
  the page shows "Can't reach PM4 right now." with a **Retry** button instead of the app (OQ-067). Only a
  rejected refresh (`401`/`400`) ends the session.
- If another tab removes the stored refresh token (sign-out there), every `/app/**` tab follows at once with
  the ended-session rule below (OQ-069).
- **Login** on the landing page goes to `/auth/sign-in?returnTo=<the landing page's returnTo>`, or to
  `/auth/sign-in` when there is none. **Go to app** (signed in) goes to the landing page's `returnTo`
  when it's valid, otherwise to `/app` (OQ-048).
- The sign-in screen passes `returnTo` to the API (API-AUTH-001), which round-trips it to `/auth/callback`.
  After the token exchange, the callback replaces the URL with `returnTo`, or with **`/app`** when there is none.
- **Validation.** Every hop (landing, sign-in, callback) validates `returnTo` with the same rule, and
  treats an invalid value as absent: it must be a **same-origin relative path that is `/app` or starts with `/app/`**, at most
  2048 characters, starting with a single `/` and containing no backslash or control character. The
  check runs on the parsed, normalized URL (so `/app/../auth/` is rejected). The hash is dropped, and a trailing slash is removed (`/app/projects/` → `/app/projects`).
  An invalid value is never echoed into a link, and the page doesn't rewrite its own URL. Details and
  the helper: [feat-land-app-route-split](../06-features/land-app-route-split.md#web).
- **A session that ends while the user is inside `/app/**`** (a failed refresh after a 401: expired or
  revoked, "Sign out of all devices" on another device, allow-list removal) follows the same rule: the
  client removes the stored refresh token, then replaces the URL with `/?returnTo=<current path+query>` (OQ-049).
- A user-initiated **Sign out** lands on the sign-in screen `/auth/sign-in`, with no `returnTo` (FR-AUTH-004).
- Opening `/auth/sign-in` **while signed in** (a stored refresh token) replaces the URL with a valid
  `returnTo`, else `/app`, like "Go to app" (OQ-070).

## Open questions
— (OQ-047, OQ-048, OQ-049, OQ-050 resolved)

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Query-param routes confirmed with the missing-id redirect. Added auth callback, time and trash routes.
- 2026-09-27: Added the public landing page route `/home/` (SCR-003).
- 2026-09-27: OQ-044/045 resolved: `/` without a session → `/home/`; sign-in logo → `/home/`; no page indexable.
- 2026-09-27: Approved by the owner.
- 2026-09-29: OQ-047: landing page moves to `/`, the app to `/app/**` (all private); old URLs dropped
  without redirects. Signed-out visitors on `/app/**` go to `/?returnTo=`; default post-sign-in
  destination `/app/`; `returnTo` must be under `/app/`. Stale tokens are cleared before the redirect.
  OQ-048/049 raised. Back to `review` (feat-land-app-route-split).
- 2026-09-29: OQ-048 resolved: "Go to app" follows a valid `returnTo`, else `/app/`. OQ-049 resolved: a
  session that ends inside `/app/**` clears the stored token and goes to `/?returnTo=`.
- 2026-09-29: Approved by the owner.
- 2026-10-01: OQ-050: no trailing slashes (`trailingSlash: false`); detail routes `/app/project?id=` and `/app/task?id=`. Back to `review` (feat-land-app-route-split).
- 2026-10-01: Approved by the owner.
- 2026-10-02: Sidebar sections and a fixed footer with Trash and Settings; "Time" is labelled "Logs", "Dashboard" "Default" (OQ-054).
- 2026-10-02: App footer links to `/`, `/terms-and-conditions` and `/privacy` (pages not built yet, OQ-055).
- 2026-10-02: API unreachable during restore keeps the session (OQ-067); other tabs follow a sign-out (OQ-069); the sign-in page forwards a signed-in visitor (OQ-070). Back to `review` (feat-auth-web-session).
- 2026-10-03: Approved by the owner.
- 2026-10-03: `/app/user-profile` (SCR-051); the header user menu becomes the user drawer; `/app/settings` holds only the time zone (OQ-057, OQ-058, OQ-074). Back to `review` (feat-shell-user-menu).
- 2026-10-03: Approved by the owner.
- 2026-10-03: Query params of the project and task lists; task detail without time logs until M4 (OQ-080). Back to `review` (feat-prj-web, feat-tsk-web).
- 2026-10-03: Approved by the owner.
