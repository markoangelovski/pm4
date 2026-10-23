---
id: prod-scope
title: Scope and Milestones
status: review
owner: Marko Angelovski
last_updated: 2026-10-23
related: [prod-vision, req-overview, req-integrations]
---

# Scope and Milestones

## Purpose
Defines what is in and out of scope for the MVP, and the milestone order that `tasks/` follows.

## In scope (MVP)
- A public landing page at the site root `/` describing what PM4 can do, with a header button: "Go to app" when signed in, "Login" when not. The app itself lives under `/app` (OQ-047).
- Sign in with Google. Accounts are created on first sign-in, restricted by an optional email allow-list (OQ-022). Sign out, and sign out of all devices. Profile with time zone.
- Projects: create, list, view, edit, delete (permanent; its tasks go with it). Task statistics per project. Project lead as a PM4 user or a free-text name (informational only, OQ-076).
- Tasks in a project (legacy fields and statuses): create, list/filter, view, edit, change status, move to another project, delete (permanent).
- Time capture: workdays with a start time, and time logs (15-minute durations + required log text, with an optional title, project and task),
  shown in entry order or grouped by project or task, with pie and bar charts and a calendar of past days.
- Bookings: a log's time booked to one or more dates (all of it or part), and a page that lists a date range day by day with the hours worked and booked per project, to book logs (or part of them) one by one or per project.
- Deleting is permanent. Time logs stay when their project or task is deleted, and keep its name.
- Dashboard: project and task counts, and for a date range the workdays' start times, the hours worked against the daily target,
  the booked hours, running totals and the hours per project.
- Integrations (M6): Settings → Integrations and the PMSPA connector: one connection per user, its status, importing PMSPA entities on a Connectors page and pushing PM4 entities to PMSPA (req-integrations).

## Out of scope (MVP)
- Sharing, teams, roles (single user per account). A project lead who is a PM4 user gets no access.
- Invoicing, billing rates, CSV/PDF export.
- Integrations other than the PMSPA connector (M6). The external link is just a URL.
- Native mobile apps, offline mode, notifications/email.
- i18n (English only).
- Staging/preview environments (production only).
- File storage (R2 reserved for the future).

## Milestones
Each milestone corresponds to a folder in `tasks/`.

| # | Milestone | Goal | Exit criteria |
| --- | --- | --- | --- |
| M0 | Foundation | Monorepo initialized. Both apps bootstrapped. Separate workflows deploy the web shell to GitHub Pages (custom domain) and the API to Azure. Neon and Redis connected. | Web shell reachable at the custom domain; API `/health` green on Azure (DB + Redis); web can call the API (CORS OK) |
| M1 | Auth | Google sign-in, session refresh, sign-out, protected routes and endpoints, profile/time zone, public landing page | FR-AUTH-*, FR-LAND-* done |
| M2 | Projects | Project CRUD end to end | FR-PRJ-* done |
| M3 | Tasks | Task CRUD and status workflow end to end | FR-TSK-* done |
| M4 | Time capture | Workdays and time logs end to end (all three views), bookings | FR-TLOG-*, FR-BOOK-* done |
| M5 | Reporting | Dashboard: counts, workday chart, worked / target / booked, running totals, hours by project | FR-RPT-* done |
| M6 | Integrations | Settings → Integrations, the PMSPA connector (connection, status, sync) and its Connectors page (OQ-141) | FR-INT-* done |
| M7 | Landing page | A complete redesign of the public landing page (OQ-151) | FR-LAND-* redesigned and done |

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Scope updated with the owner's answers (OQ-001–018).
- 2026-09-27: Added the public landing page (FR-LAND-*) to the MVP scope and M1.
- 2026-09-29: OQ-047: landing page at `/`, app under `/app/`.
- 2026-10-01: OQ-050: no trailing slashes (`trailingSlash: false`); detail routes `/app/project?id=` and `/app/task?id=` (feat-land-app-route-split).
- 2026-10-03: Projects: task statistics, project lead as a PM4 user or text (OQ-076); tasks can move between projects (OQ-084).
- 2026-10-07: Time-capture scope follows the owner's description.
- 2026-10-09: Bookings join M4.
- 2026-10-09: The dashboard follows the owner's Dashboard screen; the per-project line chart is dropped (OQ-126).
- 2026-10-14: Approved by the owner.
- 2026-10-14: M6 Integrations: the PMSPA connector joins the scope (OQ-141). Back to `review`.
- 2026-10-14: M7 Landing page: the landing page gets a complete redesign after M6 (OQ-151).
- 2026-10-15: M6 wording follows the connector capabilities: import from PMSPA, push to PMSPA (req-integrations).
- 2026-10-23: Bookings can cover part of a log, over several dates (feat-book-partial).
