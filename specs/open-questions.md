# Open Questions

Unresolved decisions. **Agents must not guess answers to these.** Where a spec depends on one, it
says `TBD (OQ-###)`. When a question is resolved, set its status to `resolved`, record the answer,
and link to where the decision now lives. Resolved items stay here for history.

## Open

| ID | Question | Proposal | Area | Blocks |
| --- | --- | --- | --- | --- |
| OQ-020 | The link lives on the **log** (decided, OQ-019). Remaining: is a link **required** on every log, or can a log be unlinked (legacy allowed that)? When a task is picked, the project comes from the task. Can a log link to a project without a task (your answer suggests yes)? | Project-only links allowed. A link is **required** (every block of work belongs to something, and it keeps reports clean). | product | req-time-logs, data model, reporting |
| OQ-021 | Workday start time: keep the legacy header (current time · start time · "end" = start + logged hours)? Legacy auto-set the start time to the current time, rounded to 15 min, the first time you opened a day. Keep that, or require an explicit "start day" action? | Keep the display. Replace the auto-create with an explicit "start day" (or an auto-set on the first log of the day). This avoids empty rows and saves storage. | product | req-time-logs |
| OQ-028 | Task fields: legacy required **Project Lead** and **Due date** on tasks (due date defaulted to today). Keep both as required? Is Project Lead on projects optional (legacy)? | Task: project lead optional, due date optional. Project: project lead optional. | product | req-tasks, req-projects |
| OQ-029 | Reporting details. (a) Should logs with no project show as a **"No project"** bucket in the breakdown and chart? (b) Should logs of deleted projects show under the retained name, marked "(deleted)"? (c) Is the hours-per-day chart **on the dashboard**, sharing one date-range control with the total and breakdown? (d) In per-project mode, should the chart also draw a "Total" line? | (a) yes (b) yes (c) yes, one range picker, default = current month (d) yes, toggleable | product | req-reporting |
| OQ-030 | Trash details. (a) Are **time logs** also soft-deleted (trash), or deleted immediately after confirmation? (b) Restoring a project brings back its tasks, except tasks that were deleted individually before it? (c) A task whose project is in the trash can't be restored on its own, and the user is offered "restore project"? | (a) delete immediately (saves storage; the legacy app behaved this way) (b) yes (c) yes | product | req-trash |
| OQ-035 | Duration input and step. Legacy used decimal hours in 0.25 steps (`1.25`). Keep the 15-minute granularity? Also accept `1h 15m` / `1:15`? What's the maximum per log? | Store minutes. The UI accepts decimal hours (0.25 step) plus `h/m` and `h:mm` input. Max 24 h per log. | product | req-time-logs |
| OQ-036 | Order and clock times of logs. (a) Should the sequential view show **derived clock times** (start of day + preceding durations, e.g. 08:00–09:00, 09:00–09:15)? (b) Must the user be able to **reorder** logs and **insert** a forgotten block in the middle? (c) How are **breaks** (lunch) represented? Contiguous derived times assume no gaps. Options: a "Break" log that doesn't count as work, or no break support (the end time just shifts). | (a) yes (b) yes, move up/down plus insert (c) TBD | product | req-time-logs, data model |
| OQ-037 | Legacy **events** had a title, and grouped several logs under one task. The new model drops that level: each block is one log with its own note and link. Is anything lost for you? For example, did you use the event title as a short summary separate from the note? | Drop it. The note is the description, and the group-by-project view replaces the grouping. | product | req-time-logs, data model |
| OQ-038 | Group-by-project view. (a) Inside a project group, should logs be **sub-grouped by task** (with task subtotals), or listed flat? (b) Is the view only for a **single day**, or also for a date range (e.g. a week)? (c) Should groups be sorted by subtotal, or by the first appearance in the day? | (a) flat, with the task name on each row (b) single day for MVP (c) by first appearance | product | req-time-logs, screens |
| OQ-046 | Shared Prettier rules for `web/` and `api/`. `api/.prettierrc` has the Nest CLI defaults (`singleQuote: true`, `trailingComma: "all"`). `web/` has no Prettier; its code (template + shadcn CLI output) uses double quotes and semicolons. Which rule set do both apps use? | **Prettier defaults (double quotes, `trailingComma: "all"`) in both.** The shadcn CLI emits double quotes, so `web/` barely changes and newly added components don't churn. `api/` is reformatted once with `npm run format`. The alternative (api's single quotes everywhere) reformats every web file, and every component the shadcn CLI adds later. | tooling | code-style, T-0006 |

## Resolved

| ID | Question (short) | Answer | Recorded in |
| --- | --- | --- | --- |
| OQ-045 | Landing page content and indexing | **As proposed, except indexing:** hero + feature grid (projects, tasks, time logs, dashboard, trash) + footer; screenshots added later; the agent drafts the copy and the owner edits it. **No page is indexable** (the landing page included): every page is `noindex`, and there's no sitemap. Open Graph tags stay, for link previews. | req-landing FR-LAND-001/003, web-screens SCR-003 |
| OQ-044 | Entry points | **As proposed:** a signed-out visitor opening `/` goes to `/home/`; deep links still go to sign-in with `returnTo`. Sign-out keeps landing on sign-in. The sign-in screen links back to `/home/` via the logo. | req-auth FR-AUTH-005, req-landing, web-routing |
| OQ-043 | Landing page "signed in" detection | **As proposed:** presence of a stored refresh token only (no network call). A stale session is caught by the app's auth guard. | req-landing FR-LAND-002 |
| OQ-042 | Runtime majors | New Azure Web App and Neon project. **Node 24 LTS** everywhere (`NODE|24-lts` on Azure), **Postgres 18** on Neon (its default), with ids defaulting to `uuidv7()` | tech-stack, arch-env, data model |
| OQ-041 | Backups | **No backups beyond Neon's built-in restore** for now | NFR-010 |
| OQ-040 | Performance and cold starts | **As proposed:** Lighthouse ≥ 90, ≤ 300 kB first-load JS, API p95 < 300 ms. "Waking up the server…" after 3 s, a 60 s first-request timeout, then Retry | NFR-001–003 |
| OQ-039 | Rate limits and allow-list removal | **As proposed:** 10/min/IP sign-in, 30/min/IP refresh, 300/min/user otherwise. The allow-list is checked on refresh too (removal takes effect within 15 min). | security.md |
| OQ-031 | Trash purge mechanism | **No GitHub Action.** Items expire after 31 days (hidden, not restorable). A **BullMQ** job, run by a worker inside the API, purges them when the user opens the app, at most once a day. A late purge is fine, and **items stay restorable until they're purged**. The Free (F1) tier is used. | ADR-0011, req-trash, arch-deployment |
| OQ-012 | Shared API types | **Accepted:** an OpenAPI document generated by the API, with `openapi-typescript` + `openapi-fetch` in web | ADR-0010 |
| OQ-011 | Web data layer and forms | **Accepted:** TanStack Query + react-hook-form + zod + nuqs | ADR-0009 |
| OQ-027 | Primary key type | **UUIDv7** in Postgres `uuid` columns (16 B), exchanged as the standard 36-char string. ULID and bigint rejected. | data model, api-conventions |
| OQ-024 | API domain and refresh-token storage | The API **stays on `*.azurewebsites.net`** (the Free F1 tier has no custom domains). The refresh token is kept in **`localStorage`** (shared by tabs, survives restarts), with a **30-day sliding** lifetime, rotated on every use. sessionStorage was considered and rejected (it gives no XSS protection, and needs a sign-in per tab). | sec, ADR-0007, req-auth, arch-env |
| OQ-034 | Legacy data migration | **No migration.** PM4 starts with an empty database. | ADR-0004 |
| OQ-033 | Monorepo git remote | **A new GitHub repo.** The legacy repos are left as they are. | arch-repos, T-0005 |
| OQ-032 | Quotas | **Neon free tier: 0.5 GB. Redis Cloud free tier: 30 MB.** | NFR-010, NFR-011, NFR-013, data model |
| OQ-026 | Text limits | **As proposed:** log note 1000, titles 200, descriptions 2000, project lead 100, external link 500 chars | data model, req-projects, req-tasks, req-time-logs |
| OQ-025 | Time zone source | **A profile setting**, defaulting to the browser zone at first sign-in, with a warning when the browser zone differs | req-auth FR-AUTH-006, data model |
| OQ-023 | Session lifetime | Access token 15 min. Refresh token sliding and rotated on every use. A session must last **at least 8 hours** of use without signing in again. "Sign out" revokes the current session. **"Sign out of all devices"** is added. The exact refresh lifetime depends on the token storage (OQ-024). | sec, req-auth FR-AUTH-003/004 |
| OQ-022 | Sign-up policy | **An allow-list** via `AUTH_ALLOWED_EMAILS`. Empty means open sign-up. | sec, req-auth FR-AUTH-002, arch-env |
| OQ-019 | How time is logged | The user switches between projects **non-sequentially**, often every 15 min. Each block is logged separately, with a note, and linked to a **task or project**. The day can be shown **sequentially** or **grouped by project**. → The model is flattened to Workday + Time log (link and position on the log). | req-time-logs, data model |
| OQ-001 | Repos and folders | **A monorepo** at `pm4/`, with `web/` and `api/` folders and separate build and deploy workflows (path-filtered, each triggerable manually) | ADR-0006, arch-repos, arch-deployment |
| OQ-002 | Single-user or collaboration | **Single user per account.** Nothing is shared. | prod-vision, sec, data model |
| OQ-003 | Auth method | **OAuth/social: Google** first. Others may be added later. | ADR-0007, req-auth, sec |
| OQ-004 | Domains | Web on GitHub Pages under a **custom domain**. API on **`*.azurewebsites.net`** (confirmed in OQ-024: the Free tier has no custom domains). These are cross-site, so bearer tokens. | ADR-0007, sec |
| OQ-005 | DB/ORM | **Postgres on Neon.tech + Drizzle.** **Redis Cloud** is available. **Cloudflare R2** is available if needed (no current use). | ADR-0008, arch-stack |
| OQ-006 | Task fields/workflow | **As in legacy**, with `jiraLink` renamed to **External link**. Statuses: `upcoming → in-progress → completed`. (Field requirements: OQ-028.) | req-tasks, data model |
| OQ-007 | Time capture | **As in legacy.** Details to be refined (OQ-019–021, OQ-035). | req-time-logs |
| OQ-008 | Log note | **Required, plain text.** A bounded length in a storage-efficient type (`varchar(n)`, n = OQ-026). | req-time-logs, data model |
| OQ-009 | Reporting MVP | A line chart of hours per day (default: current month, editable range), a per-project mode with individually selected projects, and on the dashboard: a range selector, the total hours and a per-project breakdown | req-reporting |
| OQ-010 | Package manager | **npm** for both apps | ADR-0006, arch-stack |
| OQ-013 | Pages URL | **Custom domain** (e.g. `https://pm4.example.com`), served **from the root**, so no `basePath` | web-static-export, arch-deployment |
| OQ-014 | Entity deep links | **Query-param routes** (`/projects/view/?id=…`). A missing `id` → redirect to the list (`/projects/`). | web-routing |
| OQ-015 | Time zones | ISO formats: `timestamptz`/ISO 8601 UTC for instants, `date`/`YYYY-MM-DD` for work dates. The frontend computes ranges in the user's zone (e.g. Europe/Zagreb, CET/CEST). | api-conventions §Dates and times, data model |
| OQ-016 | Delete behavior | **Soft delete with a trash.** Automatic purge after 31 days, and manual permanent delete. Deleting a project also deletes its tasks. Time entries survive task/project deletion and keep the task/project name. | req-trash, data model |
| OQ-017 | Environments | **Production only** | arch-env, arch-deployment |
| OQ-018 | i18n / dark mode / a11y | **English only.** Dark mode and accessibility **as implemented in the template.** | NFR-006, web-template |
