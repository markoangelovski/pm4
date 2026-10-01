---
id: web-screens
title: Screens
status: approved
owner: Marko Angelovski
last_updated: 2026-10-01
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
| SCR-001 | Sign in (Continue with Google) | TODO |
| SCR-002 | OAuth callback (spinner, error state) | TODO |
| SCR-003 | Landing page (`/`, optional `?returnTo=`): marketing content about PM4 (FR-LAND-001); hero, feature grid (projects, tasks, time logs, dashboard, trash) and footer; header button "Go to app" when signed in, "Login" when not (FR-LAND-002). Login carries a valid `returnTo` on to sign-in (routing.md, OQ-047); "Go to app" opens a valid `returnTo`, else `/app` (OQ-048); `noindex`, with Open Graph tags (FR-LAND-003) | TODO |
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
| SCR-050 | Profile and settings (time zone) | TODO |
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
