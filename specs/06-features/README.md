# Feature specs

A feature spec is the **implementation plan** for one feature: exact files, patterns to copy,
signatures, edge cases, acceptance tests and a tiered task list. It's written so that a cheaper model
can implement each task without making a design decision.

The layer specs remain the source of the contract and behavior:
- `01-requirements/`: what the user can do (FR-*)
- `03-api/`: endpoints and data model
- `04-web/`: routes and screens

A feature spec links to those. It doesn't copy them.

- Template: [_TEMPLATE.md](_TEMPLATE.md). File name: `<area>-<slug>.md` (e.g. `prj-crud.md`), `id: feat-<area>-<slug>`.
- A feature spec can be `approved` only when the requirements, endpoints and data-model sections it
  links are approved too. Approval can be per item: the owner may approve individual `FR-…`/`API-…`
  entries of a spec that stays `draft` for other reasons. Record that in that spec's changelog
  ("The owner approved FR-AUTH-001, … for feat-…"), which counts as approval for those items.
- A feature with web UI is written from the owner's confirmed UI prototype (`04-web/prototype.md`, ADR-0012):
  the spec states only the delta from prototype to production, and its web tasks promote prototype files (`P` rows).
- Small changes don't need a feature spec: see the quick lane in `05-quality/task-routing.md#lanes`.
- Implementers never read the whole spec. They read `node scripts/pm4.mjs brief <T-####>`, so keep
  what they need in the sections the brief includes (see the template's comment).
- Tasks: every row in its *Tasks* table becomes a `T-####` file (`write-task`). The task file points back to the row.

## Index

| Feature | File | Milestone | Status |
| --- | --- | --- | --- |
| Landing page at the root, app under `/app` | [land-app-route-split.md](land-app-route-split.md) | M1 | approved |
| Sidebar header branding with web and API versions | [shell-sidebar-branding.md](shell-sidebar-branding.md) | M1 | approved |
| Sidebar sections and fixed footer | [shell-sidebar-sections.md](shell-sidebar-sections.md) | M1 | approved |
| Auth API: Google sign-in, sessions and the current user | [auth-api-session.md](auth-api-session.md) | M1 | approved |
| Auth web: sign-in, session restore, refresh and sign-out | [auth-web-session.md](auth-web-session.md) | M1 | approved |
| Problem Details error responses in the OpenAPI contract | [api-error-docs.md](api-error-docs.md) | M1 | approved |
| User drawer and profile page | [shell-user-menu.md](shell-user-menu.md) | M1 | approved |
| Projects API: CRUD, task counts and the project-lead user search | [prj-api.md](prj-api.md) | M2 | approved |
| Projects web: list, detail with task statistics, create/edit dialog and the lead combobox | [prj-web.md](prj-web.md) | M2 | approved |
| Tasks API: CRUD, filters, move and status | [tsk-api.md](tsk-api.md) | M3 | approved |
| Tasks web: task lists, inline status, due-date badges, task detail and the task dialog | [tsk-web.md](tsk-web.md) | M3 | approved |
| Automatic release versions from git tags and conventional commits | [ops-release-versions.md](ops-release-versions.md) | M1 | approved |
| Projects: created/updated dates and search by project lead | [prj-dates-lead-search.md](prj-dates-lead-search.md) | M2 | approved |
| Time logging API: workdays, time logs, the daily target | [tlog-api.md](tlog-api.md) | M4 | approved |
| Time logging web: the Logs day view, log dialog, charts and settings | [tlog-web.md](tlog-web.md) | M4 | approved |
| Bookings API: booking dates on time logs | [book-api.md](book-api.md) | M4 | approved |
| Bookings web: the Bookings page | [book-web.md](book-web.md) | M4 | approved |
| Dashboard API: the dashboard report | [rpt-api.md](rpt-api.md) | M5 | approved |
| Dashboard web: the dashboard page | [rpt-web.md](rpt-web.md) | M5 | approved |
| Prototype sync: logged time on projects and tasks, Dashboard and Bookings from the prototype | [proto-sync-web.md](proto-sync-web.md) | M4 | approved |
| Permanent delete of projects and tasks, and Delete day | [hard-delete.md](hard-delete.md) | M4 | approved |
| PMSPA connection API: connect, test, disconnect, and the PMSPA client | [int-conn-api.md](int-conn-api.md) | M6 | approved |
| PMSPA sync API: links, browsing, import and two-way sync of projects and tasks | [int-sync-api.md](int-sync-api.md) | M6 | approved |
| PMSPA time API: PMSPA days, time import and day push | [int-time-api.md](int-time-api.md) | M6 | approved |
| PMSPA connector web: Integrations settings, the connector page, sync and push, sync flags | [int-web.md](int-web.md) | M6 | approved |
| PMSPA call budget: the requests line, fewer PMSPA calls, integrations on the profile | [int-budget.md](int-budget.md) | M6 | approved |
| PMSPA follow-ups: log limits in the preview, created-in-PMSPA dates, a token per connection, cheaper Expand all, error lines | [int-followups.md](int-followups.md) | M6 | approved |
| Booking prompt: the day's logs as a Slack prompt | [tlog-prompt.md](tlog-prompt.md) | M4 | review |
| Partial bookings: a log's time booked in parts to several dates | [book-partial.md](book-partial.md) | M4 | approved |
| Prototype sync: Logged time chart, billable hours, Statistics link and Bookings day links | [proto-sync-logged-chart.md](proto-sync-logged-chart.md) | M4 | approved |
| Bookings navigation: range presets, project filter, Expand all, links between a booking's two days | [book-web-nav.md](book-web-nav.md) | M4 | approved |
| Notes and to-dos: API, the Notes page, project and task cards, the New menu | [note-todos.md](note-todos.md) | M8 | approved |
| Projects list: expandable task rows | [prj-task-rows.md](prj-task-rows.md) | M2 | approved |
| Installable web app (PWA): the app shell offline and an offline banner | [shell-pwa.md](shell-pwa.md) | M0 | approved |
| New menu with project, task and log; floating Log time button | [shell-new-menu.md](shell-new-menu.md) | M0 | approved |
| Project services: a project's services, a task's service, the Prompt's Service line | [prj-services.md](prj-services.md) | M2 | approved |
