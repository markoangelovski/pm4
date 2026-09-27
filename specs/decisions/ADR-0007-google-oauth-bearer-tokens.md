# ADR-0007: Google OAuth handled by the API, bearer tokens to the web client

- **Status:** accepted
- **Date:** 2026-09-26
- **Deciders:** Marko Angelovski
- **Related:** sec, req-auth, OQ-003, OQ-004, OQ-024

## Context
- Sign-in is OAuth/social, starting with Google. More providers may come later.
- The web app is a static site on a custom domain. The API is on `*.azurewebsites.net`. They are
  **different sites**, so API cookies would be third-party cookies, which browsers block or partition.

## Decision
- **The OAuth Authorization Code flow (with PKCE and state) is run by the API** (`/auth/google` →
  Google → `/auth/google/callback`). Provider logic lives only in the backend, so adding a provider
  means adding a strategy module.
- After the callback, the API redirects to the web app with a **one-time code** (stored in Redis,
  60 s TTL). The web app exchanges it for an **access token** (a short-lived JWT) and a **refresh
  token** (opaque, rotated on every use, stored hashed in Redis).
- The web app keeps the access token in memory and the refresh token in `localStorage`. It sends
  `Authorization: Bearer <access token>`. There are no cookie sessions.
- Users are identified by `(provider, providerSubject)` in a `user_identities` table, so more providers can be linked later.

## Alternatives considered
- Google Identity Services on the frontend, POSTing the ID token to the API: simpler, but each future
  provider needs its own frontend SDK, and the flow logic is split across both apps.
- httpOnly refresh cookie: only viable if the API moves to a same-site custom domain. Rejected: the Free App Service tier has no custom domains (OQ-024).
- Refresh token in `sessionStorage`: no extra XSS protection, and needs a sign-in per tab. Rejected (OQ-024).
- A managed IdP (Auth0, Clerk, Entra): adds a vendor and cost for a single-user-per-account app.

## Consequences
- XSS could exfiltrate the refresh token. Mitigations: a strict CSP meta tag, no third-party scripts,
  rotation with reuse detection, and short access-token TTL.
- CORS needs no credentials. The allow-list contains only the web origin.
- Redis becomes a hard dependency for sign-in and refresh.
