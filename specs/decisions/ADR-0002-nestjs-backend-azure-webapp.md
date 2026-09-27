# ADR-0002: Backend is NestJS on an Azure Web App

- **Status:** accepted
- **Date:** 2026-09-26
- **Deciders:** Marko Angelovski
- **Related:** arch-overview, arch-deployment, ADR-0008

## Context
PM4 needs a backend for auth, business rules and persistence.

## Decision
`api/` is built with NestJS (latest) and deployed to an Azure App Service Web App (Linux, Node LTS)
through GitHub Actions.

## Consequences
- The app must listen on `process.env.PORT` and expose a health endpoint for App Service.
- Configuration comes from App Settings. The DB is Neon Postgres and the cache is Redis Cloud (ADR-0008), both external to Azure.
- CORS must allow the GitHub Pages origin.
