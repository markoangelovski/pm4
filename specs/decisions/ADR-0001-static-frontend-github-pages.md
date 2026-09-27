# ADR-0001: Frontend is a Next.js static export on GitHub Pages

- **Status:** accepted
- **Date:** 2026-09-26
- **Deciders:** Marko Angelovski
- **Related:** web-static-export, arch-deployment, OQ-013 (custom domain, root), OQ-014 (query-param routes)

## Context
The frontend should be cheap and simple to host. GitHub Pages serves static files only.

## Decision
`web/` is built with Next.js (latest, App Router) using `output: "export"`, and deployed to GitHub
Pages through GitHub Actions.

## Consequences
- No server runtime: no Route Handlers, Server Actions, middleware, ISR or image optimization (see `04-web/static-export.md`).
- All data is fetched client-side from the API, so auth must work cross-origin (see security.md, OQ-004).
- Dynamic entity routes use query-param pages (`/projects/view/?id=…`).
- Response headers (CSP etc.) can't be configured, so meta tags are used instead.
