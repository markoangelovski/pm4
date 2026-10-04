---
id: web-screens
title: Screens
status: approved
owner: Marko Angelovski
last_updated: 2026-10-04
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
| SCR-001 | Sign in (`/auth/sign-in`, optional `?returnTo=&error=`): "Continue with Google" starts API-AUTH-001 with a valid `returnTo` and the browser's time zone. `?error=` shows an alert: `cancelled` → "Sign-in was cancelled.", `not-allowed` → "This account isn't allowed to use PM4. Continue with Google to choose a different account.", any other value → "Sign-in failed. Please try again." (OQ-063). Signed in already → goes to a valid `returnTo`, else `/app` (OQ-070) | TODO |
| SCR-002 | OAuth callback (`/auth/callback?code=&returnTo=`): spinner + "Signing in…" while API-AUTH-003 runs; then replaces the URL with a valid `returnTo`, else `/app`. No `code`, or the exchange fails → `/auth/sign-in?error=failed` (keeping a valid `returnTo`) | TODO |
| SCR-003 | Landing page (`/`, optional `?returnTo=`): marketing content about PM4 (FR-LAND-001); hero, feature grid (projects, tasks, time logs, dashboard, trash) and footer; header button "Go to app" when signed in, "Login" when not (FR-LAND-002). Login carries a valid `returnTo` on to sign-in (routing.md, OQ-047); "Go to app" opens a valid `returnTo`, else `/app` (OQ-048); `noindex`, with Open Graph tags (FR-LAND-003) | TODO |
| SCR-004 | App shell, sidebar header (every `/app/**` screen): the logo icon (the template's `logoicon.svg`), title **PM4**, subtitle **Project management**, all linking to `/app`; a version pill `v<web version>` (from `web/package.json`). Hovering or focusing the pill shows `Web v<web> · API v<api>`; the API part reads `API …` while `GET /api/v1/version` loads and `API —` if it fails (one request per page load, no retry, no error toast). Collapsed to icons: only the logo icon. The mobile header keeps the icon only (OQ-051, OQ-052) | TODO |
| SCR-005 | App shell, user drawer (every `/app/**` screen): the header avatar (Google photo, else initials, OQ-073) opens a drawer from the right, like the template's profile sheet: the avatar, name and email (API-USR-001), a separator, links **Home** (`/app`) and **Profile** (`/app/user-profile`), and at the bottom a separator and a **Sign out** button (FR-AUTH-004). Links close the drawer (OQ-057, OQ-074) | TODO |
| SCR-010 | Dashboard: range picker, total hours, project breakdown, hours-per-day chart with project multi-select | TODO |
| SCR-020 | Project list (`/app/projects?q=&sort=&page=`, FR-PRJ-002, API-PRJ-002): heading **Projects** with a **New project** button (SCR-022). Toolbar: a search box (placeholder "Search by title or lead…"; matches the title or the lead's name, title matches first, OQ-099; applied 300 ms after typing stops) and a sort select: **Recently updated** (default), **Recently created**, **Title A–Z**. A table: **Title** (the project icon, then the title linking to SCR-021; clicking anywhere else on the row also opens it, except while text is selected), **Project lead** (avatar + name for a user, the text for a text lead, `—` for none), **Tasks** (upcoming / in progress / completed counts as badges), **Completed** (a progress bar and `N %`, OQ-083), **Created** and **Updated** (date only, `d MMM yyyy`, e.g. "3 Oct 2026", in the user's time zone, OQ-100). 25 per page with pagination when there are more. States: loading (skeleton rows); no projects → "No projects yet" / "Create a project to start organising your tasks." with **New project**; no match → "No projects match your search"; error → "Couldn't load projects." with **Retry**. Narrow screens: the table scrolls sideways inside its card | TODO |
| SCR-021 | Project detail (`/app/project?id=&status=&q=&sort=&page=`, FR-PRJ-003/005/008, API-PRJ-003/005/006): a **Projects** back link, the project icon and the title with **Edit** (SCR-022) and **Delete**; a **Details** card (description with line breaks kept, the external link opening in a new tab, the project lead, **Created** and **Last modified** (date and time, `d MMMM yyyy, HH:mm`, e.g. "3 October 2026, 10:00", in the user's time zone, OQ-101); empty fields show `—`); a **Statistics** card: **Upcoming**, **In progress**, **Completed**, **Total** and the completed percentage with a progress bar (FR-PRJ-008); then the project's **Tasks** section (FR-TSK-002, SCR-030's table without the Project column, with **New task**, added by feat-tsk-web). **Delete** asks "Delete project?" / "“<title>” and its tasks move to the trash. You can restore them for 31 days." (**Cancel**, **Delete**), then goes to SCR-020 with the toast "Moved to trash" (OQ-086). States: loading (skeletons); not found → "Project not found" with **Back to projects**; in the trash → "This project is in the trash" / "Restore it to see and edit it again." with **Restore** (shows the project again) and **Back to projects**; error → "Couldn't load the project." with **Retry** | TODO |
| SCR-022 | Create/edit project dialog (FR-PRJ-001/004/006, API-PRJ-001/004): title **New project** / **Edit project**; fields **Title** (required), **Description** (textarea), **External link**, **Project lead** (the lead combobox below); **Cancel** and **Create** / **Save**. Create starts with the signed-in user as lead (OQ-078); edit starts from the saved values. Field errors show under each field, also those the API returns; any other failure → toast "Couldn't save the project." and the dialog stays open. Create → the new project's page (SCR-021) with the toast "Project created" (OQ-093); save → the dialog closes. **Lead combobox** (shared with SCR-032): the selected lead shows as avatar + name (user) or the text; typing ≥ 2 characters lists matching users (API-USR-003: avatar, name, email) and then **Use "<text>"**; 1 character lists only **Use "<text>"**; an empty box suggests the signed-in user (marked "(me)"). Leaving the box with typed text that wasn't picked keeps it as a text lead. A clear button removes the lead | TODO |
| SCR-030 | Task list (`/app/tasks?project=&status=&q=&sort=&page=`, FR-TSK-003/006/008, API-TSK-002/004): heading **Tasks** with **New task** (SCR-032 with a project picker). Toolbar: a **project** filter (a searchable project combobox, "All projects" by default), a **status** filter (three toggles, all on by default, OQ-081), a search box (300 ms) and a sort select: **Recently updated** (default), **Due date**, **Title A–Z**. A table: **Title** (links to SCR-031), **Project** (links to SCR-021), **Status** (an inline select, FR-TSK-006), **Due date** (`d MMM yyyy`, with an **Overdue** / **Due soon** badge, FR-TSK-008), **Project lead**. An inline status change saves at once; the row stays in place until the list is reloaded or re-filtered (OQ-087); a failed save puts the old status back and shows a toast "Couldn't change the status." 25 per page. States: loading; no tasks → "No tasks yet"; nothing matches (including no status selected) → "No tasks match the filter" (OQ-085); error with **Retry** | TODO |
| SCR-031 | Task detail (`/app/task?id=`, FR-TSK-004/006/007/008, API-TSK-003/004/005/006, API-PRJ-006): the title, an inline status select, **Edit** (SCR-032) and **Delete**; a details card: **Project** (link), **Due date** with its badge, **Project lead**, **External link** (new tab) and **Description**; empty fields show `—`. **Delete** asks "Delete task?" / "“<title>” moves to the trash. You can restore it for 31 days.", then goes to the task's project page with the toast "Moved to trash" (OQ-086). States: loading; not found → "Task not found" with **Back to tasks**; in the trash → "This task is in the trash" with **Restore**; its project in the trash → "This task's project is in the trash" with **Restore project** (FR-TRASH-003); error with **Retry**. Logged time comes with M4 (OQ-080) | TODO |
| SCR-032 | Create/edit task dialog (FR-TSK-001/005, API-TSK-001/004): title **New task** / **Edit task**; fields **Project** (required; a searchable project combobox, pre-selected when opened from a project), **Title** (required), **Status** (default **Upcoming**), **Due date** (a date picker with a clear button), **Project lead** (SCR-022's lead combobox; create suggests the signed-in user), **External link**, **Description**. Errors as in SCR-022 ("Couldn't save the task."). Create → the dialog closes and the task shows in the list the user is on, with the toast "Task created" (OQ-093); save → the dialog closes. Changing the project moves the task (FR-TSK-005) | TODO |
| SCR-040 | Day view: date nav, workday header (now · start · end), **sequential / group-by-project toggle**, logs, day total | TODO |
| SCR-041 | Add/edit log form: duration, required note, task/project picker (recent first), date. Stays open for repeated entry. | TODO |
| SCR-042 | Inline log row actions: edit, repeat, move up/down, delete | TODO |
| SCR-043 | Activity calendar (Could) | TODO |
| SCR-050 | Settings (`/app/settings`): time zone (FR-AUTH-006; the profile moved to SCR-051, OQ-058) | TODO |
| SCR-051 | Profile (`/app/user-profile`, read-only, API-USR-001): header card (avatar, name, email); **Account**: Name, Email, Signed in with: Google, Member since (date in the profile time zone), Time zone with a "Change in Settings" link; **Sessions**: **Sign out of all devices** behind a confirmation dialog (API-AUTH-006, FR-AUTH-007) (OQ-058, OQ-071, OQ-072) | TODO |
| SCR-060 | Trash: deleted projects (with their tasks), deleted tasks, days left, restore, permanent delete | TODO |

**Project icon** (SCR-020, SCR-021): a rounded square with a two-colour gradient computed from the project id, so it is stable and nothing is stored (owner-approved prototype, 2026-10-03).

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
- 2026-10-03: SCR-001 "not allowed" alert gets a hint to choose another account (OQ-075). Back to `review`.
- 2026-10-03: Approved by the owner.
- 2026-10-03: Detailed SCR-020…022 and SCR-030…032 (OQ-076…OQ-093; feat-prj-web, feat-tsk-web). Back to `review`.
- 2026-10-03: Approved by the owner.
- 2026-10-04: SCR-020…022 aligned with the owner-approved prototype: project icon, clickable rows, back link, empty-state and trash copy, "(me)" lead option. Back to `review` (feat-prj-web).
- 2026-10-04: Approved by the owner.
- 2026-10-04: SCR-020: **Created** and **Updated** columns, search by title or lead (OQ-099, OQ-100). SCR-021: **Created** and **Last modified** in *Details* (OQ-101). Back to `review` (feat-prj-dates-lead-search).
- 2026-10-04: Approved by the owner.
