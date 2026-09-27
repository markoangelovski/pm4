# ADR-0010: OpenAPI is the contract; web uses generated types

- **Status:** accepted
- **Date:** 2026-09-26 (accepted 2026-09-27)
- **Deciders:** Marko Angelovski
- **Related:** api-conventions, api-endpoints, ADR-0006, ADR-0009, OQ-012

## Context
`web/` and `api/` share a monorepo, but they are independent npm projects with separate deploys
(ADR-0006). The client needs accurate request/response types without a shared runtime package.

## Decision
1. The API describes every endpoint with `@nestjs/swagger` (the CLI plugin infers most metadata from DTOs).
2. An `api` script (`npm run openapi:export`) writes **`api/openapi.json`**, which is committed.
   API CI fails if the committed file is out of date.
3. The web script `npm run api:types` runs **`openapi-typescript ../api/openapi.json -o src/lib/api/schema.d.ts`**
   (committed). Web CI fails if the file is out of date. The web deploy workflow also triggers on
   changes to `api/openapi.json`.
4. The web client uses **`openapi-fetch`** (a ~6 kB, fully typed fetch wrapper) over those types.

## Why not the alternatives
- A shared zod/types npm workspace package: couples installs and deploy artifacts, which ADR-0006 rejects.
- A generated full SDK (orval, openapi-generator): more generated code and heavier output. It might be
  reconsidered later, e.g. orval's TanStack Query hooks.
- Hand-written types: they drift silently.

## Consequences
- An API change is a two-step change: update the API and regenerate `openapi.json`, then regenerate
  the web types. A breaking API change must be deployed together with the web change, or kept backward compatible.
