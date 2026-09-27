---
id: req-auth
title: Auth and Accounts
status: draft
owner: Marko Angelovski
last_updated: 2026-09-27
related: [sec, api-endpoints, req-landing, ADR-0007]
---

# Auth and Accounts

## Purpose
Covers how users sign in (Google OAuth), how sessions are kept, and the user profile.

## Scope
**In:** sign in with Google, automatic account creation on first sign-in, session persistence and
refresh, sign out, protected routes, and a profile (name, avatar, email, time zone).
**Out (MVP):** email/password, other providers (the design allows adding them), account linking UI,
account deletion (TODO: confirm), MFA (delegated to Google).

## Requirements

### FR-AUTH-001: Sign in with Google
**Priority:** Must
**Statement:** The sign-in screen shows a "Continue with Google" button. The user authenticates with
Google and returns to PM4 signed in, landing on the page they originally asked for (default: dashboard).
**Acceptance criteria:**
- Given I'm signed out, when I finish the Google consent, then I land on the requested page, signed in.
- Given I cancel at Google, or Google returns an error, then I'm back on the sign-in screen with a readable error.
- The OAuth `state` is validated (CSRF protection). A tampered or expired state is rejected.

### FR-AUTH-002: Account provisioning
**Priority:** Must
**Statement:** On the first successful Google sign-in, an account is created from the Google profile
(email, name, avatar URL) and linked to the Google identity (`provider=google`, `subject=sub`).
Later sign-ins match on the identity, not on the email.
**Rules:** Only Google accounts with a verified email are accepted. Sign-up policy (OQ-022): if the
`AUTH_ALLOWED_EMAILS` allow-list is set, only listed emails can sign in, and anyone else sees a
"This account isn't allowed to use PM4" error and gets no account. An empty list means open sign-up.
**Acceptance criteria:**
- Given the allow-list is set and my email isn't on it, when I finish Google sign-in, then I'm back on the sign-in screen with the "not allowed" error, and no account was created.
- Given the allow-list is empty, any verified Google account can sign in and gets an account.

### FR-AUTH-003: Session persistence and refresh
**Priority:** Must
**Statement:** A signed-in user stays signed in across reloads until the session expires or they sign
out. Expired access tokens (15 min) are refreshed transparently, without losing the user's action. A
session lasts **at least 8 hours** of use without signing in again (OQ-023). The session is shared by all
tabs and survives closing the tab or browser (OQ-024). It ends after 30 days without use, or on sign-out.

### FR-AUTH-004: Sign out
**Priority:** Must
**Statement:** Signing out revokes the session on the server, clears the tokens in the client, and
shows the sign-in screen.

### FR-AUTH-007: Sign out of all devices
**Priority:** Must
**Statement:** From the profile, the user can sign out of all devices. Every session of that user is
revoked. Other tabs and devices are signed out at their next refresh (at the latest, within 15 minutes).
**Acceptance criteria:**
- Given I'm signed in on two devices, when I choose "Sign out of all devices" on one, then that device shows the sign-in screen, and the other can't refresh and shows the sign-in screen within 15 minutes.

### FR-AUTH-005: Protected routes
**Priority:** Must
**Statement:** An unauthenticated user who opens any app screen is redirected to sign-in, and returned
to that screen afterwards. **Exception:** opening the app root `/` without a session redirects to the
public landing page `/home/` instead (OQ-044, req-landing). The API rejects unauthenticated requests with 401.
**Acceptance criteria:**
- Given I'm signed out, when I open `/projects/`, then I'm on sign-in, and after signing in I'm on `/projects/`.
- Given I'm signed out, when I open `/`, then I'm on `/home/`.

### FR-AUTH-006: Profile and time zone
**Priority:** Must
**Statement:** The user can see their name, email and avatar (from Google, read-only) and set their
**time zone** (IANA, e.g. `Europe/Zagreb`). All date ranges, "today" and the default "current month"
are calculated in that zone. The zone is a **profile setting** (OQ-025). At the first sign-in it's set to
the browser's zone (`Intl.DateTimeFormat().resolvedOptions().timeZone`). Later it changes only when
the user changes it.
**Acceptance criteria:**
- Given it's my first sign-in, then my profile time zone is my browser's zone.
- Given my browser's zone differs from my profile zone (e.g. while travelling), then the app shows a dismissible warning offering to switch the profile to the browser zone.
- Given I change my time zone, then "today", the default range and all reports use the new zone.

## Open questions
—

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Updated with owner answers to OQ-001–018.
- 2026-09-26: Owner answers to OQ-022–026, OQ-032–034.
- 2026-09-27: OQ-024 resolved: sessions shared by tabs, survive restarts, expire after 30 days unused.
- 2026-09-27: OQ-044 resolved: signed-out visitors opening `/` go to the landing page `/home/`.
