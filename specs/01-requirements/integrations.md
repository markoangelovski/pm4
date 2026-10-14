---
id: req-integrations
title: Integrations and connectors
status: draft
owner: Marko Angelovski
last_updated: 2026-10-14
related: [prod-scope, sec, web-routing, web-screens, OQ-138, OQ-139, OQ-140, OQ-141, OQ-142, OQ-143, OQ-144, OQ-145, OQ-146, OQ-147, OQ-148]
---

# Integrations and connectors

## Purpose
PMSPA is an external project management app with an API and entities like PM4's (projects, tasks, workdays, logs,
bookings). The **PMSPA connector** links a PM4 user to their PMSPA account, so data can be synchronized between the two
in both directions. It is the first of possibly several integrations. Each one is set up under **Settings → Integrations**,
and once configured it gets its own page under **Connectors** in the sidebar.

## Scope
**In (M6, OQ-141):** the Integrations settings tab; one PMSPA connection per user (URL, email, password); credentials
encrypted at rest; the connection status with a manual test; disconnecting; the **Connectors** sidebar section with the
**PMSPA** item; the `/app/connectors/pmspa` page.
**Out:** integrations other than PMSPA; more than one PMSPA connection per user (OQ-144); a PMSPA favicon (OQ-143).
**TBD:** how the credentials are stored (OQ-138), the sync rules (OQ-139), what the connector page does (OQ-140), and the
entity mapping between PMSPA and PM4 (OQ-148).
These depend on the PMSPA API documentation, which the owner will share.

## Model
- An **integration** is a kind of external system PM4 can connect to. Today there is one: **PMSPA**.
- A **connection** is one user's configured link to an integration: PMSPA URL, email and password. A user has at most one
  PMSPA connection (OQ-144). Like every row, it belongs to exactly one user.
- **PM4's API makes every call to PMSPA.** The browser never talks to PMSPA and never receives the stored credentials.
  This follows from the security rules (no secrets in the web app, the backend owns data and business rules).
- The **connection status** is one of: **Not configured**, **Connected**, **Invalid credentials**, **Unreachable**. It also
  records when it was **last checked** (OQ-142).

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
  can't be used to probe internal networks (SSRF protection, OQ-145).
- Email: a valid email address. Password: required when connecting for the first time.
- One connection per user (OQ-144). Saving again replaces the stored values.
**Acceptance criteria:**
- Given no connection, when I save a valid URL, email and password, then the connection is stored and the status is checked.
- Given a URL `http://pmspa.example.com`, `https://localhost` or `https://10.0.0.5`, when I save, then I see a validation error and nothing is stored.
- Given a saved connection, when I change only the email and save, then the stored password is kept.
- Given a saved connection, when I open the tab, then the password field is empty and the API response contains no password.

### FR-INT-003: Credentials at rest
**Priority:** Must
**Statement:** The PMSPA credentials are stored encrypted at rest, are never returned by any API response and are never
logged. **How** they are stored (the password itself or a token PMSPA issues, and the encryption key setup) is TBD (OQ-138),
to be decided once the PMSPA API documentation is available.
**Acceptance criteria:**
- Given a saved connection, then the database holds no plain-text password or token. TBD (OQ-138) for the exact form.

### FR-INT-004: Connection status
**Priority:** Must
**Statement:** The Integrations tab shows the PMSPA connection status (Model) and when it was last checked, with a
**Test connection** button. The status is checked on save, on **Test connection**, and whenever the API calls PMSPA
(OQ-142). The last successful sync time joins the status once the sync rules are specified (OQ-139).
**Rules:**
- **Connected**: PMSPA accepted the credentials. **Invalid credentials**: PMSPA rejected them. **Unreachable**: PMSPA
  couldn't be reached or didn't answer in time. The exact PMSPA call and timeout are TBD (OQ-138).
**Acceptance criteria:**
- Given correct credentials, when I click **Test connection**, then the status is "Connected" and *last checked* is now.
- Given a wrong password, when I save, then the settings are stored and the status is "Invalid credentials".
- Given a URL that doesn't answer, when I click **Test connection**, then the status is "Unreachable".

### FR-INT-005: Disconnect
**Priority:** Must
**Statement:** The user can **Disconnect** PMSPA from the Integrations tab after confirming. This deletes the stored URL
and credentials, the status goes back to "Not configured", and the Connectors sidebar item disappears (OQ-147).
What happens to synced data and links is decided with the sync rules (OQ-139).
**Acceptance criteria:**
- Given a saved connection, when I disconnect and confirm, then the connection is deleted and the sidebar has no Connectors section.
- Given the confirmation dialog, when I cancel, then nothing changes.

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
**Statement:** `/app/connectors/pmspa` is where the user works with PMSPA data and the sync through a simple UI. Its
content is TBD (OQ-140, depends on OQ-139). Whatever it holds:
- Without a connection, it shows that PMSPA isn't connected, with a link to `/app/settings?tab=integrations`.
- With a connection whose status isn't "Connected", it shows the status and the same link.
**Acceptance criteria:**
- Given no connection, when I open `/app/connectors/pmspa`, then I see "not connected" and a link to the Integrations settings.

### FR-INT-008: Synchronization
**Priority:** Must
**Statement:** Projects and the other entities (tasks, workdays, logs, bookings) can be synchronized between PM4 and
PMSPA in both directions. TBD (OQ-139): which entities, direction per entity, manual or automatic, matching and conflict
rules, deletes, and what happens on disconnect.

### FR-INT-009: Entity mapping
**Priority:** Must
**Statement:** Each PMSPA entity that syncs maps to a PM4 entity and back (e.g. PMSPA project ↔ PM4 project), field by
field, including what each side does that the other doesn't. TBD (OQ-148): the entity and field mapping, worked out from
the PMSPA API documentation. It is the base for the sync rules (OQ-139).

## Next steps
1. The owner shares the PMSPA API documentation.
2. Map PMSPA's entities and functionality to PM4's (OQ-148), then decide credential storage (OQ-138).
3. Settle the sync rules (OQ-139) and the connector page (OQ-140).
4. Build the prototype from this spec (owner's order for this feature: spec first, then the prototype), then write
   the feature specs and update the layer specs (routing, screens, endpoints, data model).

## Open questions
OQ-138, OQ-139, OQ-140, OQ-148

## Changelog
- 2026-10-14: Initial draft (OQ-138…OQ-147). Owner's order for this feature: spec first, then the prototype.
- 2026-10-14: FR-INT-009 entity mapping (OQ-148) and the next steps; waiting for the PMSPA API documentation.
