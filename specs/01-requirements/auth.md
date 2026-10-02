---
id: req-auth
title: Auth and Accounts
status: draft
owner: Marko Angelovski
last_updated: 2026-10-03
related: [sec, api-endpoints, req-landing, web-routing, ADR-0007, feat-land-app-route-split]
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
Google and returns to PM4 signed in, landing on the page they originally asked for (the `returnTo`
kept by FR-AUTH-005), or on the dashboard **`/app`** when there is none or it is invalid (OQ-047;
validation rule in `04-web/routing.md`).
**Acceptance criteria:**
- Given I'm signed out, when I finish the Google consent, then I land on the requested page, signed in.
- Given I opened `/auth/sign-in` with no `returnTo` (or an invalid one), when I finish the Google consent, then I land on `/app`.
- Given I cancel at Google, or Google returns an error, then I'm back on the sign-in screen with a readable error (OQ-063): "Sign-in was cancelled." when I cancelled, "This account isn't allowed to use PM4." for the allow-list (FR-AUTH-002), and "Sign-in failed. Please try again." for anything else. A valid `returnTo` is kept, so signing in again still returns me to the requested page.
- The OAuth `state` is validated (CSRF protection). A tampered or expired state is rejected.

### FR-AUTH-002: Account provisioning
**Priority:** Must
**Statement:** On the first successful Google sign-in, an account is created from the Google profile
(email, name, avatar URL) and linked to the Google identity (`provider=google`, `subject=sub`).
Later sign-ins match on the identity, not on the email, and update the account's email, name and avatar URL
from the Google profile when they changed (OQ-062). Refreshing a session doesn't.
**Rules:** Only Google accounts with a verified email are accepted. Sign-up policy (OQ-022): if the
`AUTH_ALLOWED_EMAILS` allow-list is set, only listed emails can sign in, and anyone else sees a
"This account isn't allowed to use PM4" error and gets no account. An empty list means open sign-up.
**Acceptance criteria:**
- Given the allow-list is set and my email isn't on it, when I finish Google sign-in, then I'm back on the sign-in screen with the "not allowed" error, and no account was created.
- Given the allow-list is empty, any verified Google account can sign in and gets an account.
- Given I changed my Google name or photo, when I next sign in, then PM4 shows the new name and photo.
- Given my Google email isn't verified, when I finish Google sign-in, then I'm back on the sign-in screen with "Sign-in failed. Please try again.", and no account was created.

### FR-AUTH-003: Session persistence and refresh
**Priority:** Must
**Statement:** A signed-in user stays signed in across reloads until the session expires or they sign
out. Expired access tokens (15 min) are refreshed transparently, without losing the user's action. A
session lasts **at least 8 hours** of use without signing in again (OQ-023). The session is shared by all
tabs and survives closing the tab or browser (OQ-024). It ends after 30 days without use, or on sign-out.

### FR-AUTH-004: Sign out
**Priority:** Must
**Statement:** Signing out revokes the session on the server, clears the tokens in the client, and
shows the sign-in screen (`/auth/sign-in`, with no `returnTo`, so signing in again lands on `/app`).

### FR-AUTH-007: Sign out of all devices
**Priority:** Must
**Statement:** From the profile, the user can sign out of all devices. Every session of that user is
revoked. Other tabs and devices are signed out at their next refresh (at the latest, within 15 minutes).
**Acceptance criteria:**
- Given I'm signed in on two devices, when I choose "Sign out of all devices" on one, then that device shows the sign-in screen (`/auth/sign-in`). Within 15 minutes, the other device fails to refresh, removes its stored refresh token, and goes to `/?returnTo=<the page it was on>` (OQ-049, FR-AUTH-005).

### FR-AUTH-005: Protected routes
**Priority:** Must
**Statement:** Every app screen lives under `/app` and is private (OQ-047). An unauthenticated user who
opens any `/app/**` route is redirected to the public landing page `/`, which keeps the deep link as
`/?returnTo=<path+query>` (left out for the dashboard `/app` itself). From there, **Login** carries the
deep link through sign-in, and the user is returned to it afterwards (FR-LAND-002, FR-AUTH-001). If the
stored refresh token is expired or revoked, the client removes it before redirecting, so the landing page
shows "Login". The same applies when a session ends while the user is already inside `/app/**`: a failed
refresh after a 401 (expired or revoked session, "Sign out of all devices" elsewhere, allow-list removal)
removes the stored refresh token and goes to `/?returnTo=<current path+query>` (OQ-049). A user-initiated
sign-out is different: it goes to the sign-in screen (FR-AUTH-004). The API rejects unauthenticated requests with 401.
**Acceptance criteria:**
- Given I'm signed out, when I open `/app/projects`, then I'm on `/?returnTo=%2Fapp%2Fprojects`; after clicking Login and signing in, I'm on `/app/projects`.
- Given I'm signed out, when I open `/app/project?id=<uuid>`, then after Login and sign-in I'm on `/app/project?id=<uuid>`.
- Given I'm signed out, when I open `/app`, then I'm on `/`, and after Login and sign-in I'm on `/app`.
- Given my stored refresh token is expired or revoked, when I open `/app/time`, then I'm on `/?returnTo=%2Fapp%2Ftime`, the stored token is gone, and the landing page button says "Login".
- Given I'm on `/app/tasks` and my session is revoked, when the next API call gets a 401 and the refresh fails, then the stored token is gone and I'm on `/?returnTo=%2Fapp%2Ftasks`.
- Given the API can't be reached when I open `/app/tasks`, then I see "Can't reach PM4 right now." with Retry, my stored token is kept, and Retry loads the page once the API answers (OQ-067).
- Given two tabs are open in `/app/**`, when I sign out in one, then the other goes to `/?returnTo=<its page>` without waiting for a refresh (OQ-069).
- Given I'm signed in, when I open `/auth/sign-in?returnTo=%2Fapp%2Fprojects`, then I'm on `/app/projects` (OQ-070).
- Given I open an old URL such as `/projects` or `/home`, then I see the not-found page (no redirect).

### FR-AUTH-006: Profile and time zone
**Priority:** Must
**Statement:** The user can see their name, email and avatar (from Google, read-only) and set their
**time zone** (IANA, e.g. `Europe/Zagreb`). All date ranges, "today" and the default "current month"
are calculated in that zone. The zone is a **profile setting** (OQ-025). At the first sign-in it's set to
the browser's zone (`Intl.DateTimeFormat().resolvedOptions().timeZone`), which the web passes when it
starts the sign-in (OQ-061); if the zone is missing or invalid, `UTC`. Later it changes only when
the user changes it.
**Acceptance criteria:**
- Given it's my first sign-in, then my profile time zone is my browser's zone.
- Given my browser's zone differs from my profile zone (e.g. while travelling), then the app shows a dismissible warning offering to switch the profile to the browser zone.
- Given I change my time zone, then "today", the default range and all reports use the new zone.

## Open questions
— (OQ-047, OQ-049 resolved)

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Updated with owner answers to OQ-001–018.
- 2026-09-26: Owner answers to OQ-022–026, OQ-032–034.
- 2026-09-27: OQ-024 resolved: sessions shared by tabs, survive restarts, expire after 30 days unused.
- 2026-09-27: OQ-044 resolved: signed-out visitors opening `/` go to the landing page `/home/`.
- 2026-09-29: OQ-047: app screens under `/app/`; signed-out visitors on `/app/**` go to `/?returnTo=`
  (replaces the OQ-044 rule); default post-sign-in destination `/app/`; stale tokens cleared before the
  redirect; sign-out lands on `/auth/sign-in/` without `returnTo`. OQ-049 raised.
- 2026-09-29: OQ-049 resolved: a session that ends inside `/app/**` clears the stored token and goes to
  `/?returnTo=` (FR-AUTH-005, FR-AUTH-007 AC updated).
- 2026-09-29: The owner approved FR-AUTH-001, FR-AUTH-004, FR-AUTH-005 and FR-AUTH-007 for feat-land-app-route-split. The file stays `draft` because of the open account-deletion TODO.
- 2026-10-01: OQ-050: no trailing slashes (`trailingSlash: false`); detail routes `/app/project?id=` and `/app/task?id=` (feat-land-app-route-split).
- 2026-10-02: Sign-in error messages (OQ-063), profile sync on every sign-in (OQ-062), first time zone passed with the sign-in start (OQ-061) (feat-auth-api-session).
- 2026-10-02: The owner approved FR-AUTH-002, FR-AUTH-003 and FR-AUTH-006 for feat-auth-api-session. The file stays `draft` because of the open account-deletion TODO.
- 2026-10-02: FR-AUTH-005 acceptance criteria for an unreachable API, sign-out in another tab and the sign-in page while signed in (OQ-067, OQ-069, OQ-070) (feat-auth-web-session).
- 2026-10-03: The owner approved the new FR-AUTH-005 acceptance criteria for feat-auth-web-session.
