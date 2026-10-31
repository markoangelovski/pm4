---
id: req-integrations
title: Integrations and connectors
status: review
owner: Marko Angelovski
last_updated: 2026-10-31
related: [prod-scope, sec, web-routing, web-screens, OQ-138, OQ-139, OQ-140, OQ-141, OQ-142, OQ-143, OQ-144, OQ-145, OQ-146, OQ-147, OQ-148, OQ-155, OQ-156, OQ-157, OQ-158, OQ-159, OQ-160, OQ-161, OQ-162, OQ-163, OQ-164, OQ-165, OQ-166, OQ-167, OQ-168, OQ-169, OQ-170, OQ-171, OQ-172, OQ-173, OQ-174, OQ-175, OQ-176, OQ-177, OQ-178, OQ-179, OQ-180, OQ-181, OQ-182, OQ-200, OQ-201, OQ-202, OQ-204, OQ-197, OQ-198, OQ-199, OQ-206, OQ-207, OQ-208, OQ-209, OQ-215, OQ-217, OQ-220]
---

# Integrations and connectors

## Purpose
PMSPA is an external project management app with an API and entities like PM4's (projects, tasks, workdays, logs,
bookings). The **PMSPA connector** links a PM4 user to their PMSPA account, so data can be synchronized between the two
in both directions. It is the first of possibly several integrations. Each one is set up under **Settings → Integrations**,
and once configured it gets its own page under **Connectors** in the sidebar.

## Capabilities
The connector does four things (owner, 2026-10-15):

| # | Capability | Where | Requirements |
| --- | --- | --- | --- |
| C1 | **Connect**: configure, test and remove the connection to PMSPA | Settings → Integrations | FR-INT-001…006 |
| C2 | **Map**: each PMSPA entity type maps to a PM4 entity type, field by field | Fixed in code; the UI shows only the per-record links (OQ-156) | FR-INT-009, FR-INT-010 |
| C3 | **Import**: browse the user's PMSPA entities (projects, tasks, days) and pick which ones to bring into PM4 | Connectors → PMSPA | FR-INT-007, FR-INT-011 |
| C4 | **Sync and push** from a PM4 entity's own screen: **Sync with PMSPA** for a project or a task (both ways), **Push to PMSPA** for a day's logs | Project detail, task detail, the day view, only while connected | FR-INT-008, FR-INT-012 |

The functionality inventory (OQ-155) says what the PMSPA API can read and write for each entity and which of C3 and C4
each entity gets. The entity mapping (OQ-148) and the import and push rules follow from it.

## Scope
**In (M6, OQ-141):** the Integrations settings tab; one PMSPA connection per user (URL, email, password); credentials
encrypted at rest; the connection status with a manual test; disconnecting; the **Connectors** sidebar section with the
**PMSPA** item; the `/app/connectors/pmspa` page for browsing and importing PMSPA entities; **Sync with PMSPA** on the
project and task details; **Push to PMSPA** on the day view; sync flags.
**Out:** integrations other than PMSPA; more than one PMSPA connection per user (OQ-144); a PMSPA favicon (OQ-143).
**UI:** the confirmed prototype `eefe787` (OQ-140). The feature specs are `feat-int-conn-api`, `feat-int-sync-api`,
`feat-int-time-api` and `feat-int-web` (OQ-175).

## Model
- An **integration** is a kind of external system PM4 can connect to. Today there is one: **PMSPA**.
- A **connection** is one user's configured link to an integration: PMSPA URL, email and password. A user has at most one
  PMSPA connection (OQ-144). Like every row, it belongs to exactly one user.
- A connection records **which PMSPA account** it logs in as: the PMSPA user ID and email PMSPA returns for the login
  (OQ-161). Nothing is stored in PMSPA. PM4 uses it to show "Connected as <email>", to check that every PMSPA record it
  writes to belongs to that account, and to notice when the credentials now point at a different account (FR-INT-002).
  Two PM4 users may connect to the same PMSPA account; each keeps their own links.
- **PM4's API makes every call to PMSPA.** The browser never talks to PMSPA and never receives the stored credentials.
  This follows from the security rules (no secrets in the web app, the backend owns data and business rules).
- The **connection status** is one of: **Not configured**, **Connected**, **Invalid credentials**, **Unreachable**. It also
  records when it was **last checked** (OQ-142).
- A **link** pairs one PM4 record with one PMSPA record (e.g. PM4 project `p_1` ↔ PMSPA project `884`). Import, sync and
  push create links, and later syncs follow them, so the same record is never created twice (FR-INT-010). A link
  records its **origin**, set when it is made and kept by later syncs (OQ-164): `imported` (the PM4 record was created
  from PMSPA), `pushed` (the PMSPA record was created from PM4) or `linked` (two existing records were paired). Projects and tasks
  are linked one to one. **Each PM4 time log is linked to its PMSPA log** (every log inside a PMSPA event has its own
  ID), so a log can be followed when it moves to another task (OQ-162). PMSPA IDs are stored only in the links, never
  on PM4's projects, tasks or logs.
- Links **outlive a disconnect** (OQ-162). They are kept with the PMSPA user ID they were made with, and come back into
  use when the user connects to the same PMSPA account again.

## Connector design principles
Agreed by the owner on 2026-10-15 (OQ-139). They are common practice for connectors between two APIs, and the
requirements below follow them.
1. **Links live in PM4's own tables**, not in the projects, tasks or logs tables: user, PM4 ID, PMSPA ID, the PMSPA
   account, origin, last synced at, and a **fingerprint of each side** as last synced (OQ-176). The core schema stays free of PMSPA columns. Links are kept on
   disconnect and reused on reconnect to the same account (FR-INT-005).
2. **Browse live, store only what's imported.** The connector page reads PMSPA through PM4's API on demand (paged, never
   cached in the database). Only the records the user imports are stored, as ordinary PM4 records. This keeps within the
   storage quota (`specs/03-api/data-model.md`).
3. **The user starts every sync** (Import, Sync, Push). No background or scheduled sync in M6. Automatic sync can come later,
   once manual sync has shown how the two systems behave.
4. **Idempotent.** Importing, syncing or pushing a linked record again updates its counterpart (or leaves it) instead of
   creating a second one.
5. **Parents first.** A task needs its project linked first, a log its task and project. Importing a task imports or
   links its project. Pushing a task asks to push its project first.
6. **Preview, then write.** Before an import or push changes anything, the user sees what will be created, updated or
   skipped.
7. **Show differences, don't merge them silently.** A linked project or task whose shared fields differ is shown field
   by field, and the user chooses which side wins (FR-INT-008, OQ-173). The fingerprints say which side changed since
   the last sync (OQ-176), which preselects the choice. No field-level merging.
8. **Deletes don't propagate.** Deleting a record on one side never deletes its counterpart. The link is dropped, and the
   other side's record stays.
9. **Partial failure is reported per record.** One rejected record doesn't roll back the rest. Every failed record is
   listed with PMSPA's reason.
10. **Be a good API client.** Every PMSPA call has a 60-second timeout (a cold start isn't a failure, OQ-165). PM4
    respects PMSPA's paging and rate limits (a 429 pauses every call to that host, FR-INT-014), retries only safe calls
    (reads), and never logs credentials or PMSPA payloads.

## PMSPA API summary
From the PMSPA API documentation the owner shared on 2026-10-15 (`docs-pmspa/connector/`, local and git-ignored; entry
point `README.md`). It describes the legacy PMSPA REST API (Node, Express, MongoDB) from a source review. Its runtime
checks ran on a local copy only, so the deployed service may differ.
- **Auth:** `POST /v1/auth/login` with email and password returns a JWT (header `X-Auth`), valid 24 h, with **no refresh
  token and no revocation**. Send it as `Cookie: auth=Bearer%20<jwt>` (works on every version; `Authorization: Bearer` is
  unconfirmed on the deployed service). An expired or invalid token gives **500** with `error.name` `TokenExpiredError` or
  `JsonWebTokenError`, never 401, so the client logs in again on those names.
- **Rate limit: 100 requests per 15 minutes per client IP.** 429 with `Retry-After`. Every PM4 user's calls leave from
  PM4's API, which has one outbound IP, so **all PM4 users of one PMSPA instance share this budget**.
- **Unreliable status codes:** validation errors are mostly 500, a list with no matches is **404** (not `[]`), some
  updates answer 201. Branch on the status plus the `ERR_*` codes, never on message text. Malformed JSON gives 500.
- **Repeated or bracketed query parameters can crash the PMSPA process** (`a=1&a=2`). The client builds every query
  string itself, with each parameter once.
- **Lists:** projects, tasks and notes page with `skip`/`limit` (max 50) and `sort`. Day and event reads are unpaged.
- **IDs:** 24-hex ObjectIds. **Dates:** timestamps are ISO 8601 UTC, `Day.day` is `YYYY-MM-DD`, `dueDate` and `date`
  are epoch milliseconds. The server's time zone is unknown, so send epoch milliseconds.
- **Ownership isn't enforced on every write** (a task can be created in another user's project, any note can be
  overwritten by id). The connector checks that every PMSPA record it writes to belongs to the connected account.
- **Deletes cascade in PMSPA:** deleting a project deletes its tasks and notes. Time events are never deleted with them.
- Out of the connector: users and API keys, locales, GTM scans, reports, docs, and the statistics endpoints, which merge
  every PMSPA user's data.

## Functionality inventory (OQ-155)

| PMSPA entity | PMSPA API can | PM4 counterpart | Import (C3) | Push (C4) |
| --- | --- | --- | --- | --- |
| Project | list, get, create, update, delete | Project | yes | yes |
| Task (kanban card) | list by project, get, create, update (`[{propName, propValue}]`), delete | Task | yes | yes |
| Note (rich text on a task, Editor.js) | list, get, create, update, delete | none | no | no |
| Day (date + start hour) | read by range, by id; created by the first event | Workday | yes, with its events | yes, with the logs |
| Event (a work item on a day, optional task, `booked` flag) with `logs[]` (title + hours) | read by day, by task; create, update, delete; logs add, update, delete | Time logs | yes | yes |
| Booked flag on an event | update only | none: bookings aren't synced (OQ-215) | no | no |

Not every write was checked at runtime (project update and delete, task delete, log update and delete have no
runtime evidence). They are verified against a local PMSPA test instance the owner runs on localhost when testing
starts (FR-INT-002 allows it in development).

## Entity mapping (OQ-148)

**Project**

| PM4 | PMSPA | Rule |
| --- | --- | --- |
| `title` (200) | `title` (150) | Push cuts a title over 150 characters to 149 plus "…", and the preview warns (OQ-159) |
| `description` (2000) | `description` (350) | As the title, at 350 (349 plus "…") |
| `project_lead` (text, 100) | `pl` (text, "Program Lead") | A user lead is sent as its name. Import stores a text lead, cut to 100 characters |
| `external_link` (one URL) | `kanboard` | Owner (OQ-159): `kanboard` ↔ `external_link`. `dev`, `stage`, `prod`, `live` and `nas` aren't synced |
| none | `done` (boolean) | Not synced (PM4 projects have no status) |
| none | `openTasksCount`, `closedTasksCount`, `order`, `date` | Not synced (computed or unused) |

**Task**

| PM4 | PMSPA | Rule |
| --- | --- | --- |
| `project_id` | `project` | Through the project's link (parents first) |
| `title` (200), `description` (2000) | `title` (150), `description` (350) | As projects |
| `status` `upcoming` / `in-progress` / `completed` | `column` `Upcoming` / `In Progress` / `Completed` | One to one |
| none | `done` (boolean, independent of `column`) | Push sets `done` = status is completed; import ignores it (OQ-159) |
| `due_date` (date, optional) | `dueDate` (epoch ms, **always set**, defaults to the creation time) | Push sends the date as epoch ms; without a due date, it sends none and PMSPA stores the creation time. Import keeps PMSPA's due date (OQ-159) |
| `project_lead`, `external_link` | `pl`, `kanboard` | As projects (`kanboard` ↔ `external_link`, OQ-159) |
| none | `nas`, notes, `tags`, `order` | Not synced |

**Time** (both directions, owner 2026-10-15, OQ-158)

| PM4 | PMSPA | Rule |
| --- | --- | --- |
| Workday `work_date`, `start_minute` (15-minute steps) | Day `day` (`YYYY-MM-DD`), `start` (decimal hour, 0–23.99) | `start` = minutes ÷ 60. Back: rounded to the nearest 15 minutes |
| Workday start on push | `days.createEvent` `start` | Every event create sends the PM4 day's start (an event created without one resets PMSPA's start to 0). PMSPA has no day update: a push that creates no event leaves PMSPA's start, and the day row warns "PMSPA keeps <HH:mm>: a day's start changes only when an event is added." (OQ-179). Import sets the PM4 start only when the PM4 day has none |
| The PM4 logs of one task on one work date | **One event** for that task and day: `task` = the task's link, `title` = the task's **project** title (OQ-167). Two tasks of one project make two events with the same title, told apart by their task | Logs added later to that task and day join the same event |
| PM4 logs with a project but no task, on one work date | One event per project and day without a `task`, `title` = the project title (OQ-167) | |
| PM4 logs with neither (Unsorted), on one work date | One event per log title and day, `title` = the log title; logs without a title share one event "Unsorted" per day (OQ-167) | Nothing is left out of a push |
| Event title length | PMSPA needs 3–150 characters | A title under 3 characters gets " · Time" (e.g. "AI · Time"); one over 150 is cut to 149 plus "…" (OQ-167, supersedes OQ-163) |
| Time log `text` (1000) | Log `title` (3–350) | Push cuts a text over 350 characters to 349 plus "…", and the preview warns about it. Import: the log's title becomes the text |
| Time log `title` (100, optional) | Event `title` | Import: the event's title (cut to 100) becomes the title of each log the import **creates**; an import never changes the title of a log that is already linked (OQ-169). Push sends no log title (the event is titled after the project, or after the log title for Unsorted) |
| `duration_minutes` (15-minute steps) | Log `duration` (hours, 0.25–24) | Hours = minutes ÷ 60. PMSPA only uses 0.25 h steps (owner); a value off that step fails its import with the reason |
| `task_id` / `project_id` | Event `task` | Import: through the task's link (parents first); an event without a task imports as Unsorted |
| A log moved to another task | The log moved to another event | Followed both ways through the log's link (OQ-162). **Import:** when a PMSPA event's task changed, its PM4 logs move to the new task's PM4 counterpart (their project follows; an unlinked new task is imported first). **Push:** when a PM4 log moved to another task, project or Unsorted, its PMSPA log leaves the old event and joins the event for its new task (or project, or Unsorted) and day, which is created if missing; an event left without logs is deleted. A log changed on both sides since the last sync: the action decides, a push writes PM4's version and an import PMSPA's, and the event row warns about it (OQ-180) |
| Bookings (FR-BOOK-*) | Event `booked` (boolean) | **Not synced** either way (OQ-215): a push never sets `booked`, an import never books a log, and `booked` isn't a compared field. The user books in PM4 |
| `exclude_from_stats` | An event titled "nonprod" | **Push:** a day's logs excluded from statistics all go to one event "nonprod" without a task, whatever their task or project (their task isn't pushed as a parent for them). **Import:** the logs of an event titled "nonprod" (case and surrounding spaces ignored) are excluded from statistics and land in Unsorted; a PM4 log already linked to one that is excluded keeps its task, project and title, and the import updates only its text and duration (OQ-168) |

## Requirements

### FR-INT-001: Integrations settings tab
**Priority:** Must
**Statement:** Settings (SCR-050) has a second tab, **Integrations** (`/app/settings?tab=integrations`), after
**User settings**. It lists every available integration with its name, a short description and its connection
status. It is built so that adding an integration later means adding an entry to the list. Today the list holds only PMSPA.
**Acceptance criteria:**
- Given I open `/app/settings?tab=integrations`, then I see the PMSPA integration with the status "Not configured" before I set it up.
- Given I open `/app/settings` without `tab`, then **User settings** is selected, as before.

### FR-INT-002: Configure the PMSPA connection
**Priority:** Must
**Statement:** From the Integrations tab, the user enters the **PMSPA URL**, **email** and **password** and saves them.
Saving checks the connection (FR-INT-004) and stores the settings whatever the result, so the user can fix them later.
The user can later edit the URL and email. The saved password is never shown again: the field stays empty, and the
stored password is kept unless the user types a new one.
**Rules:**
- URL: `https://` only. The API refuses a host that resolves to a private, loopback or link-local address, so the API
  can't be used to probe internal networks (SSRF protection, OQ-145). **Development only:** when the API runs in the
  `development` environment, `http://localhost` and `http://127.0.0.1` (any port) are also accepted, for a local PMSPA
  test instance (OQ-160). Every other environment keeps the strict rule.
- Email: a valid email address. Password: required when connecting for the first time.
- One connection per user (OQ-144). Saving again replaces the stored values.
- **A different PMSPA account:** when a check finds that the credentials now log in as another PMSPA user than the one
  the links were made with, and links exist, PM4 asks before going on: "This is a different PMSPA account. Your N
  links to the previous account will be removed. Your PM4 records stay." Confirming drops the links and records the new
  account; cancelling keeps the previous settings (OQ-161).
**Acceptance criteria:**
- Given no connection, when I save a valid URL, email and password, then the connection is stored and the status is checked.
- Given a URL `http://pmspa.example.com`, `https://localhost` or `https://10.0.0.5`, when I save, then I see a validation error and nothing is stored.
- Given a saved connection, when I change only the email and save, then the stored password is kept.
- Given a saved connection, when I open the tab, then the password field is empty and the API response contains no password.
- Given the API runs in `development`, when I save `http://localhost:3000`, then it is accepted; in any other environment it is refused.
- Given links made with PMSPA account A, when I save credentials of account B and confirm, then the links are removed and the PM4 records stay; when I cancel, the account A settings are kept.

### FR-INT-003: Credentials at rest
**Priority:** Must
**Statement:** PMSPA issues only a 24-hour token and no refresh token, so PM4 keeps the password to log in again (OQ-138):

| Value | Stored in | Form |
| --- | --- | --- |
| PMSPA URL, email | Postgres, the connection row | Plain text (not secrets; shown on the form and the status) |
| PMSPA user ID | Postgres, the connection row | Plain text (FR-INT-002, OQ-161) |
| Password | Postgres, the connection row | Encrypted with AES-256-GCM (random IV, auth tag). The key is in Azure App Settings, never in the database |
| Bearer token | Redis, one key per user | Encrypted with the same key; expires after 23 h, before PMSPA's 24 h |

Every PMSPA call uses the cached token. Without one, or when PMSPA answers with `TokenExpiredError` or
`JsonWebTokenError`, PM4 logs in with the stored password, caches the new token and retries the call once. If that login
fails, or logs in as another PMSPA account than the saved one, the status becomes **Invalid credentials** (OQ-209). The
cached token and account belong to the URL and email they were cached for: after the URL or email changes, they are
not used, and a call still running from before the change doesn't write its status (OQ-208). The password and the
token are never returned by any API response and never logged. Disconnecting deletes both.
**Acceptance criteria:**
- Given a saved connection, then neither Postgres nor Redis holds the password or the token in plain text.
- Given a cached token that PMSPA reports as expired, when PM4 calls PMSPA, then it logs in again, caches a new token and the call succeeds.
- Given a disconnected account, then Redis holds no token for that user.

### FR-INT-004: Connection status
**Priority:** Must
**Statement:** The Integrations tab shows the PMSPA connection status (Model) and when it was last checked, with a
**Test connection** button. The status is checked on save, on **Test connection**, and whenever the API calls PMSPA
(OQ-142). While connected, it shows the PMSPA account (OQ-166): its avatar, its email and "Signed in to <host> as an
admin" (or "a user"), and the time of the last sync (import, sync or push).
**Rules:**
- The check is `POST /v1/auth/login`, then `POST /v1/auth` (who am I), which returns the PMSPA user ID, email, avatar URL
  and role (OQ-138, OQ-166). Each call has a **60-second** timeout (OQ-165).
- **Connected**: PMSPA accepted the credentials. **Invalid credentials**: PMSPA rejected them. **Unreachable**: PMSPA
  couldn't be reached or didn't answer in time.
- **Written only on change** (OQ-178): the stored status and *last checked* are written on save, on **Test
  connection**, and when a PMSPA call changes the status. A call that changes nothing writes nothing.
- **Account details:** only the PMSPA user ID and email are stored (OQ-161). The avatar and role come from the last
  check and are kept with the cached token. The avatar shows only from `https://images.unsplash.com` (allowed in the
  CSP's `img-src`); any other host, or none, shows the initials (OQ-166).
**Acceptance criteria:**
- Given correct credentials, when I click **Test connection**, then the status is "Connected" and *last checked* is now.
- Given a wrong password, when I save, then the settings are stored and the status is "Invalid credentials".
- Given a URL that doesn't answer, when I click **Test connection**, then the status is "Unreachable".
- Given a connected account whose PMSPA call succeeds, then the connection row isn't written.

### FR-INT-005: Disconnect
**Priority:** Must
**Statement:** The user can **Disconnect** PMSPA from the Integrations tab after confirming. This deletes the stored URL
and credentials, the status goes back to "Not configured", and the Connectors sidebar item disappears (OQ-147).
It also deletes the cached token. The **links are kept**, with the PMSPA user ID they were made with, and are inactive
while disconnected: the sync flags are hidden and nothing syncs (OQ-162). Everything imported stays in PM4, and nothing
in PMSPA changes (OQ-139). Connecting again to the **same** PMSPA account brings the links back into use; connecting to
a **different** account asks before removing them (FR-INT-002, OQ-161).
**Acceptance criteria:**
- Given a saved connection, when I disconnect and confirm, then the connection is deleted and the sidebar has no Connectors section.
- Given the confirmation dialog, when I cancel, then nothing changes.
- Given imported projects, when I disconnect, then they stay in PM4 and show no sync flag.
- Given I disconnected, when I connect again with the same PMSPA account, then the sync flags reappear and re-importing a linked project updates it instead of creating a second one.

### FR-INT-006: Connectors sidebar section
**Priority:** Must
**Statement:** Once the user has saved a PMSPA connection, whatever its status, the sidebar shows a **Connectors**
section below **Time** with one item, **PMSPA**, linking to `/app/connectors/pmspa` (OQ-146). The item uses a generic
globe icon, like a browser tab shows for a site without a favicon. No PMSPA favicon is fetched (OQ-143). Without a
connection the section is hidden.
**Acceptance criteria:**
- Given no connection, then the sidebar has no Connectors section.
- Given a connection with the status "Invalid credentials", then the sidebar shows Connectors → PMSPA.

### FR-INT-007: PMSPA connector page
**Priority:** Must
**Statement:** `/app/connectors/pmspa` is where the user browses their PMSPA entities and imports them into PM4 (C3,
FR-INT-011). It lists the importable PMSPA entities (*Functionality inventory*), read live from PMSPA (design principle
2), and shows for each record whether it's already linked to a PM4 record. Layout (OQ-140, prototype `eefe787`): the
connection card, then two tabs: **Projects & tasks** (`?tab=projects`, the default) and **Time** (`?tab=time&week=`), each
with select-all, **Expand all** / **Collapse all** and **Import**.
- Without a connection, it shows that PMSPA isn't connected, with a link to `/app/settings?tab=integrations`.
- With a connection whose status isn't "Connected", it shows the status and the same link.
**Acceptance criteria:**
- Given no connection, when I open `/app/connectors/pmspa`, then I see "not connected" and a link to the Integrations settings.
- Given a connected PMSPA account with projects, when I open the page, then I see those projects, each marked linked or not linked.

### FR-INT-008: Synchronization
**Priority:** Must
**Statement:** Data moves between PM4 and PMSPA only through Import (FR-INT-011), Sync and Push (FR-INT-012), which the
user starts, following the design principles (OQ-139). For projects and tasks (OQ-172, OQ-173, OQ-174):
- **Link** pairs two records and writes nothing. **Sync** overwrites one side's shared fields with the other's.
- **Comparing:** every import or sync compares the **current values of all shared fields** of each linked project or
  task: project title, description, lead and external link; for a task also status (column) and due date, the due date
  only when the PM4 task has one (PMSPA always does). PM4's text is compared as PMSPA would store it (title cut to 150,
  description to 350). Empty text is no value.
- **Same → Up to date** (nothing to do). **Different → Differs:** the preview row shows the differing fields side by side
  (PM4 | PMSPA) and three choices: **Link only** (write nothing), **Overwrite PMSPA**, **Overwrite PM4**. The difference
  comes back on every sync until the two sides match.
- **Preselected:** the side that changed since the last sync (only PM4 changed → Overwrite PMSPA; only PMSPA → Overwrite
  PM4), else Link only. Changed = the fingerprint of the side's current shared values differs from the one stored on the
  link (OQ-176).
- **Clearing:** PMSPA ignores empty values on update, so Overwrite PMSPA can't clear a PMSPA description, lead or link;
  PMSPA keeps it and the row warns "PMSPA can't clear the <Field>: it keeps its value." (OQ-181).
- **Not linked:** **Create new** (the default) or **Link to existing ▾**: once a record is picked, the row shows the
  same field table and the same three choices.
- **Link only writes nothing and isn't counted.** When no row writes, the dialog's button reads "Sync 0 records" and is
  disabled; the link isn't marked synced then.
- **The result** lists every record's outcome; a record whose title an overwrite changed shows "<old> → <new>".
For time, the day view pushes (PM4 → PMSPA) and the connector page imports (PMSPA → PM4); logs aren't compared field by
field (FR-INT-011, FR-INT-012).
**Acceptance criteria:**
- Given a linked task renamed in PM4 and in PMSPA since the last sync, when I sync it, then the preview shows the row as "Differs" with the titles side by side, **Link only** preselected, and nothing is written until I confirm.
- Given that row, when I choose **Overwrite PMSPA** and sync, then PMSPA gets PM4's title and the result shows "<PMSPA title> → <PM4 title>".
- Given a linked project whose description was changed only in PMSPA, when I sync it, then **Overwrite PM4** is preselected.
- Given a linked pair whose fields match, when I sync it, then its row is "Up to date" and nothing is written.
- Given a preview where every row is Link only or up to date, then the button reads "Sync 0 records" and is disabled.
- Given a linked pair kept different with **Link only**, when I sync it again, then it shows as "Differs" again.

### FR-INT-009: Entity mapping
**Priority:** Must
**Statement:** Each PMSPA entity type that syncs maps to a PM4 entity type and back (e.g. PMSPA project ↔ PM4 project),
field by field, including what each side has that the other doesn't and what happens to those fields. The mapping is
fixed in PM4's code and documented in *Entity mapping*, not configured by the user (OQ-156). There is no mapping
editor. The UI works only with individual records: import, push, the sync flag and unlink.

### FR-INT-010: Links
**Priority:** Must
**Statement:** PM4 keeps a link for every record that was imported from PMSPA or pushed to it (Model, design principle 1).
The user can **unlink** a record: the link is dropped and both records stay.
**Sync flag** (owner, 2026-10-15; OQ-164, OQ-170): once a PM4 record has been linked (imported, synced, pushed or
linked to an existing record), the PM4 UI shows a small **sync flag** (RefreshCw icon) beside it. Its label says which
way the link was made and when it last synced, in the user's time zone: "Synced from PMSPA" (`imported`), "Synced to
PMSPA" (`pushed`) or "Synced with PMSPA" (`linked`), then " on 15 October 2026 at 22:50". On the project and task lists
and details it is the icon alone, with the label as its tooltip; on log rows it is a tag with the short date ("Synced
to PMSPA on 15 Oct 2026"). A click opens a popover with the label, the PMSPA counterpart read live (project: title,
lead, done; task: title, its PMSPA project, column; log: text and event title), how changes reach PMSPA (sync the
project or task, push the day) and **Unlink**. The live read happens only while the popover is open, is cached 5
minutes and isn't retried; nothing of it is stored in PM4. The flag shows only while the record is linked and a
connection to the links' account is saved (FR-INT-005). It updates after every import, sync or push of that record.
**Created in PMSPA** (OQ-207): a linked project or task shows when PMSPA created its counterpart, in the user's time zone:
on its header date line, as a **Created in PMSPA** column of the task lists, and in the sync flag's popover (logs too).
It is derived from the PMSPA id, so it needs no PMSPA call and nothing is stored.
**Acceptance criteria:**
- Given a PM4 project imported from PMSPA, when I import it again, then the PM4 project is updated and no second project is created.
- Given a linked project, when I unlink it, then both the PM4 and the PMSPA project still exist and the project shows as not linked.
- Given a linked PM4 project, when I delete it, then the link is dropped and the PMSPA project still exists.
- Given a PM4 project imported from PMSPA and last synced on 15 October 2026 at 22:50 in my time zone, when I hover over its sync flag, then I see "Synced from PMSPA on 15 October 2026 at 22:50".
- Given a linked task, when I click its sync flag, then the popover shows the PMSPA task's title, project and column, read from PMSPA, and **Unlink**.
- Given a PM4 project that was never synced, or was unlinked, then it shows no sync flag.

### FR-INT-011: Import from PMSPA
**Priority:** Must
**Statement:** On the connector page, the user selects PMSPA records and imports them. Before anything is written, a
preview lists what will be created, updated or skipped (design principle 6). Importing a record creates its PM4
counterpart and a link, or updates the counterpart if it's already linked. A child brings its parent (design
principle 5). Importable: projects, tasks, and days with their events (*Functionality inventory*). Selecting a project
lets the user include all, some or none of its tasks (OQ-157).
**Link to existing** (OQ-157, OQ-173): for each PMSPA project or task that isn't linked yet, the preview offers **Create
new** (the default) or **Link to existing ▾**, a picker of the user's unlinked PM4 records of the same type, the
closest title first (for a task, following its project row's choice). Once one is picked, the row shows the field table
and Link only / Overwrite PMSPA / Overwrite PM4 (FR-INT-008), so the same project isn't created twice when it already
exists on both sides. A linked project or task is compared as in FR-INT-008 (no longer PMSPA-only).
**Time:** importing a day sets the PM4 day start when PM4 has none, and imports each event's logs: an event's task
through its link (an unlinked task is imported first, with its project), an event without a task as Unsorted, an event
"nonprod" as excluded from statistics (OQ-168). A log already imported is updated (text, duration, task) unless it is
unchanged in PMSPA since the last sync. Imported logs are never booked. A log whose duration isn't a 0.25 h step fails
with the reason; the event's other logs are imported. The same goes for a log outside 0.25…24 h or with a text over 1000
characters (OQ-194); the preview warns about each such log on its event row (OQ-197). A linked log that PMSPA has made shorter than
its booked time in PM4 (FR-BOOK-006) isn't updated: the event row fails with "<booked> of a log is booked in PM4: remove bookings first, or keep
at least <booked>." and the event's other logs are imported (OQ-220). The preview warns about each such log on its event row,
when the row would import.
**Acceptance criteria:**
- Given a PMSPA project that isn't linked, when I select it and import, then a PM4 project is created and linked to it.
- Given a PMSPA task whose project isn't linked, when I import the task, then its project is imported too.
- Given an import of two records where PMSPA rejects one, then the other is imported and the failed one is listed with the reason.
- Given a PMSPA project "Acme" and a PM4 project "Acme", when I import it with **Link to existing** → "Acme" and **Link only**, then no new PM4 project is created, the PM4 project is linked and neither side changes.
- Given an imported event of task A whose task was changed to task B in PMSPA, when I import it again, then its PM4 logs are linked to B's PM4 counterpart (B is imported first if it isn't linked).
- Given a linked 2 h log with 1 h 30 m booked in PM4 that PMSPA shortened to 1 h, when I open the import preview, then its event row warns that the log will fail; when I import, the log keeps 2 h and its bookings, and the event row fails with the reason.

### FR-INT-012: Sync with PMSPA and Push to PMSPA
**Priority:** Must
**Statement:** While a PMSPA connection is saved, the project detail (SCR-021) and the task detail (SCR-031) have **Sync
with PMSPA**, and the day view (SCR-040) has **Push to PMSPA** for the day's logs, an item of its ⋯ menu (OQ-157, OQ-172, OQ-252). Each is disabled
with the connection status as its hint while the status isn't **Connected**, and hidden without a connection. The day
view's item is also disabled on a day without logs. Each opens a preview first (design principle 6), the user
confirms, and the result lists every record's outcome.
- **Sync a project or a task** (both ways, FR-INT-008): a project includes its tasks by default and the preview lets the
  user untick them; a task whose project isn't linked brings its project (design principle 5). Not linked: **Create new**
  in PMSPA or **Link to existing ▾** (PMSPA records of the same type). The dialog is "Sync “<title>” with PMSPA", its
  button "Sync N records".
- **Push a day:** the day's logs go to PMSPA as events (*Entity mapping → Time*), with any unlinked task as a parent
  (a project's logs without a task need no project in PMSPA). A linked log unchanged since the last push is skipped. A
  log moved to another task, project or Unsorted in PM4 leaves its old event and joins the new one; an event left without
  logs is deleted (OQ-162). A push never changes an event's booked flag (OQ-215). The button reads
  "Push N records".
**Acceptance criteria:**
- Given no connection, then no PM4 screen shows Sync with PMSPA or Push to PMSPA.
- Given a connected account and a PM4 project that isn't linked, when I sync it with **Create new** and confirm, then a PMSPA project is created and the PM4 project shows as linked.
- Given a linked PM4 project that I renamed, when I sync it with **Overwrite PMSPA**, then the PMSPA project gets the new name and no second PMSPA project is created.
- Given a pushed log of task A that I moved to task B in PM4, when I push the day, then the PMSPA log is in B's event for that day, and A's event is deleted if it has no logs left.
- Given a day whose logs are excluded from statistics, when I push it, then they go to one event "nonprod" without a task.

### FR-INT-013: Slow PMSPA answers
**Priority:** Must
**Statement:** PMSPA runs on an Azure F1 plan, so its first answer after idling can take up to a minute (OQ-165). Under
any PMSPA call that has taken 3 seconds (save, test, browse, refresh, preview, import, sync, push, the sync flag's
popover), the UI shows "PMSPA is waking up. This can take up to a minute." The API's PMSPA timeout is 60 seconds.
**Acceptance criteria:**
- Given PMSPA answers after 10 seconds, when I open the connector page, then after 3 seconds I see the waking-up hint, and then the projects.

### FR-INT-014: PMSPA rate limit
**Priority:** Must
**Statement:** When PMSPA answers 429, the API stops calling that PMSPA host until its `Retry-After` has passed, for every
PM4 user (they share one outbound IP), and answers `503` `pmspa-rate-limited` with `retryAfterSeconds` (OQ-177). The UI
shows "PMSPA is busy. Try again in N minutes." where the call was made. Nothing is retried automatically.
The other PMSPA problems get their own line too (OQ-182): another sync running → "Another import, sync or push is still
running."; rejected credentials → "PMSPA rejected the saved email or password."; unreachable → "PMSPA couldn't be
reached."; anything else the screen's generic line. A failed import, sync or push says "Some records may have been
written: open the preview again to see where things stand.", except when another sync was running, which writes
nothing (OQ-199).
**Acceptance criteria:**
- Given PMSPA answered 429 with `Retry-After: 600`, when any user's next PMSPA call comes within 10 minutes, then the API answers 503 `pmspa-rate-limited` without calling PMSPA.

### FR-INT-015: PMSPA call budget
**Priority:** Must
**Statement:** Every PM4 user of one PMSPA shares its 100 requests per 15 minutes (*PMSPA API summary*), so the connector
spends as few PMSPA calls as it can and shows what's left (OQ-200, OQ-201, OQ-202, OQ-204, OQ-205):
- **Requests line.** The connection carries PMSPA's rate limit as PMSPA's last answer reported it (requests used of the
  limit and when the window resets), shown as *PMSPA requests* in Settings → Integrations and on the connector page. It's
  shared by every PM4 user of that PMSPA, so it can drop without this user calling PMSPA. Once the window has reset, it
  reads "All available". It refreshes after the user's PMSPA reads and actions settle (a PM4 read; PMSPA isn't called).
- **Reads only what's shown, when the user asks.** A project's task list reads only that project's tasks. The Time tab's
  week is one PMSPA call (its days, without their events). Opening a day reads its events, then only the tasks and
  projects they reference, each once; a day that isn't opened isn't read. A time import preview reads the selected days
  the same way, and the Time tab shows what it read without reading it again. PMSPA's aggregate statistics routes are
  never used (no owner filter, OQ-202).
- **Sync and push read only what is linked** (OQ-204). A sync or day push preview, and its commit, read only the PMSPA
  records PM4 has a link to (a linked project's tasks as one list). The **Link to existing ▾** list of PMSPA records is
  read when the user opens it: a project's lists the account's projects, a task's the tasks of its parent's PMSPA
  project (the linked one, or the one picked under **Link to existing**; nothing while the parent is **Create new**). One
  read serves every row of that list in the dialog.
- **Expand all** reads the cheaper way: on the Projects & tasks tab each shown project's tasks, or every task of the
  account in one request when that costs PMSPA no more calls (OQ-206); on the Time tab the week's days not read yet, a task or project shared by several days once.
- **The web reuses answers.** A PMSPA read is reused for 5 minutes, isn't repeated on window focus and isn't retried
  after a failure. The API makes at most 2 PMSPA calls at a time for one request.
**Acceptance criteria:**
- Given PMSPA's last answer said 37 of 100 requests were used and the window resets in 9 minutes, when I open Settings → Integrations, then *PMSPA requests* shows "37 of 100 used, resets at <time> (in 9 min)".
- Given PMSPA has 300 projects, when I open one project's tasks, then the API makes one PMSPA call (two when it has more than 50 tasks).
- Given a week with 5 days in PMSPA, when I open it on the Time tab, then the API makes one PMSPA call.
- Given a day whose events reference 4 tasks in 2 projects, when I open it, then the API makes 7 PMSPA calls: the day, 4 tasks and 2 projects.
- Given the Projects & tasks tab with 20 projects that have tasks, when I click **Expand all**, then the web makes one call for all their tasks.
- Given a search that leaves one project with 60 tasks shown out of 880 tasks, when I click **Expand all**, then only that project's tasks are read (2 PMSPA calls, not 18).

### FR-INT-016: Integrations on the profile
**Priority:** Should
**Statement:** The profile (SCR-051) lists every integration with the external account it uses, and links to Settings →
Integrations to manage them. Today the list holds only PMSPA: its account (email, role, host) and status, or "No PMSPA
account connected." with **Connect in Settings**. Read only; nothing is changed there.
**Acceptance criteria:**
- Given a connected PMSPA account, when I open my profile, then I see its email, its role and its status under **Integrations**.
- Given no connection, when I open my profile, then I see "No PMSPA account connected." and a link to Settings → Integrations.

## Next steps
1. Feature specs, in order (OQ-175): `feat-int-conn-api` → `feat-int-sync-api` → `feat-int-time-api` → `feat-int-web`.

## Open questions
None.

## Changelog
- 2026-10-14: Initial draft (OQ-138…OQ-147). Owner's order for this feature: spec first, then the prototype.
- 2026-10-14: FR-INT-009 entity mapping (OQ-148) and the next steps; waiting for the PMSPA API documentation.
- 2026-10-15: Restructured around the four capabilities (connect, map, import, push). Added the connector design
  principles, the link model, FR-INT-010 links, FR-INT-011 import and FR-INT-012 push (OQ-155…OQ-157).
- 2026-10-15: FR-INT-010 sync flag with a last-sync tooltip (owner).
- 2026-10-15: PMSPA API summary, functionality inventory and entity mapping proposal from the shared documentation; OQ-138 proposal updated; OQ-158, OQ-159.
- 2026-10-15: Time syncs both ways, one event per task and day; long log text is cut on push; imported logs aren't booked; `kanboard` ↔ external link (OQ-158, OQ-159).
- 2026-10-15: Project and task field gaps settled (OQ-159).
- 2026-10-15: Credentials (OQ-138), design principles, conflicts and disconnect (OQ-139), mapping fixed in code (OQ-156),
  push screens, link to existing and sync flag places (OQ-157), localhost in development (OQ-160), PMSPA account on the
  connection (OQ-161).
- 2026-10-15: Links are kept on disconnect and reused on reconnect to the same account; each log is linked, so a change
  of task follows both ways (OQ-162).
- 2026-10-16: Functionality inventory (OQ-155) and entity mapping (OQ-148) confirmed. Status `review`; the page layout
  (OQ-140) is settled in the prototype.
- 2026-10-17: Folded in the prototype decisions (OQ-140, OQ-163…OQ-174) and OQ-175…OQ-182: link origin, both-side
  fingerprints, Link vs Sync with the field comparison (FR-INT-008), **Sync with PMSPA** for projects and tasks and
  **Push to PMSPA** for days (FR-INT-012), event titles, "nonprod" and log titles on import (*Entity mapping → Time*),
  the sync flag's popover (FR-INT-010), account details and status writes (FR-INT-004), slow answers (FR-INT-013) and
  the rate limit (FR-INT-014). OQ-140 settled by prototype `eefe787`.
- 2026-10-17: Approved by the owner.
- 2026-10-18: FR-INT-015 PMSPA call budget and FR-INT-016 integrations on the profile (OQ-200, OQ-201, OQ-202). Approved by the owner for feat-int-budget.
- 2026-10-18: FR-INT-015: the Time tab reads a week in one call and a day's events only when it opens or is imported; Time **Expand all** in one request (OQ-205). Back to `review`.
- 2026-10-18: FR-INT-015: sync and push read only linked PMSPA records; **Link to existing ▾** reads its PMSPA list when opened (OQ-204). Still `review`.
- 2026-10-18: Follow-ups (feat-int-followups): FR-INT-003 token and account tied to the URL and email, re-login as another
  account → Invalid credentials (OQ-208, OQ-209); FR-INT-010 **Created in PMSPA** (OQ-207); FR-INT-011 preview warnings for
  every log the import rejects (OQ-197); FR-INT-014 no "Some records may have been written" after `pmspa-sync-running` (OQ-199); FR-INT-015 **Expand all** the cheaper way (OQ-206). Still `review`.
- 2026-10-23: Bookings aren't synced with PMSPA in either direction (OQ-215): the push no longer sets an event's `booked`, and `booked` leaves the compared log fields; stored log fingerprints change once (OQ-217). FR-INT-011: an import never shortens a log below its
  booked time, and the preview warns about such a log (OQ-220) (feat-book-partial).
- 2026-10-31: FR-INT-012: the day view's **Push to PMSPA** is an item of its ⋯ menu (OQ-252, feat-tlog-day-menu). Still `review`.
