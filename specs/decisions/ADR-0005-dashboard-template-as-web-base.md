# ADR-0005: Dashboard template as the base of `web/`

- **Status:** accepted
- **Date:** 2026-09-26
- **Deciders:** Marko Angelovski
- **Related:** web-template, arch-stack

## Context
A ready-made Next.js + shadcn admin dashboard (`next-shadcn-dashboard-main.zip`) provides a layout,
theming and UI primitives. It was built for a Node server (standalone output, Route Handlers).

## Decision
`web/` starts from this template, adapted to a static export as `04-web/template-adaptation.md` describes.

## Consequences
- The template's server-only features and demo apps are removed during bootstrap.
- PM4 inherits the template's stack choices (Base UI-based shadcn, Tailwind v4) unless a spec overrides them. Overrides: npm instead of pnpm (ADR-0006), TanStack Query instead of SWR (ADR-0009).
