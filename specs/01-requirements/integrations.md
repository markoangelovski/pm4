---
id: req-integrations
title: Integrations and connectors
status: review
owner: Marko Angelovski
last_updated: 2026-10-16
related: [prod-scope, sec, web-routing, web-screens, OQ-138, OQ-139, OQ-140, OQ-141, OQ-142, OQ-143, OQ-144, OQ-145, OQ-146, OQ-147, OQ-148, OQ-155, OQ-156, OQ-157, OQ-158, OQ-159, OQ-160, OQ-161, OQ-162]
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
| C3 | **Import**: browse the user's PMSPA entities (projects, tasks, …) and pick which ones to bring into PM4 | Connectors → PMSPA | FR-INT-007, FR-INT-011 |
| C4 | **Push**: send a PM4 entity (a project, a task, a day's logs) to PMSPA from that entity's own screen | Project detail, task detail, the day view, only while connected | FR-INT-012 |

The functionality inventory (OQ-155) says what the PMSPA API can read and write for each entity and which of C3 and C4
each entity gets. The entity mapping (OQ-148) and the import and push rules follow from it.

## Scope
**In (M6, OQ-141):** the Integrations settings tab; one PMSPA connection per user (URL, email, password); credentials
encrypted at rest; the connection status with a manual test; disconnecting; the **Connectors** sidebar section with the
**PMSPA** item; the `/app/connectors/pmspa` page for browsing and importing PMSPA entities; a push action on the PM4
entities that can go to PMSPA.
**Out:** integrations other than PMSPA; more than one PMSPA connection per user (OQ-144); a PMSPA favicon (OQ-143).
**TBD:** the connector page layout (OQ-140), settled in the prototype.

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
- A **link** pairs one PM4 record with one PMSPA record (e.g. PM4 project `p_1` ↔ PMSPA project `884`). Import and push
  create links, and later syncs follow them, so the same record is never created twice (FR-INT-010). Projects and tasks
  are linked one to one. **Each PM4 time log is linked to its PMSPA log** (every log inside a PMSPA event has its own
  ID), so a log can be followed when it moves to another task (OQ-162). PMSPA IDs are stored only in the links, never
  on PM4's projects, tasks or logs.
- Links **outlive a disconnect** (OQ-162). They are kept with the PMSPA user ID they were made with, and come back into
  use when the user connects to the same PMSPA account again.

## Connector design principles
Agreed by the owner on 2026-10-15 (OQ-139). They are common practice for connectors between two APIs, and the
requirements below follow them.
1. **Links live in PM4's own table**, not in the projects, tasks or logs tables: user, entity type, PM4 ID, PMSPA ID, last
   synced at, and a fingerprint of what was synced. The core schema stays free of PMSPA columns. Links are kept on
   disconnect and reused on reconnect to the same account (FR-INT-005).
2. **Browse live, store only what's imported.** The connector page reads PMSPA through PM4's API on demand (paged, never
   cached in the database). Only the records the user imports are stored, as ordinary PM4 records. This keeps within the
   storage quota (`specs/03-api/data-model.md`).
3. **The user starts every sync** (Import, Push). No background or scheduled sync in M6. Automatic sync can come later,
   once manual sync has shown how the two systems behave.
4. **Idempotent.** Importing or pushing a linked record again updates its counterpart instead of creating a second one.
5. **Parents first.** A task needs its project linked first, a log its task and project. Importing a task imports or
   links its project. Pushing a task asks to push its project first.
6. **Preview, then write.** Before an import or push changes anything, the user sees what will be created, updated or
   skipped.
7. **Detect conflicts, don't merge them silently.** The fingerprint shows when a record changed on the other side since
   the last sync. If both sides changed, the user chooses which wins. No field-level merging.
8. **Deletes don't propagate.** Deleting a record on one side never deletes its counterpart. The link is dropped, and the
   other side's record stays.
9. **Partial failure is reported per record.** One rejected record doesn't roll back the rest. Every failed record is
   listed with PMSPA's reason.
10. **Be a good API client.** Every PMSPA call has a timeout. PM4 respects PMSPA's paging and rate limits, retries only
    safe calls (reads), and never logs credentials or PMSPA payloads.

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
| Booked flag on an event | update only | Booking (`booking_date`) | no (imported logs aren't booked) | yes |

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
| The PM4 logs of one task on one work date | **One event** for that task and day: `title` (3–150) = the task title, `task` = the task's link | Logs added later to that task and day join the same event |
| PM4 logs with a project but no task, or with neither (Unsorted), on one work date | One event per project and day without a `task`, `title` = the project title; one event per day for Unsorted, `title` "Unsorted" | Nothing is left out of a push |
| Time log `text` (1000) | Log `title` (3–350) | Push cuts a text over 350 characters to 349 plus "…", and the preview warns about it. Import: the log's title becomes the text |
| Time log `title` (100, optional) | Event `title` | Import: the event's title becomes each of its logs' title, cut to 100 characters. Push sends no log title (the event title is the task's) |
| `duration_minutes` (15-minute steps) | Log `duration` (hours, 0.25–24) | Hours = minutes ÷ 60. PMSPA only uses 0.25 h steps (owner); a value off that step fails its import with the reason |
| `task_id` / `project_id` | Event `task` | Import: through the task's link (parents first); an event without a task imports as Unsorted |
| A log moved to another task | The log moved to another event | Followed both ways through the log's link (OQ-162). **Import:** when a PMSPA event's task changed, its PM4 logs move to the new task's PM4 counterpart (their project follows; an unlinked new task is imported first). **Push:** when a PM4 log moved to another task, project or Unsorted, its PMSPA log leaves the old event and joins the event for its new task (or project, or Unsorted) and day, which is created if missing; an event left without logs is deleted. A log changed on both sides since the last sync is a conflict (FR-INT-008) |
| `booking_date` (a date, or none) | Event `booked` (boolean) | Push: booked when every log of the event has a booking date. **Import: always not booked**; the user books in PM4 |
| `exclude_from_stats` | none | Not synced |

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
fails, the status becomes **Invalid credentials**. The password and the token are never returned by any API response and
never logged. Disconnecting deletes both.
**Acceptance criteria:**
- Given a saved connection, then neither Postgres nor Redis holds the password or the token in plain text.
- Given a cached token that PMSPA reports as expired, when PM4 calls PMSPA, then it logs in again, caches a new token and the call succeeds.
- Given a disconnected account, then Redis holds no token for that user.

### FR-INT-004: Connection status
**Priority:** Must
**Statement:** The Integrations tab shows the PMSPA connection status (Model) and when it was last checked, with a
**Test connection** button. The status is checked on save, on **Test connection**, and whenever the API calls PMSPA
(OQ-142). While connected, it shows **Connected as <PMSPA email>** and the time of the last import or push.
**Rules:**
- The check is `POST /v1/auth/login`, then `POST /v1/auth` (who am I), which returns the PMSPA user ID (OQ-138). Each
  call has a 15-second timeout.
- **Connected**: PMSPA accepted the credentials. **Invalid credentials**: PMSPA rejected them. **Unreachable**: PMSPA
  couldn't be reached or didn't answer in time.
**Acceptance criteria:**
- Given correct credentials, when I click **Test connection**, then the status is "Connected" and *last checked* is now.
- Given a wrong password, when I save, then the settings are stored and the status is "Invalid credentials".
- Given a URL that doesn't answer, when I click **Test connection**, then the status is "Unreachable".

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
FR-INT-011). It lists the importable PMSPA entities (which ones: OQ-155), read live from PMSPA (design principle 2), and
shows for each record whether it's already linked to a PM4 record. The layout is TBD (OQ-140, settled in the prototype).
Whatever it holds:
- Without a connection, it shows that PMSPA isn't connected, with a link to `/app/settings?tab=integrations`.
- With a connection whose status isn't "Connected", it shows the status and the same link.
**Acceptance criteria:**
- Given no connection, when I open `/app/connectors/pmspa`, then I see "not connected" and a link to the Integrations settings.
- Given a connected PMSPA account with projects, when I open the page, then I see those projects, each marked linked or not linked.

### FR-INT-008: Synchronization
**Priority:** Must
**Statement:** Data moves between PM4 and PMSPA only through Import (FR-INT-011) and Push (FR-INT-012), which the user
starts, following the design principles (OQ-139). A **conflict** is a linked record that changed on both sides since its
last sync (design principle 7). The preview marks it, and the user chooses per record: keep PM4's version, take PMSPA's,
or skip it.
**Acceptance criteria:**
- Given a linked task renamed in PM4 and in PMSPA since the last sync, when I push it, then the preview marks it as a conflict and nothing is written until I choose.
- Given that conflict, when I choose to keep PM4's version, then PMSPA gets PM4's title.

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
**Sync flag** (owner, 2026-10-15): once a PM4 record has been synced with PMSPA (imported or pushed), the PM4 UI shows a
small **sync flag** icon beside it. Hovering over the flag, or focusing it with the keyboard, shows a tooltip with the last
sync time in the user's time zone, in the app's date-and-time style (`d MMMM yyyy` and `HH:mm`): "Synced with PMSPA on
15 October 2026 at 22:50". The flag shows only while the record is linked and a connection is saved (FR-INT-005). It updates after every import or push of that
record. It shows next to the name on the project and task lists and details, and on log rows (OQ-157). The icon is
chosen in the prototype (OQ-140).
**Acceptance criteria:**
- Given a PM4 project imported from PMSPA, when I import it again, then the PM4 project is updated and no second project is created.
- Given a linked project, when I unlink it, then both the PM4 and the PMSPA project still exist and the project shows as not linked.
- Given a linked PM4 project, when I delete it, then the link is dropped and the PMSPA project still exists.
- Given a PM4 project last synced on 15 October 2026 at 22:50 in my time zone, when I hover over its sync flag, then I see "Synced with PMSPA on 15 October 2026 at 22:50".
- Given a PM4 project that was never synced, or was unlinked, then it shows no sync flag.

### FR-INT-011: Import from PMSPA
**Priority:** Must
**Statement:** On the connector page, the user selects PMSPA records and imports them. Before anything is written, a
preview lists what will be created, updated or skipped (design principle 6). Importing a record creates its PM4
counterpart and a link, or updates the counterpart if it's already linked. A child brings its parent (design
principle 5). Importable: projects, tasks, and days with their events (*Functionality inventory*). Selecting a project
lets the user include all, some or none of its tasks (OQ-157).
**Link to existing** (OQ-157): for each PMSPA project or task that isn't linked yet, the preview offers **Create new**
(the default) or **Link to existing ▾**, a picker of the user's PM4 records of the same type (for a task, within the
linked project). Linking to an existing record creates the link and updates that record from PMSPA, so the same project
isn't created twice when it already exists on both sides.
**Acceptance criteria:**
- Given a PMSPA project that isn't linked, when I select it and import, then a PM4 project is created and linked to it.
- Given a PMSPA task whose project isn't linked, when I import the task, then its project is imported too.
- Given an import of two records where PMSPA rejects one, then the other is imported and the failed one is listed with the reason.
- Given a PMSPA project "Acme" and a PM4 project "Acme", when I import it with **Link to existing** → "Acme", then no new PM4 project is created and the PM4 project is linked.
- Given an imported event of task A whose task was changed to task B in PMSPA, when I import it again, then its PM4 logs are linked to B's PM4 counterpart (B is imported first if it isn't linked).

### FR-INT-012: Push to PMSPA
**Priority:** Must
**Statement:** While a PMSPA connection is saved, **Push to PMSPA** is on the project detail (SCR-021), the task detail
and the day view (SCR-040, the day's logs) (OQ-157). It is disabled with the connection status as its hint while the
status isn't **Connected**, and hidden without a connection. Its form (button or menu item) is chosen in the prototype.
Pushing creates the PMSPA counterpart and a link, or updates it if it's already linked. The user confirms a preview
first. Pushing a project includes its tasks by default; the preview lets the user leave them out. Pushing a task or a
log whose parent isn't linked pushes the parent too (design principle 5). As on import, the preview offers **Link to
existing ▾** for a record that isn't linked yet, to pick its PMSPA counterpart instead of creating one.
**Acceptance criteria:**
- Given no connection, then no PM4 screen shows the push action.
- Given a connected account and a PM4 project that isn't linked, when I push it and confirm, then a PMSPA project is created and the PM4 project shows as linked.
- Given a linked PM4 project that I renamed, when I push it, then the PMSPA project gets the new name and no second PMSPA project is created.
- Given a pushed log of task A that I moved to task B in PM4, when I push the day, then the PMSPA log is in B's event for that day, and A's event is deleted if it has no logs left.

## Next steps
1. Build the prototype from this spec (owner's order for this feature: spec first, then the prototype), then write
   the feature specs and update the layer specs (routing, screens, endpoints, data model).

## Open questions
OQ-140 (settled in the prototype)

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
