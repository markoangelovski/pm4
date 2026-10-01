---
id: prod-scope
title: Scope and Milestones
status: draft
owner: Marko Angelovski
last_updated: 2026-10-01
related: [prod-vision, req-overview]
---

# Scope and Milestones

## Purpose
Defines what is in and out of scope for the MVP, and the milestone order that `tasks/` follows.

## In scope (MVP)
- A public landing page at the site root `/` describing what PM4 can do, with a header button: "Go to app" when signed in, "Login" when not. The app itself lives under `/app` (OQ-047).
- Sign in with Google. Accounts are created on first sign-in, restricted by an optional email allow-list (OQ-022). Sign out, and sign out of all devices. Profile with time zone.
- Projects: create, list, view, edit, delete to trash.
- Tasks in a project (legacy fields and statuses): create, list/filter, view, edit, change status, delete to trash.
- Time capture: workdays with a start time, and time logs (duration + required note + task/project link),
  shown sequentially or grouped by project, and fast to enter repeatedly.
- Trash: restore for 31 days, permanent delete, automatic (best-effort) purge afterwards.
- Dashboard reporting: a date range with total hours, a per-project breakdown, and a line chart of
  hours per day with per-project series.

## Out of scope (MVP)
- Sharing, teams, roles (single user per account).
- Invoicing, billing rates, CSV/PDF export.
- Integrations (Jira etc.). The external link is just a URL.
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
| M2 | Projects | Project CRUD end to end (delete = soft delete) | FR-PRJ-* done |
| M3 | Tasks | Task CRUD and status workflow end to end | FR-TSK-* done |
| M4 | Time capture | Workdays and time logs end to end (both views) | FR-TLOG-* done |
| M5 | Reporting | Dashboard totals, breakdown, hours-per-day chart | FR-RPT-* done |
| M6 | Trash | Trash view, restore, permanent delete, background purge (ADR-0011) | FR-TRASH-* done |

Soft-delete *columns and filtering* are built into M2/M3 from the start. M6 adds the trash UI, restore, purge and retained-name handling.

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Scope updated with the owner's answers (OQ-001–018). Added M6 Trash.
- 2026-09-27: Added the public landing page (FR-LAND-*) to the MVP scope and M1.
- 2026-09-29: OQ-047: landing page at `/`, app under `/app/`.
- 2026-10-01: OQ-050: no trailing slashes (`trailingSlash: false`); detail routes `/app/project?id=` and `/app/task?id=` (feat-land-app-route-split).
