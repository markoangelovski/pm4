# Task Board

**Next free ID:** T-0064

| ID | Title | Milestone | App | Size | Status | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| [T-0005](m0-foundation/T-0005-init-monorepo.md) | Initialize the pm4 monorepo | M0 | infra | S | done | — |
| [T-0001](m0-foundation/T-0001-bootstrap-api.md) | Bootstrap `api/` NestJS app | M0 | api | L | done | T-0005 |
| [T-0002](m0-foundation/T-0002-bootstrap-web-from-template.md) | Bootstrap `web/` from the dashboard template as a static export | M0 | web | L | done | T-0005 |
| [T-0003](m0-foundation/T-0003-web-github-pages-pipeline.md) | GitHub Pages workflow for `web/` | M0 | infra | M | done | T-0002 |
| [T-0004](m0-foundation/T-0004-api-azure-pipeline.md) | Azure Web App workflow for `api/` | M0 | infra | M | done | T-0001 |
| [T-0006](m0-foundation/T-0006-shared-prettier-config.md) | Same Prettier rules in `web/` and `api/` | M0 | infra | S | done | — |
| [T-0007](m1-auth/T-0007-return-to-helpers.md) | Implement the returnTo helpers in `web/lib/auth/return-to.ts` | M1 | web | S | done | — |
| [T-0008](m1-auth/T-0008-move-app-routes-under-app.md) | Slash-free URLs, app pages under `/app`, landing page at the root | M1 | web | M | done | T-0007 |
| [T-0009](m1-auth/T-0009-landing-cta-login-returnto.md) | Implement `LandingCta` and use it on the landing page | M1 | web | S | done | T-0007, T-0008 |
| [T-0010](m1-auth/T-0010-add-get-api-v1-version-api.md) | Add GET /api/v1/version (API-SYS-003) and export the OpenAPI document | M1 | api | S | done | — |
| [T-0011](m1-auth/T-0011-sidebar-header-branding-logo-title-subtitle.md) | Sidebar header branding: logo, title, subtitle, version pill with the API version tooltip | M1 | web | M | done | T-0010 |
| [T-0012](m1-auth/T-0012-sidebar-nav-hover-highlight.md) | Sidebar nav hover highlight like the template (CSS only) | M1 | web | S | done | — |
| [T-0013](m1-auth/T-0013-group-the-sidebar-nav-into-sections.md) | Group the sidebar nav into sections and move Settings to a fixed footer | M1 | web | S | done | — |
| [T-0014](m1-auth/T-0014-app-footer-copyright.md) | App footer: copyright line | M1 | web | S | done | — |
| [T-0015](m1-auth/T-0015-add-the-users-and-user-identities.md) | Add the users and user_identities tables and their migration | M1 | api | S | done | — |
| [T-0016](m1-auth/T-0016-access-tokens-the-default-deny-guard.md) | Access tokens, the default-deny guard and GET /me | M1 | api | M | done | T-0010, T-0015 |
| [T-0017](m1-auth/T-0017-google-sign-in-login-codes-refresh.md) | Google sign-in, login codes, refresh rotation and sign-out | M1 | api | M | done | T-0016 |
| [T-0018](m1-auth/T-0018-token-storage-session-refresh-and-the.md) | Token storage, session refresh and the authenticated API client | M1 | web | M | done | T-0017 |
| [T-0019](m1-auth/T-0019-auth-guard-sign-in-callback-landing.md) | Auth guard, sign-in, callback, landing "Go to app" and sign-out | M1 | web | M | done | T-0018 |
| [T-0020](m1-auth/T-0020-user-drawer-useme-usesignouteverywhere-useravatar-and.md) | User drawer: useMe, useSignOutEverywhere, UserAvatar and the header drawer | M1 | web | M | done | T-0019 |
| [T-0021](m1-auth/T-0021-profile-page-app-user-profile-with.md) | Profile page /app/user-profile with sign out of all devices | M1 | web | S | done | T-0020 |
| [T-0022](m2-projects/T-0022-add-the-projects-and-tasks-tables.md) | Add the projects and tasks tables, the task_status enum and their migration | M2 | api | S | done | T-0015 |
| [T-0023](m2-projects/T-0023-projects-module-api-prj-001-005.md) | Projects module (API-PRJ-001…005) with task counts and the project lead | M2 | api | M | done | T-0022, T-0017 |
| [T-0024](m2-projects/T-0024-get-users-user-search-for-the.md) | GET /users user search for the lead picker (API-USR-003) | M2 | api | S | done | T-0023 |
| [T-0025](m2-projects/T-0025-dependencies-providers-api-error-helpers-project.md) | Dependencies, providers, API error helpers, project and user-search hooks, lead helpers | M2 | web | M | done | T-0024, T-0021 |
| [T-0026](m2-projects/T-0026-projectleadfield-projectleadlabel-and-the-project-create.md) | ProjectLeadField, ProjectLeadLabel and the project create/edit dialog | M2 | web | M | done | T-0025 |
| [T-0027](m2-projects/T-0027-projects-list-page-and-project-detail.md) | Projects list page and project detail page (stats, delete, not found) | M2 | web | M | done | T-0026 |
| [T-0028](m3-tasks/T-0028-tasks-module-api-tsk-001-005.md) | Tasks module (API-TSK-001…005): CRUD, filters, move | M3 | api | M | done | T-0024 |
| [T-0029](m3-tasks/T-0029-task-hooks-with-the-optimistic-status.md) | Task hooks with the optimistic status change, due state, formatWorkDate, status select and due badge | M3 | web | M | done | T-0028, T-0027 |
| [T-0030](m3-tasks/T-0030-task-create-edit-dialog-with-the.md) | Task create/edit dialog with the project picker and due-date field | M3 | web | M | done | T-0029 |
| [T-0031](m3-tasks/T-0031-task-lists-project-page-section-and.md) | Task lists (project page section and /app/tasks), task detail page and delete | M3 | web | M | done | T-0030 |
| [T-0032](m1-auth/T-0032-base-ui-link-buttons-native-button-false.md) | Render links styled as buttons as a plain Link with buttonVariants | M1 | web | S | done | — |
| [T-0033](m1-auth/T-0033-problem-details-schema-the-apiproblemresponses-decorator.md) | Problem Details schema, the ApiProblemResponses decorator and error responses on the existing controllers | M1 | api | S | done | — |
| [T-0034](m1-auth/T-0034-regenerate-the-web-api-types-for.md) | Regenerate the web API types for the Problem Details responses | M1 | web | S | done | T-0033 |
| [T-0035](m1-auth/T-0035-add-format-check-to-pm4-gates.md) | Add format:check to pm4 check's gates and fix the two unformatted web files | M1 | infra | S | done | — |
| [T-0036](m1-auth/T-0036-release-script-workflow-version-stamp-tag.md) | Release script, workflow version/stamp/tag steps, frozen 0.0.0 versions | M1 | infra | M | done | — |
| [T-0037](m2-projects/T-0037-project-search-also-matches-the-lead.md) | Project search also matches the lead's name, title matches first (API-PRJ-002 q) | M2 | api | S | done | — |
| [T-0038](m2-projects/T-0038-project-dates-in-the-list-and.md) | Project dates in the list and detail, the lead-search placeholder, regenerated API types | M2 | web | S | done | T-0037 |
| [T-0039](m4-time-logs/T-0039-schema-migration-workdays-time-logs-users.md) | Schema + migration (workdays, time_logs, users.daily_target_minutes) and PATCH /me | M4 | api | S | done | — |
| [T-0040](m4-time-logs/T-0040-time-module-workdays-time-logs-link.md) | time module: workdays, time logs, link and day-start rules, moving a task's logs | M4 | api | L | done | T-0039 |
| [T-0041](m4-time-logs/T-0041-data-hooks-features-time-api-ts.md) | Data hooks (features/time/api.ts) and useUpdateMe | M4 | web | S | done | — |
| [T-0042](m4-time-logs/T-0042-log-dialog-date-field-project-and.md) | Log dialog, date field, project and task pickers, header **Log time** button | M4 | web | M | done | T-0041 |
| [T-0043](m4-time-logs/T-0043-day-view-header-day-picker-with.md) | Day view: header, day picker with calendar, charts, rows, grouped views, delete | M4 | web | L | done | T-0041, T-0042 |
| [T-0044](m4-time-logs/T-0044-settings-page-with-the-user-settings.md) | Settings page with the User settings tab | M4 | web | S | done | T-0041 |
| [T-0045](m4-time-logs/T-0045-booking-date-column-and-migration-get.md) | booking_date column and migration, GET/PUT /bookings, clearing the booking in PATCH /time-logs | M4 | api | M | done | — |
| [T-0046](m4-time-logs/T-0046-booking-hooks-features-bookings-api-ts.md) | Booking hooks (features/bookings/api.ts) | M4 | web | S | done | — |
| [T-0047](m4-time-logs/T-0047-bookings-page-range-in-the-url.md) | Bookings page: range in the URL, day sections with the collapsible table, booking cell, Book all, route and sidebar link | M4 | web | L | done | T-0046 |
| [T-0048](m5-reporting/T-0048-dashboard-report-get-reports-dashboard-its.md) | Dashboard report: GET /reports/dashboard, its DTOs and two repository queries | M5 | api | M | done | — |
| [T-0049](m5-reporting/T-0049-dashboard-hooks-features-dashboard-api-ts.md) | Dashboard hooks (features/dashboard/api.ts): the report and the counts | M5 | web | S | done | — |
| [T-0050](m5-reporting/T-0050-dashboard-page-range-picker-in-the.md) | Dashboard page: range picker in the URL, count tiles, workday chart and table, worked / target / booked, running totals, hours by project | M5 | web | L | done | T-0049 |
| [T-0051](m4-time-logs/T-0051-replacing-a-log-link-clears-retained-names.md) | Replacing a time log's link clears the retained names of a deleted task or project | M4 | api | S | done | T-0045 |
| [T-0052](m0-foundation/T-0052-prototype-separation-guards.md) | Prototype separation guards (dev-only routes, import rules, build check) | M0 | web | S | done | — |
| [T-0053](m0-foundation/T-0053-migrate-confirmed-prototype.md) | Migrate the confirmed UI prototype to the prototype layout (dev-only routes, twins, mock client) | M0 | web | L | done | T-0052 |
| [T-0054](m4-time-logs/T-0054-loggedminutes-on-projects-and-tasks-get.md) | loggedMinutes on projects and tasks, GET /time-logs (API-TLOG-001), openapi:export | M4 | api | M | done | — |
| [T-0055](m4-time-logs/T-0055-logged-time-on-the-web-usetimelogs.md) | Logged time on the web: useTimeLogs and the invalidations (D3), the prototype api.ts twins without proposed types, the Logged column and Logged time section from the prototype | M4 | web | M | done | T-0054 |
| [T-0056](m4-time-logs/T-0056-dashboard-and-bookings-components-from-the.md) | Dashboard and Bookings components from the prototype; format / format:check cover features and proto | M4 | web | M | done | T-0055 |
| [T-0057](m4-time-logs/T-0057-pm4-multi-task-acs-and-manual-blocks.md) | pm4 handles ACs of several tasks and keeps manual blocks | M4 | infra | S | done | — |
| [T-0058](m4-time-logs/T-0058-pm4-twins-check.md) | pm4 compares production files with their prototype twins (pm4 twins, in check) | M4 | infra | S | done | T-0057 |
| [T-0059](m4-time-logs/T-0059-retire-proto-sync-web-twin-checks.md) | Retire proto-sync-web's own twin checks (AC-18, AC-19, AC-22); the twin check covers them | M4 | spec | S | done | T-0058 |
| [T-0060](m4-time-logs/T-0060-permanent-delete-of-projects-and-tasks.md) | Permanent delete of projects and tasks, migration 0005 | M4 | api | M | done | — |
| [T-0061](m4-time-logs/T-0061-delete-day-api-wd-004-the.md) | Delete day (API-WD-004), the time read model and Problem bodies | M4 | api | M | done | T-0060 |
| [T-0062](m4-time-logs/T-0062-promote-the-prototype-the-marker-delete.md) | Promote the prototype: the marker, delete dialogs, relink, Delete day; Settings-only sidebar footer | M4 | web | M | done | T-0061 |
| [T-0063](m4-time-logs/T-0063-drop-deleted-at-migration-0006-after.md) | Drop deleted_at (migration 0006), after the release with T1–T3 is live (D2) | M4 | api | S | done | T-0062 |

M0–M5 are done. M6 (Integrations) has no tasks yet; its tasks are created with the `write-task` skill once its feature specs are approved.
