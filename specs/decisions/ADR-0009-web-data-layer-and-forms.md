# ADR-0009: Web data layer: TanStack Query; forms: react-hook-form + zod

- **Status:** accepted
- **Date:** 2026-09-26 (accepted 2026-09-27)
- **Deciders:** Marko Angelovski
- **Related:** web-conventions, ADR-0010, OQ-011

## Context
The template fetches with SWR through React contexts wrapping its own Route Handlers, and those are
removed (static export). PM4 is a CRUD-heavy client app with many related lists (projects ↔ tasks ↔
time logs ↔ reports), and those lists must stay consistent after each mutation.

## Decision
- **Server state: TanStack Query v5.** One query-key factory per domain
  (`projectKeys.list(filters)` etc.), mutations with targeted invalidation, and optimistic updates for
  quick interactions (status change, log edit). Devtools in development only.
- **HTTP: `openapi-fetch`**, typed from the generated OpenAPI types (ADR-0010), wrapped in `lib/api`
  (auth header, refresh-on-401, error mapping).
- **URL state (filters, date ranges, selected projects): `nuqs`**, so views can be shared and bookmarked
  and survive reloads on a static site. Otherwise use `useSearchParams`, wrapped in `<Suspense>`.
- **Forms: react-hook-form + zod (v4) via `@hookform/resolvers`**, rendered with the template's shadcn
  form/field primitives. Server validation errors (Problem Details `errors[]`) are mapped onto fields with `setError`.
- **No global client-state library.** Auth session state lives in a small React context. Everything else is server state or URL state.

## Why not the alternatives
- **SWR** (template): fine for reads, but mutations, dependent invalidation and optimistic updates are
  more manual. TanStack Query is also familiar from the legacy app.
- **RTK Query / Apollo:** heavier, and not a good fit for a REST API with OpenAPI types.
- **Plain `useState` forms** (template): no schema reuse, more boilerplate for validation and errors.

## Consequences
- Remove `swr` and the template contexts during adaptation (T-0002).
- Form zod schemas are hand-written in web, because UI input differs from the API DTO (e.g. duration
  `"1h 15m"` → minutes). API types come from OpenAPI.
