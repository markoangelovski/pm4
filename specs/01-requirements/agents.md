---
id: req-agents
title: Agent access (MCP server with OAuth)
status: approved
owner: Marko Angelovski
last_updated: 2026-11-21
related: [req-auth, OQ-298, OQ-299, OQ-300, OQ-301, OQ-302, OQ-303, OQ-304, OQ-305, sec, api-endpoints, web-screens, ADR-0007, ADR-0013, OQ-287, OQ-288, OQ-289, OQ-290, OQ-291, OQ-292, OQ-293, OQ-294, OQ-295, OQ-296, OQ-297]
---

# Agent access (MCP server with OAuth)

## Purpose
AI agents (Claude Code, claude.ai, OpenCode and any other MCP client) can work with a user's PM4 data: look up
projects and tasks, read logged time and log new time. PM4 exposes a **Model Context Protocol (MCP) server**,
and an agent gets access the way third-party apps get access to GitHub or Google: through **OAuth**, with the user
approving each app on a consent screen. Each user sees the apps connected to their account in Settings and can
disconnect any of them. The architecture is ADR-0013.

## Scope
**In:** the MCP endpoint `/mcp` on the API; PM4's API as an OAuth 2.1 authorization server for that endpoint
(discovery metadata, client identification, authorization, consent, tokens, revocation); the consent page in the web app;
the per-user **Connected apps** list with revoke; the MCP tools (FR-MCP-008).
**Out:** third-party access to the REST API `/api/v1` (its tokens stay web-only); "Sign in with PM4" for other
sites (OpenID Connect); an operator view of every user's connected apps; client allow-lists (any client may ask,
the user's consent is the gate); delete tools, bookings and notes writes, PMSPA sync from an agent (OQ-288).
**Milestone:** M9 Agents (MCP) (OQ-287).

## Model
- An **app** (OAuth *client*) is an agent or service that wants access to PM4 on a user's behalf. PM4 doesn't
  register apps in advance: an app identifies itself when it first asks (FR-MCP-003).
- A **grant** is one user's approval of one app, with the **scopes** the user approved: `pm4:read`, or `pm4:write`, which includes read (OQ-289). A user has at most one
  grant per app; approving the same app again replaces it (OQ-293). Like every row, a grant belongs to exactly one user.
- PM4 issues its **own** tokens to apps: an **access token** valid only for `/mcp` (its audience) and a **refresh
  token** tied to the grant. Google stays the way the user signs in to PM4; no Google token ever reaches an app.
- A **tool** is an MCP operation an app can call (e.g. "log time"). Every tool runs as the grant's user, with that
  user's data scope and business rules, exactly like the matching REST endpoint.

## Requirements

### FR-MCP-001: MCP endpoint
**Priority:** Must
**Statement:** The API serves an MCP server at `<API origin>/mcp` over the MCP **Streamable HTTP** transport. It
accepts only PM4 access tokens issued for `/mcp` (FR-MCP-006); every tool call runs as the token's user.
**Acceptance criteria:**
- Given a valid MCP access token, when an MCP client initializes and lists tools, then it gets the tool list (FR-MCP-008).
- Given no token, an expired token, a token for another audience (a web access token) or a revoked grant, when a client calls `/mcp`, then the answer is `401` with a `WWW-Authenticate: Bearer` header carrying `resource_metadata` (FR-MCP-002).
- Given an MCP access token, when it's sent to any `/api/v1` endpoint, then the answer is `401`.

### FR-MCP-002: Discovery
**Priority:** Must
**Statement:** An MCP client that knows only the `/mcp` URL can find out how to get access, as the MCP authorization
spec requires:
- **Protected Resource Metadata** (RFC 9728) at `/.well-known/oauth-protected-resource/mcp`: the resource URL, PM4's
  authorization server, the supported scopes.
- **Authorization Server Metadata** (RFC 8414) at `/.well-known/oauth-authorization-server`: the authorize, token,
  revocation and registration (OQ-290) endpoints, `code_challenge_methods_supported: ["S256"]`, the grant types
  `authorization_code` and `refresh_token`, and CIMD support.
Both are public and live at the API host's root, outside `/api/v1`.
**Acceptance criteria:**
- Given an unauthenticated call to `/mcp`, when the client follows `resource_metadata` and then `authorization_servers`, then it gets both documents with the values above.

### FR-MCP-003: App identification (open clients)
**Priority:** Must
**Statement:** Any app may ask for access. It identifies itself with a **Client ID Metadata Document**: its
`client_id` is an HTTPS URL that serves a JSON document with its name and redirect URIs. PM4 fetches and caches it
(security rules in `security.md`, written at feature-spec time). Apps that can't publish such a document may register
through **Dynamic Client Registration** (RFC 7591, `POST /oauth/register`, OQ-290): PM4 stores the client and deletes it after
30 days without a grant.
**Acceptance criteria:**
- Given an app whose `client_id` URL serves a valid document, when it starts an authorization, then the consent screen shows the document's name.
- Given a `client_id` URL that isn't HTTPS, doesn't answer, answers with an invalid document, or whose document doesn't list the request's `redirect_uri`, then PM4 doesn't redirect to the app and shows an error page instead.

### FR-MCP-004: Authorization request
**Priority:** Must
**Statement:** `GET /oauth/authorize` follows OAuth 2.1: the authorization code flow only, **PKCE with S256**
required, `state` passed back, `redirect_uri` matched exactly against the app's registered ones (a loopback
`redirect_uri` on `127.0.0.1`, `[::1]` or `localhost` matches on any port, RFC 8252, OQ-295), `resource` equal to the `/mcp` URL (RFC 8707), and `scope` within the supported scopes. A valid
request sends the browser to the consent page (FR-MCP-005); an invalid one ends on an error page when the
`redirect_uri` can't be trusted, and otherwise back at the app with an OAuth `error`.
**Acceptance criteria:**
- Given a request without `code_challenge`, or with `code_challenge_method=plain`, then the app gets `error=invalid_request`.
- Given an unknown scope, then the app gets `error=invalid_scope`.
- Given a `redirect_uri` the app's document doesn't list, then PM4 shows an error page and doesn't redirect.

### FR-MCP-005: Consent
**Priority:** Must
**Statement:** The web app's consent page shows which PM4 account is signing in, the app's name, its `client_id`
host, the host it will return to (with the warning "This app runs on this computer" for a loopback address, OQ-295), and what it may do, in plain words
per scope. The user allows exactly what the app asked for, or denies (OQ-289). **Allow** creates or updates the grant and returns to the app with a one-time code; **Deny** returns to
the app with `error=access_denied`. A signed-out user signs in with Google first and comes back to the consent page.
An already connected app is asked for consent again, with the line "Already connected since <date>"; **Allow** replaces the
grant's scopes and ends its old tokens (OQ-293). The layout comes from the prototype.
**Acceptance criteria:**
- Given I'm signed out, when an app sends me to PM4, then I sign in with Google and land on the consent page for that request.
- Given I click **Deny**, then the app receives `access_denied` and no grant exists.
- Given I click **Allow**, then the app receives a code and state, and the app appears in my Connected apps.
- Given the pending request has expired, then the consent page says so and offers no Allow.

### FR-MCP-006: Tokens
**Priority:** Must
**Statement:** `POST /oauth/token` exchanges a code (single use, short-lived, bound to the client, the
`redirect_uri` and the PKCE verifier) for an **access token** whose audience is the `/mcp` URL and which carries the
granted scopes, and a **refresh token**. Refresh tokens rotate on every use with reuse detection, like the web's
(security.md). The access token lives **15 minutes**; the refresh token **30 days, sliding**,
so an app used at least monthly stays connected (OQ-291). A refresh fails, and the grant ends, when the user is no longer allowed
to sign in (the sign-up allow-list, FR-AUTH-002) or their account is gone.
**Acceptance criteria:**
- Given a code used twice, or with the wrong verifier, client or `redirect_uri`, then the token endpoint answers `invalid_grant`.
- Given a rotated refresh token reused, then the grant's tokens are revoked.
- Given my email was removed from the allow-list, when an app refreshes, then it gets `invalid_grant`.

### FR-MCP-007: Rate limits
**Priority:** Must
**Statement:** `/mcp` and the `/oauth/*` endpoints are rate limited with the existing throttler. Limits (OQ-297): `/mcp` 120 / min per
user; `/oauth/authorize` and `/oauth/token` 30 / min per IP; `/oauth/register` 10 / hour per IP.

### FR-MCP-008: Tools
**Priority:** Must
**Statement:** The first version's tools (OQ-288):

| Tool | Scope | Does |
| --- | --- | --- |
| Search projects | `pm4:read` | Lists or searches the user's projects |
| Search tasks | `pm4:read` | Lists or searches tasks, optionally in one project |
| Get day | `pm4:read` | One date's workday (start) and its time logs |
| List time logs | `pm4:read` | Time logs in a date range (at most 366 days) |
| Report summary | `pm4:read` | The dashboard figures for a range: worked, target, booked, hours by project |
| Log time | `pm4:write` | Creates a time log (duration, required note, project or task, date) |
| Update time log | `pm4:write` | Changes a log's duration, note, date or project/task (moves it) |
| Create task | `pm4:write` | Creates a task in a project |
| Set task status | `pm4:write` | Changes a task's status |
| Set workday start | `pm4:write` | Sets a date's start time |

No tool deletes anything, writes bookings or notes, or starts a PMSPA sync. Each tool maps to existing API behaviour (same validation, same user scope, same errors
as the REST endpoint), checks the scope it needs (OQ-289), and describes its inputs with a JSON schema.

### FR-MCP-009: Connected apps
**Priority:** Must
**Statement:** Each user sees the apps connected to their account in **Settings → Connected apps**, a new tab after Integrations (OQ-292). One row per grant: the
app's name, its `client_id` host, the scopes in plain words, when it was connected and when it was last used. **Revoke**
(confirmed in a dialog) ends the grant: its refresh tokens stop working at once, and its access tokens within their
lifetime. A user sees only their own grants.
An app that hasn't refreshed its access for 30 days can't any more: its row stays, marked **Expired — reconnect from
the app**, until the user revokes it or the app connects again (OQ-305). *Last used* isn't written to Postgres (OQ-305).
**Acceptance criteria:**
- Given I connected two apps, then I see both with their names and scopes, and no other user's apps.
- Given I revoke an app, when it next refreshes, then it gets `invalid_grant`, and it's gone from the list.

### FR-MCP-010: Grants end with the account
**Priority:** Must
**Statement:** Deleting the account (FR-AUTH-008) deletes all its grants. **Sign out of all devices** (FR-AUTH-007)
ends every grant too, so it stays the one action that locks everything (OQ-294).

## Open questions
None. OQ-287…OQ-297 are resolved.

## Changelog
- 2026-11-21: Created (draft). Owner decisions: MCP inside the API at `/mcp`, PM4 as the OAuth authorization server,
  tokens only for `/mcp`, open clients with consent as the gate, a per-user Connected apps list.
- 2026-11-21: OQ-287…OQ-297 resolved and folded in (tools, scopes, CIMD + DCR, token lifetimes, Connected apps tab,
  re-consent, sign-out-all, loopback redirects, rate limits). Status `review`.
- 2026-11-21: Approved by the owner.
- 2026-11-21: FR-MCP-009: expired apps stay listed, *last used* not in Postgres (OQ-305). Back to `review`.
- 2026-11-21: Approved by the owner.
