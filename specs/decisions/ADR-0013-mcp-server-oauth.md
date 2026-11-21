# ADR-0013: MCP server in the API, with PM4 as its OAuth 2.1 authorization server

- **Status:** accepted
- **Date:** 2026-11-21
- **Deciders:** Marko Angelovski
- **Related:** req-agents, sec, ADR-0002, ADR-0007, OQ-290, OQ-296

## Context
- Users want AI agents (Claude Code, claude.ai, OpenCode, …) to read and change their PM4 data. The standard
  interface for that is the Model Context Protocol (MCP).
- PM4's tokens (ADR-0007) are built for the web app: a 15-minute access token in memory and a rotating refresh token
  in `localStorage`. An agent can't obtain them.
- Remote MCP clients such as claude.ai connectors only connect through the MCP authorization spec, which is OAuth 2.1:
  the MCP server is a resource server, discovery runs through RFC 9728 / RFC 8414, clients are unknown in advance,
  PKCE is mandatory and tokens are bound to the resource (RFC 8707).
- The backend owns all data and business rules (system overview). The web app is a static site with no server.

## Decision
- **Placement:** the MCP server is a module of `api/`, served at `<API origin>/mcp` over Streamable HTTP. Tools call
  the existing Nest services, so user scoping and business rules are reused, not duplicated. No new app or deployment.
- **Authorization server:** PM4's API is the OAuth 2.1 authorization server for `/mcp`
  (`/.well-known/oauth-authorization-server`, `/oauth/authorize`, `/oauth/token`, `/oauth/revoke`, `/oauth/register`). It issues its own
  access tokens (audience = the `/mcp` URL, with scopes) and refresh tokens (rotated, reuse detection, as ADR-0007).
- **User authentication stays Google** (ADR-0007). The authorization server sends a signed-out user through the existing
  sign-in. No Google token reaches an app (the MCP spec forbids token passthrough).
- **Consent in the web app:** `/oauth/authorize` validates the request, keeps it in Redis, and redirects to a static
  consent page in `web/`. The page uses the user's normal session to approve or deny through the API, and the API
  answers with the redirect back to the app. No server-rendered HTML in the API.
- **Open clients:** any app may ask; it identifies itself with a Client ID Metadata Document, or registers through Dynamic Client Registration (OQ-290). The user's
  consent is the only gate.
- **Separation:** MCP tokens are rejected by `/api/v1`, and web tokens by `/mcp`. The REST API stays private to the web app.
- **Grants** are per user and revocable from the user's Connected apps list.

## Alternatives considered
- A separate `mcp/` package (local stdio server calling the REST API): every user installs and runs it, it can't
  serve claude.ai, and it needs a third app in the monorepo (ADR-0006). Rejected.
- Personal access tokens only: simple, but claude.ai connectors require OAuth. Could be added later on the same `/mcp`
  endpoint if wanted.
- A managed authorization server (Auth0, Entra, …): adds a vendor and cost (as ADR-0007).
- An allow-list of known clients: safer, but every new agent would need a config change. Rejected by the owner.
- Opening the REST API to third-party apps: a much larger supported surface. Rejected by the owner.

## Consequences
- New attack surface: the authorization endpoints, consent phishing (any app can claim any name), SSRF through
  fetching client metadata URLs, open redirects. `security.md` gets a section for them.
- New state: pending authorization requests and codes in Redis; grants and dynamically registered clients (OQ-290) in Postgres, within
  the storage rules.
- New dependency: the MCP TypeScript SDK (`@modelcontextprotocol/sdk`) for the transport. The OAuth endpoints are written
  in Nest on the existing auth module's patterns, with no OAuth library, and every auth task gets an Opus review (OQ-296).
- The consent page and Connected apps list go through the UI prototype first (ADR-0012).
