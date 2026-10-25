# Task Board

**Next free ID:** T-0116

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
| [T-0064](m6-integrations/T-0064-problemexception-and-the-filter-502-503.md) | ProblemException and the filter, 502/503 in @ApiProblemResponses, pmspaProblems, PMSPA_ENCRYPTION_KEY | M6 | api | S | done | — |
| [T-0065](m6-integrations/T-0065-pmspacrypto-url-policy-host-guard-pmspastore.md) | PmspaCrypto, URL policy, host guard, PmspaStore (AC-15, AC-16) | M6 | api | M | done | T-0064 |
| [T-0066](m6-integrations/T-0066-pmspa-tables-migration-0007-pmspamodule-scaffold.md) | PMSPA tables, migration 0007, PmspaModule scaffold | M6 | api | S | done | T-0064 |
| [T-0067](m6-integrations/T-0067-pmspatransport-the-connection-repository-pmspaclient-the.md) | PmspaTransport, the connection repository, PmspaClient, the module's providers | M6 | api | M | done | T-0065, T-0066 |
| [T-0068](m6-integrations/T-0068-dtos-service-controller-openapi-export-api.md) | DTOs, service, controller, OpenAPI export (API-INT-001…004) | M6 | api | M | done | T-0067 |
| [T-0069](m6-integrations/T-0069-field-mapping-and-fingerprints-pmspa-fields.md) | Field mapping and fingerprints (pmspa-fields.ts), the PMSPA projects/tasks client (pmspa-remote.ts), the write mappers (pmspa-writes.ts) | M6 | api | M | done | — |
| [T-0070](m6-integrations/T-0070-link-and-sync-repositories-api-int.md) | Link and sync repositories, API-INT-005/006/012/013/014 | M6 | api | M | done | T-0069 |
| [T-0071](m6-integrations/T-0071-preview-rows-pmspa-preview-ts-import.md) | Preview rows (pmspa-preview.ts): import and sync rows over a snapshot, pure | M6 | api | M | done | T-0069, T-0070 |
| [T-0072](m6-integrations/T-0072-sync-dtos-the-snapshot-loader-the.md) | Sync DTOs, the snapshot loader, the two preview endpoints (API-INT-008, API-INT-015) | M6 | api | M | done | T-0071 |
| [T-0073](m6-integrations/T-0073-the-commits-lock-row-by-row.md) | The commits: lock, row-by-row writes on both sides, links and hashes, last_sync_at (API-INT-009, API-INT-016) | M6 | api | L | done | T-0072 |
| [T-0074](m6-integrations/T-0074-time-mapping-pmspa-time-fields-ts.md) | Time mapping (pmspa-time-fields.ts), the PMSPA days client, API-INT-007 and the time-log link detail | M6 | api | M | done | — |
| [T-0075](m6-integrations/T-0075-time-preview-rows-pmspa-time-preview.md) | Time preview rows (pmspa-time-preview.ts), pure, and the exported row builders of pmspa-preview.ts | M6 | api | M | done | T-0074 |
| [T-0076](m6-integrations/T-0076-time-dtos-the-time-snapshot-loader.md) | Time DTOs, the time snapshot loader, the import preview with dates, the push preview (API-INT-008 dates, API-INT-010) | M6 | api | M | done | T-0075 |
| [T-0077](m6-integrations/T-0077-the-import-commit-of-day-and.md) | The import commit of day and event rows (API-INT-009 dates) | M6 | api | M | done | T-0076 |
| [T-0078](m6-integrations/T-0078-the-push-commit-event-writes-moves.md) | The push commit: event writes, moves, D3 linking, empty-event deletes, the push endpoint (API-INT-011) | M6 | api | L | done | T-0077 |
| [T-0079](m6-integrations/T-0079-types-switch-d1-features-integrations-api.md) | Types switch (D1), features/integrations/api.ts, sync.ts with pmspaProblemText, the Settings → Integrations tab, routes and the Connectors sidebar section | M6 | web | M | done | — |
| [T-0080](m6-integrations/T-0080-the-connector-page-and-route-the.md) | The connector page and route, the dialog, Sync / Push buttons, sync flags, the error lines, and the project/task/day twins | M6 | web | M | done | T-0079 |
| [T-0081](m6-integrations/T-0081-rate-limit-store-transport-observe-connection.md) | Rate limit: store, transport observe, connection service; openapi:export | M6 | api | S | done | — |
| [T-0082](m6-integrations/T-0082-browse-reads-inparallel-and-the-remote.md) | Browse reads: inParallel and the remote methods, dayItems, API-INT-006/007/017/018 | M6 | api | M | done | T-0081 |
| [T-0083](m6-integrations/T-0083-import-the-snapshot-for-dates-the.md) | Import: the snapshot for dates, the time preview's order, reasons and taskPath, push taskPath, days on preview and import | M6 | api | M | done | T-0082 |
| [T-0084](m6-integrations/T-0084-linked-only-reads-loadlinked-for-sync.md) | Linked-only reads: loadLinked for sync and push previews and commits, the pick check, candidates: null, API-INT-019 | M6 | api | M | done | T-0083 |
| [T-0085](m6-integrations/T-0085-type-switch-in-the-prototype-then.md) | Type switch in the prototype, then the twins: hooks, rate-limit line, account badge, connector header, both Expand alls, lazy Time days, dialog icons and lazy Link to existing, Profile → Integrations | M6 | web | M | done | T-0084 |
| [T-0086](m6-integrations/T-0086-preview-warnings-d1-and-pmspacreatedat-on.md) | Preview warnings (D1) and pmspaCreatedAt on the link list (D2) | M6 | api | S | done | — |
| [T-0087](m6-integrations/T-0087-a-token-per-connection-store-owner.md) | A token per connection: store owner, setStatusFor, request's stale and account checks, the connection service callers | M6 | api | S | done | T-0086 |
| [T-0088](m6-integrations/T-0088-type-switch-in-the-prototype-then.md) | Type switch in the prototype, then the twins: Expand all, task list error line, commit failure line, created-in-PMSPA stamp, column and popover | M6 | web | S | done | T-0087 |
| [T-0089](m4-time-logs/T-0089-the-prompt-item-and-dialog-the.md) | The Prompt item and dialog: the three prototype twins | M4 | web | S | done | — |
| [T-0090](m4-time-logs/T-0090-fixed-header-and-footer-scrolling-body.md) | Fixed header and footer, scrolling body (D7): the confirmed prototype dialog's twin | M4 | web | S | done | T-0089 |
| [T-0091](m4-time-logs/T-0091-editable-notes-d8-the-confirmed-prototype.md) | Editable notes (D8): the confirmed prototype's prompt.ts and dialog twins | M4 | web | S | done | T-0090 |
| [T-0092](m4-time-logs/T-0092-bookings-table-and-migration-0008-the.md) | bookings table and migration 0008, the booking read model, PUT /bookings, the booked-time rule in PATCH /time-logs, booked minutes in lists and reports | M4 | api | L | done | — |
| [T-0093](m4-time-logs/T-0093-pmspa-without-the-booked-flag-the.md) | PMSPA without the booked flag; the import's booked-time failure and its preview warning | M4 | api | M | done | T-0092 |
| [T-0094](m4-time-logs/T-0094-booking-hooks-the-twin-the-prototype.md) | Booking hooks (the twin), the prototype on the generated types, the mock import's booked-time warning and failure | M4 | web | S | done | T-0093 |
| [T-0095](m4-time-logs/T-0095-drop-booking-date-migration-0009-after.md) | Drop booking_date (migration 0009) and the copy step from 0008, in the same release as T1–T3 (D2) | M4 | api | S | done | T-0094 |
| [T-0096](m4-time-logs/T-0096-rename-two-booking-test-names.md) | Rename two time-logs service test names that still say "bookingDate null" | M4 | api | S | done | — |
| [T-0097](m6-integrations/T-0097-setstatusfor-miss-e2e-test.md) | An e2e test that setStatusFor misses once the connection's URL or email changed | M6 | api | S | done | — |
| [T-0098](m6-integrations/T-0098-recheck-owner-before-caching.md) | A re-login caches the token and account only while the connection still has the request's URL and email | M6 | api | S | done | — |
| [T-0099](m4-time-logs/T-0099-days-on-get-time-logs-api.md) | days on GET /time-logs (API-TLOG-001), openapi:export | M4 | api | S | done | — |
| [T-0100](m4-time-logs/T-0100-web-from-the-prototype-the-logged.md) | Web from the prototype: the Logged time chart and tabs, LoggedDay and the prototype api.ts twin, the Logs header and pie dialog, Bookings day links, the Statistics link | M4 | web | M | done | T-0099 |
| [T-0101](m4-time-logs/T-0101-bookings-from-the-prototype-presets-project.md) | Bookings from the prototype: presets, Project filter, Expand all, booking links (promote two files, copy five twins) | M4 | web | S | done | — |
| [T-0102](m4-time-logs/T-0102-bookings-anchor-and-expand-all-heading.md) | Bookings: a crafted hash no longer crashes the page, and Expand all moves out of the day heading | M4 | web | S | done | — |
| [T-0103](m8-notes/T-0103-notes-and-todos-tables-migration-0010.md) | notes and todos tables, migration 0010, the notes service and repository, ItemLinkService, retained names and task moves for both tables | M8 | api | M | done | — |
| [T-0104](m8-notes/T-0104-the-to-dos-service-and-repository.md) | The to-dos service and repository | M8 | api | S | done | T-0103 |
| [T-0105](m8-notes/T-0105-the-web-twins-of-the-notes.md) | The web: twins of the notes domain, range picker, project and task detail; the page, route, sidebar item and header menu | M8 | web | M | done | — |
| [T-0106](m0-foundation/T-0106-web-vitest-test-timeout.md) | Raise the web Vitest test timeout so the full suite stops timing out under load | M0 | web | S | done | — |
| [T-0107](m6-integrations/T-0107-pmspa-rate-limit-refresh-race.md) | The PMSPA rate-limit refresh no longer misses a PMSPA call that settles between two renders (AC-14 flake) | M6 | web | S | done | — |
| [T-0108](m2-projects/T-0108-promote-project-task-rows-tsx-apply.md) | Promote project-task-rows.tsx, apply the prototype diff to projects-list.tsx | M2 | web | S | done | — |
| [T-0109](m0-foundation/T-0109-web-pm4-logo-and-favicons.md) | Replace the template logo and favicon with the PM4 mark, add the icon set | M0 | web | S | done | — |
| [T-0110](m0-foundation/T-0110-api-favicon.md) | Serve the PM4 favicon from the API and use it in the Swagger UI | M0 | api | S | done | T-0109 |
| [T-0111](m0-foundation/T-0111-web-animated-logo-loading.md) | Show the animated PM4 logo instead of the spinner while the session is checked | M0 | web | S | done | T-0109 |
| [T-0112](m0-foundation/T-0112-manifest-theme-colour-the-service-worker.md) | Manifest, theme colour, the service worker, the build script that writes out/sw.js, and its registration | M0 | web | M | done | — |
| [T-0113](m0-foundation/T-0113-offline-banner-promote-it-mount-it.md) | Offline banner: promote it, mount it in the app shell, and add it with the online retry to AuthGuard's unavailable screen | M0 | web | S | done | T-0112 |
| [T-0114](m0-foundation/T-0114-new-menu-with-project-task-and.md) | New menu with Project, Task and Log; floating swipeable Log time button in the layout | M0 | web | S | done | — |
| [T-0115](m0-foundation/T-0115-log-time-button-key-after-swipe.md) | Log time button: a key press after a touch swipe is never swallowed | M0 | web | S | done | — |

M0–M6 are done. Later follow-ups are filed under the milestone they extend.
