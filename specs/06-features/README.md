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
| Projects API: CRUD, task counts, restore and the project-lead user search | [prj-api.md](prj-api.md) | M2 | approved |
| Projects web: list, detail with task statistics, create/edit dialog and the lead combobox | [prj-web.md](prj-web.md) | M2 | approved |
| Tasks API: CRUD, filters, move, status and restore | [tsk-api.md](tsk-api.md) | M3 | approved |
| Tasks web: task lists, inline status, due-date badges, task detail and the task dialog | [tsk-web.md](tsk-web.md) | M3 | approved |
