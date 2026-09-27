---
id: web-screens
title: Screens
status: approved
owner: Marko Angelovski
last_updated: 2026-09-27
related: [web-routing, req-landing, req-projects, req-tasks, req-time-logs, req-reporting]
---

# Screens

## Purpose
Describes each screen: its purpose, content, actions, states, and the requirements and endpoints it uses.

## Screen template
```markdown
### SCR-020: Project list
**Route:** `/projects/` · **Implements:** FR-PRJ-002, FR-PRJ-001 · **API:** API-PRJ-002, API-PRJ-001
**Purpose:** …
**Layout / content:** … (reference template components to reuse)
**Actions:** …
**States:** loading · empty · error · populated
**Responsive notes:** …
```

## Screens
| ID | Name | Status |
| --- | --- | --- |
| SCR-001 | Sign in (Continue with Google) | TODO |
| SCR-002 | OAuth callback (spinner, error state) | TODO |
| SCR-003 | Landing page (`/home/`): marketing content about PM4 (FR-LAND-001); hero, feature grid (projects, tasks, time logs, dashboard, trash) and footer; header button "Go to app" when signed in, "Login" when not (FR-LAND-002); `noindex`, with Open Graph tags (FR-LAND-003) | TODO |
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
