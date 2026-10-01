---
id: req-landing
title: Public Landing Page
status: approved
owner: Marko Angelovski
last_updated: 2026-10-01
related: [prod-scope, req-auth, web-routing, web-screens, web-static-export, feat-land-app-route-split]
---

# Public Landing Page

## Purpose
Covers the public marketing page at the site root `/` (OQ-047). It tells visitors what PM4 is and what
it can do, and gives them a way into the app (`/app`).

## Scope
**In:** a public, static landing page with general information about PM4 and its features, and a
header button whose label and target depend on whether the visitor is signed in. Carrying a kept deep
link (`?returnTo=`) on to sign-in.
**Out (MVP):** pricing, sign-up forms, contact forms, a blog or docs, analytics/tracking, i18n
(English only, OQ-018).

## Requirements

### FR-LAND-001: Public landing page
**Priority:** Must
**Statement:** PM4 has a public landing page at `/`. Anyone can open it without signing in. It is
a marketing page that describes what PM4 is and what it can do. It covers at least projects, tasks,
time logging with a required note, the dashboard reporting, and the trash (OQ-045):
- a **hero** with the product name, a tagline and the same "Go to app" / "Login" call to action as the header;
- a **feature grid**: projects, tasks, time logs, dashboard, trash;
- a **footer**.

Screenshots are added later. The agent drafts the copy, and the owner edits it.
**Rules:**
- The page is fully static. Its content is rendered at build time and needs no API call to display
  (static-export.md). The page must render even when the API is unreachable or cold-starting.
- It shows no user data.
- It follows the template's theming (light/dark) and accessibility (OQ-018).
- The old landing URL `/home` no longer exists and shows the not-found page (OQ-047).
**Acceptance criteria:**
- Given I'm signed out, when I open `/`, then I see the landing page and I'm not redirected to sign-in.
- Given I'm signed in, when I open `/`, then I see the landing page (no redirect to the app).
- Given the API is down, when I open `/`, then the page content still renders.
- The page describes projects, tasks, time logging, reporting and the trash.
- When I open `/home`, then I see the not-found page.

### FR-LAND-002: Header app/login button
**Priority:** Must
**Statement:** The landing page header has one button whose label depends on the visitor's session:
- **Signed in:** "Go to app". If the landing page URL carries a valid `?returnTo=`, it opens that deep
  link (the same check as Login); otherwise it opens the dashboard `/app` (OQ-048).
- **Not signed in:** "Login". It opens the sign-in screen (SCR-001). If the landing page URL carries a
  valid `?returnTo=` (a kept deep link, FR-AUTH-005), Login opens `/auth/sign-in?returnTo=<that link>`;
  otherwise `/auth/sign-in`. An invalid `returnTo` (not a same-origin path under `/app`, routing.md)
  is ignored.

**Signed in** means a refresh token is stored in the browser (OQ-043). The page makes no network call to
check it. If the stored session turns out to be expired or revoked, the app's auth guard removes the stored
token and sends the user back to `/` (FR-AUTH-005), where the button then says "Login".
**Acceptance criteria:**
- Given I'm not signed in, when I open `/`, then the header button says "Login", and clicking it takes me to `/auth/sign-in`.
- Given I'm not signed in, when I open `/?returnTo=%2Fapp%2Fprojects`, then clicking "Login" takes me to `/auth/sign-in?returnTo=%2Fapp%2Fprojects`.
- Given I'm not signed in, when I open `/?returnTo=https%3A%2F%2Fevil.example%2F` (or any path outside `/app`), then clicking "Login" takes me to `/auth/sign-in`.
- Given I'm signed in, when I open `/`, then the header button says "Go to app", and clicking it takes me to `/app`.
- Given I'm signed in, when I open `/?returnTo=%2Fapp%2Fprojects`, then clicking "Go to app" takes me to `/app/projects`.
- Given I'm signed in, when I open `/?returnTo=%2Fhome` (invalid), then clicking "Go to app" takes me to `/app`.
- Given my stored session is expired or revoked, when I open an `/app/**` page, then I end up on `/` and the button says "Login".
- Given I signed out (here or in another tab), when I open `/`, then the button says "Login".
- Opening `/` makes no API request.
- The button doesn't flash the wrong label: until the session state is known, it shows a neutral placeholder of the same size.

**Screens:** SCR-003

### FR-LAND-003: Not indexed by search engines
**Priority:** Must
**Statement:** No PM4 page is indexed by search engines, the landing page included (OQ-045). Every page
tells crawlers not to index it, and the site publishes no sitemap. Open Graph tags (title, description,
image) are present on the landing page, so shared links still get a preview.
**Acceptance criteria:**
- Every HTML page in the build output (`out/`), including `out/index.html` (the landing page), has a `robots` `noindex` directive.
- The build output contains no sitemap.
- `/` has Open Graph title, description and image tags.

### Entry points (OQ-047, supersedes OQ-044)
- A signed-out visitor who opens any `/app/**` route is sent to `/`, keeping the deep link as
  `/?returnTo=<path+query>` (FR-AUTH-005).
- The sign-in screen's logo links to `/`.
- Sign-out still lands on the sign-in screen (FR-AUTH-004).

## Open questions
— (OQ-043, OQ-044, OQ-045, OQ-047, OQ-048 resolved)

## Changelog
- 2026-09-27: Initial version: public landing page at `/home/` with a "Go to app" / "Login" header button.
- 2026-09-27: OQ-043–045 resolved: session detection by stored refresh token, entry points, content sections, and no indexing (FR-LAND-003).
- 2026-09-29: OQ-047: the landing page moves to `/` (`/home/` dropped); "Go to app" opens `/app/`; Login
  forwards a valid `returnTo`; a stale stored token is cleared by the guard. OQ-048 raised.
- 2026-09-29: OQ-048 resolved: "Go to app" opens a valid `returnTo`, otherwise `/app/`.
- 2026-09-29: Approved by the owner.
- 2026-10-01: OQ-050: no trailing slashes (`trailingSlash: false`); detail routes `/app/project?id=` and `/app/task?id=`. Back to `review` (feat-land-app-route-split).
- 2026-10-01: Approved by the owner.
