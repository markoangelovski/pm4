---
id: web-routing
title: Routing and Navigation
status: approved
owner: Marko Angelovski
last_updated: 2026-09-27
related: [web-static-export, web-screens, req-landing]
---

# Routing and Navigation

## Purpose
Defines the URL structure and navigation. Every route must exist at build time (static export).

## Entity routes (OQ-014: decided)
Single-entity pages use **query-param routes**: `/projects/view/?id=<uuid>`. There's one static page,
and the client reads `id` with `useSearchParams` (inside `<Suspense>`).
- **`id` missing or empty → redirect (replace) to the list** (`/projects/`, `/tasks/`).
- `id` not found → a "Not found" state with a link back to the list. If it's in the trash → a "This project is in the trash" state with **Restore**.

## Route map
| Route | Screen | Auth |
| --- | --- | --- |
| `/home/` | SCR-003 Landing page (marketing, "Go to app" / "Login" header button) | public |
| `/auth/sign-in/?returnTo=` | SCR-001 Sign in (Google) | public |
| `/auth/callback/?code=&returnTo=` | SCR-002 OAuth callback (token exchange, then redirect) | public |
| `/` | SCR-010 Dashboard (range, total, breakdown, chart) | required |
| `/projects/` | SCR-020 Project list | required |
| `/projects/view/?id=` | SCR-021 Project detail (tasks, totals) | required |
| `/tasks/` | SCR-030 Task list (all projects) | required |
| `/tasks/view/?id=` | SCR-031 Task detail (with its time logs) | required |
| `/time/?date=&view=sequential\|project` | SCR-040 Day view (workday header, logs, view toggle) | required |
| `/trash/` | SCR-060 Trash | required |
| `/settings/` | SCR-050 Profile and settings (time zone) | required |

## Navigation
- Sidebar: Dashboard, Time, Projects, Tasks, Trash, Settings.
- Header: a global **Log time** button (FR-TLOG-008), the user menu (avatar, settings, sign out) and the theme toggle.
- Landing page (`/home/`, FR-LAND-001/002): public, outside the app shell and its auth guard. It has its own marketing header with the "Go to app" / "Login" button, not the sidebar.
- Auth guard: the shell layout waits for session restore (refresh). Without a session, it redirects to `/auth/sign-in/?returnTo=<path+query>`, except on the root `/`, which redirects to `/home/` (OQ-044).
- The sign-in screen's logo links to `/home/`.
- No page is indexable (FR-LAND-003): every page carries a `noindex` robots directive, and there is no sitemap.
- All internal links use `next/link`. `returnTo` must be a same-origin relative path.

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Query-param routes confirmed with the missing-id redirect. Added auth callback, time and trash routes.
- 2026-09-27: Added the public landing page route `/home/` (SCR-003).
- 2026-09-27: OQ-044/045 resolved: `/` without a session → `/home/`; sign-in logo → `/home/`; no page indexable.
- 2026-09-27: Approved by the owner.
