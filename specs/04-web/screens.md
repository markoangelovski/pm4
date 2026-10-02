---
id: web-screens
title: Screens
status: approved
owner: Marko Angelovski
last_updated: 2026-10-03
related: [web-routing, req-landing, feat-land-app-route-split, req-projects, req-tasks, req-time-logs, req-reporting]
---

# Screens

## Purpose
Describes each screen: its purpose, content, actions, states, and the requirements and endpoints it uses.

## Screen template
```markdown
### SCR-020: Project list
**Route:** `/app/projects` · **Implements:** FR-PRJ-002, FR-PRJ-001 · **API:** API-PRJ-002, API-PRJ-001
**Purpose:** …
**Layout / content:** … (reference template components to reuse)
**Actions:** …
**States:** loading · empty · error · populated
**Responsive notes:** …
```

## Screens
Routes for every screen: [routing.md → Route map](routing.md#route-map). App screens (SCR-010 and up)
live under `/app` (OQ-047).

| ID | Name | Status |
| --- | --- | --- |
| SCR-001 | Sign in (`/auth/sign-in`, optional `?returnTo=&error=`): "Continue with Google" starts API-AUTH-001 with a valid `returnTo` and the browser's time zone. `?error=` shows an alert: `cancelled` → "Sign-in was cancelled.", `not-allowed` → "This account isn't allowed to use PM4.", any other value → "Sign-in failed. Please try again." (OQ-063). Signed in already → goes to a valid `returnTo`, else `/app` (OQ-070) | TODO |
| SCR-002 | OAuth callback (`/auth/callback?code=&returnTo=`): spinner + "Signing in…" while API-AUTH-003 runs; then replaces the URL with a valid `returnTo`, else `/app`. No `code`, or the exchange fails → `/auth/sign-in?error=failed` (keeping a valid `returnTo`) | TODO |
| SCR-003 | Landing page (`/`, optional `?returnTo=`): marketing content about PM4 (FR-LAND-001); hero, feature grid (projects, tasks, time logs, dashboard, trash) and footer; header button "Go to app" when signed in, "Login" when not (FR-LAND-002). Login carries a valid `returnTo` on to sign-in (routing.md, OQ-047); "Go to app" opens a valid `returnTo`, else `/app` (OQ-048); `noindex`, with Open Graph tags (FR-LAND-003) | TODO |
| SCR-004 | App shell, sidebar header (every `/app/**` screen): the logo icon (the template's `logoicon.svg`), title **PM4**, subtitle **Project management**, all linking to `/app`; a version pill `v<web version>` (from `web/package.json`). Hovering or focusing the pill shows `Web v<web> · API v<api>`; the API part reads `API …` while `GET /api/v1/version` loads and `API —` if it fails (one request per page load, no retry, no error toast). Collapsed to icons: only the logo icon. The mobile header keeps the icon only (OQ-051, OQ-052) | TODO |
| SCR-005 | App shell, user drawer (every `/app/**` screen): the header avatar (Google photo, else initials, OQ-073) opens a drawer from the right, like the template's profile sheet: the avatar, name and email (API-USR-001), a separator, links **Home** (`/app`) and **Profile** (`/app/user-profile`), and at the bottom a separator and a **Sign out** button (FR-AUTH-004). Links close the drawer (OQ-057, OQ-074) | TODO |
| SCR-010 | Dashboard: range picker, total hours, project breakdown, hours-per-day chart with project multi-select | TODO |
| SCR-020 | Project list | TODO |
| SCR-021 | Project detail | TODO |
| SCR-022 | Create/edit project dialog | TODO |
| SCR-030 | Task list | TODO |
| SCR-031 | Task detail | TODO |
| SCR-032 | Create/edit task dialog | TODO |
| SCR-040 | Day view: date nav, workday header (now · start · end), **sequential / group-by-project toggle**, logs, day total | TODO |
| SCR-041 | Add/edit log form: duration, required note, task/project picker (recent first), date. Stays open for repeated entry. | TODO |
| SCR-042 | Inline log row actions: edit, repeat, move up/down, delete | TODO |
| SCR-043 | Activity calendar (Could) | TODO |
| SCR-050 | Settings (`/app/settings`): time zone (FR-AUTH-006; the profile moved to SCR-051, OQ-058) | TODO |
| SCR-051 | Profile (`/app/user-profile`, read-only, API-USR-001): header card (avatar, name, email); **Account**: Name, Email, Signed in with: Google, Member since (date in the profile time zone), Time zone with a "Change in Settings" link; **Sessions**: **Sign out of all devices** behind a confirmation dialog (API-AUTH-006, FR-AUTH-007) (OQ-058, OQ-071, OQ-072) | TODO |
| SCR-060 | Trash: deleted projects (with their tasks), deleted tasks, days left, restore, permanent delete | TODO |

TODO: detail each screen using the template above. Wireframes (optional) go in `specs/04-web/wireframes/`.

## Open questions
OQ-021, OQ-029, OQ-030, OQ-036, OQ-038

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Screens updated for Google auth, the legacy time model, the dashboard and the trash.
- 2026-09-27: Added SCR-003 Landing page.
- 2026-09-27: SCR-003 detailed after OQ-043–045.
- 2026-09-27: Approved by the owner.
- 2026-09-29: OQ-047: SCR-003 moves to `/` and forwards `returnTo` to sign-in; app screens move under
  `/app/` (template example updated). OQ-048 added. Back to `review` (feat-land-app-route-split).
- 2026-09-29: OQ-048 resolved: SCR-003's "Go to app" opens a valid `returnTo`, else `/app/`.
- 2026-09-29: Approved by the owner.
- 2026-10-01: OQ-050: no trailing slashes (`trailingSlash: false`); detail routes `/app/project?id=` and `/app/task?id=`. Back to `review` (feat-land-app-route-split).
- 2026-10-01: Approved by the owner.
- 2026-10-02: Added SCR-004 App shell sidebar header (OQ-051, OQ-052).
- 2026-10-02: Detailed SCR-001 and SCR-002 (OQ-063, OQ-070). Back to `review` (feat-auth-web-session).
- 2026-10-03: Approved by the owner.
- 2026-10-03: Added SCR-005 user drawer and SCR-051 Profile; SCR-050 is now Settings (time zone) only (OQ-057, OQ-058, OQ-071…OQ-074). Back to `review` (feat-shell-user-menu).
- 2026-10-03: Approved by the owner.
