# Task Board

**Next free ID:** T-0033

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
| [T-0013](m1-auth/T-0013-group-the-sidebar-nav-into-sections.md) | Group the sidebar nav into sections and move Trash and Settings to a fixed footer | M1 | web | S | done | — |
| [T-0014](m1-auth/T-0014-app-footer-copyright-and-legal-links.md) | App footer: copyright line and Terms and Conditions / Privacy links | M1 | web | S | done | — |
| [T-0015](m1-auth/T-0015-add-the-users-and-user-identities.md) | Add the users and user_identities tables and their migration | M1 | api | S | review | — |
| [T-0016](m1-auth/T-0016-access-tokens-the-default-deny-guard.md) | Access tokens, the default-deny guard and GET /me | M1 | api | M | ready | T-0010, T-0015 |
| [T-0017](m1-auth/T-0017-google-sign-in-login-codes-refresh.md) | Google sign-in, login codes, refresh rotation and sign-out | M1 | api | M | blocked | T-0016 |
| [T-0018](m1-auth/T-0018-token-storage-session-refresh-and-the.md) | Token storage, session refresh and the authenticated API client | M1 | web | M | blocked | T-0017 |
| [T-0019](m1-auth/T-0019-auth-guard-sign-in-callback-landing.md) | Auth guard, sign-in, callback, landing "Go to app" and sign-out | M1 | web | M | blocked | T-0018 |
| [T-0020](m1-auth/T-0020-user-drawer-useme-usesignouteverywhere-useravatar-and.md) | User drawer: useMe, useSignOutEverywhere, UserAvatar and the header drawer | M1 | web | M | blocked | T-0019 |
| [T-0021](m1-auth/T-0021-profile-page-app-user-profile-with.md) | Profile page /app/user-profile with sign out of all devices | M1 | web | S | blocked | T-0020 |
| [T-0022](m2-projects/T-0022-add-the-projects-and-tasks-tables.md) | Add the projects and tasks tables, the task_status enum and their migration | M2 | api | S | review | T-0015 |
| [T-0023](m2-projects/T-0023-projects-module-api-prj-001-006.md) | Projects module (API-PRJ-001…006) with task counts, the project lead and the in-trash Problem type | M2 | api | M | blocked | T-0022, T-0017 |
| [T-0024](m2-projects/T-0024-get-users-user-search-for-the.md) | GET /users user search for the lead picker (API-USR-003) | M2 | api | S | blocked | T-0023 |
| [T-0025](m2-projects/T-0025-dependencies-providers-api-error-helpers-project.md) | Dependencies, providers, API error helpers, project and user-search hooks, lead helpers | M2 | web | M | blocked | T-0024, T-0021 |
| [T-0026](m2-projects/T-0026-projectleadfield-projectleadlabel-and-the-project-create.md) | ProjectLeadField, ProjectLeadLabel and the project create/edit dialog | M2 | web | M | blocked | T-0025 |
| [T-0027](m2-projects/T-0027-projects-list-page-and-project-detail.md) | Projects list page and project detail page (stats, delete, restore, not found) | M2 | web | M | blocked | T-0026 |
| [T-0028](m3-tasks/T-0028-tasks-module-api-tsk-001-006.md) | Tasks module (API-TSK-001…006): CRUD, filters, move, restore | M3 | api | M | blocked | T-0024 |
| [T-0029](m3-tasks/T-0029-task-hooks-with-the-optimistic-status.md) | Task hooks with the optimistic status change, due state, formatWorkDate, status select and due badge | M3 | web | M | blocked | T-0028, T-0027 |
| [T-0030](m3-tasks/T-0030-task-create-edit-dialog-with-the.md) | Task create/edit dialog with the project picker and due-date field | M3 | web | M | blocked | T-0029 |
| [T-0031](m3-tasks/T-0031-task-lists-project-page-section-and.md) | Task lists (project page section and /app/tasks), task detail page, delete and restore | M3 | web | M | blocked | T-0030 |
| [T-0032](m1-auth/T-0032-base-ui-link-buttons-native-button-false.md) | Render links styled as buttons as a plain Link with buttonVariants | M1 | web | S | done | — |

Milestones M2–M6 have no tasks yet, and M1 has only the landing route split so far. They're created with the `write-task` skill once their specs are approved.
