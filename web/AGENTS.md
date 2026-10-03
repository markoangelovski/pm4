# AGENTS.md — pm4/web

Instructions for AI coding agents working in `web/`, the PM4 frontend. Read the repo root
`AGENTS.md` first (monorepo rules, non-negotiable constraints, the review-before-commit rule). This file
covers only what's specific to this app. When in doubt, the specs win:
`../specs/04-web/*.md`, `../specs/decisions/ADR-0009-web-data-layer-and-forms.md`,
`../specs/decisions/ADR-0010-openapi-contract.md`.

## What this is

Next.js (App Router) built as a **static export** (`output: "export"`) and deployed to GitHub
Pages at the domain root. There is **no Node server at runtime**. All data comes from the NestJS
API (`../api/`) over `NEXT_PUBLIC_API_BASE_URL`, fetched in the browser.

Base: the `next-shadcn-dashboard` template (ADR-0005), adapted in T-0002 — demo features, the
Route Handlers, SWR and the template's own contexts are gone; the shell (sidebar, header, theme)
stays.

## Commands (run from `web/`)

| Command | Does |
| --- | --- |
| `npm ci` | Install (use this in CI; `npm install` locally) |
| `npm run dev` | Dev server (`next dev`) |
| `npm run build` | Production build → `out/` (static export) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` / `npm run test:watch` | Vitest (unit + component tests) |
| `npm run api:types` | Regenerate `lib/api/schema.d.ts` from `../api/openapi.json` |

Node version: see `.nvmrc` (24).

## Structure

```
app/
  layout.tsx                    # root layout: metadata (noindex), ThemeProvider, QueryProvider
  page.tsx                       # public landing page `/` (SCR-003), own header, no sidebar
  auth/sign-in/  auth/callback/  # outside the authenticated shell
  (dashboard-layout)/            # authenticated shell (sidebar + header), wraps `/app/**` only
    layout.tsx                   #   TODO(M1): auth guard goes here
    app/                         #   the `/app` URL segment
      page.tsx                   #     dashboard `/app`
      projects/  project/  tasks/  task/  time/  trash/  settings/
    layout/                      #   shell internals: header, sidebar, footer, logo
  components/shared/             # small shared pieces used by pages (not shadcn primitives)
components/ui/                   # shadcn primitives — see the shadcn CLI rule below
hooks/                           # small reusable hooks (e.g. use-mobile)
lib/
  api/                           # openapi-fetch client + generated schema.d.ts (see ADR-0010)
  time/                          # time-zone-aware date helpers (see below)
  query-client.tsx               # TanStack Query client + provider (ADR-0009)
  routes.ts                      # every internal route path (no other file hard-codes one)
  auth/return-to.ts              # returnTo validation + landing/sign-in/post-sign-in targets
  version.ts                     # web version (inlined at build time) + version summary text
  utils.ts                       # cn()
features/<domain>/               # data-driven work per conventions.md: api.ts (query keys + hooks),
                                  # schemas.ts (zod), components/. First one: features/system/
                                  # (API version query + VersionBadge); add domains as implemented
```

## Rules specific to this app
Full detail: `../specs/04-web/static-export.md` and `../specs/04-web/conventions.md`.

- **Static export.** Every route exists at build time. URLs have no trailing slash
  (`trailingSlash: false`). Entity pages use flat query-param routes (`/app/project?id=…`), not `[id]`,
  and never a child route. Take every path from `lib/routes.ts`. `next.config.ts` is a tested baseline, and its comments say
  which template options broke the export. After `npm run build`, serve `out/` (`npx serve out`) and
  hard-refresh a deep route before calling anything done.
- **shadcn** style is `base-nova` on Base UI, not Radix. A custom component is allowed only when no
  shadcn one fits, or the fitting one is paid. Put it in `features/<domain>/components/`, and say why
  in the task notes.
- **Data layer.** Hooks and query-key factories live in `features/<domain>/api.ts`. Mutations
  invalidate the precise keys they affect. `lib/api/schema.d.ts` is generated (`npm run api:types`)
  from `../api/openapi.json`; never edit it by hand. Auth headers and refresh-on-401 go in `lib/api/client.ts` only (M1).
- **Time.** Work dates are `YYYY-MM-DD` strings, handled as calendar arithmetic (see the comments in
  `lib/time/index.ts`). Keep the Europe/Zagreb midnight and DST cases in `lib/time/index.test.ts`.

## Known toolchain pins: don't change them

`typescript` is pinned to `6.0.3`, `eslint` to `9.39.x`, and `.npmrc` has `legacy-peer-deps=true`.
Each works around an ecosystem gap (`typescript-eslint` doesn't support TS 7; `eslint-plugin-react`
doesn't support ESLint 10; peer ranges). The reasons are in T-0002's *Implementation notes*
(`../tasks/m0-foundation/T-0002-bootstrap-web-from-template.md`). Changing any of them is an owner decision.

## Testing

- Vitest (`vitest.config.ts`, jsdom environment, `@` alias matching `tsconfig.json`) +
  Testing Library. `vitest.setup.ts` loads `@testing-library/jest-dom`.
- Mock `next/navigation` (`useRouter`, `useSearchParams`) for components that read the URL — see
  `app/components/shared/view-id-guard.test.tsx`.
- Playwright is **not** set up yet — that's M1+, once there's a real API to run journeys against.

## Patterns to copy
No form or data view exists yet. The **first** of each becomes the reference; their tasks are
opus/sonnet (`../specs/05-quality/task-routing.md`). Add them here when they land.

| Need | Copy from | What to copy |
| --- | --- | --- |
| Query hook + key factory | `features/system/api.ts` | `systemKeys` factory + `useXxx` hook over `apiClient`; per-query option overrides only with a spec reason |
| Domain component | `features/system/components/version-badge.tsx` | `"use client"` component in `features/<domain>/components/` consuming the domain hook |
| Page with metadata | `app/(dashboard-layout)/app/projects/page.tsx` | `export const metadata`, a server page wrapping client parts |
| Entity detail route (`?id=`) | `app/(dashboard-layout)/app/project/page.tsx` + `app/components/shared/view-id-guard.tsx` | `<Suspense>` + `ViewIdGuard` |
| Client part reading `?returnTo=` | `app/components/shared/landing-cta.tsx` + `app/page.tsx` | `useSearchParams` inside `<Suspense>` with a same-size fallback |
| Query client / defaults | `lib/query-client.tsx` | Don't override the defaults per query without a spec reason |
| API calls | `lib/api/client.ts` | Use `apiClient` inside `features/<domain>/api.ts` hooks only |
| Dates and durations | `lib/time/index.ts` | `today(tz)`, `monthRange()`, `formatDuration()` |
| Typed stub for unwritten code | `lib/time/index.ts` → `parseDuration` | Signature + `throw new Error("not implemented (…)")` |
| Component test with router mocks | `app/components/shared/view-id-guard.test.tsx` | `vi.mock("next/navigation", …)` |
| shadcn polymorphism | any `components/ui/*.tsx` | Base UI's `render={<X />}`, not `asChild` |

## Never
- Never edit `*.ac.test.ts(x)` (acceptance tests) unless you are the test writer.
- Never hand-write or copy code into `components/ui/`. Use `npx shadcn@latest add`.
- Never call `fetch` or `apiClient` from a component. Never compute a date with `toISOString()`.
- Never add `route.ts`, Server Actions, middleware or `[param]` segments. Never add a Next config
  option without a static-export build check.
- Never edit `lib/api/schema.d.ts` by hand. Run `npm run api:types`.
- Never add dependencies without asking (the shadcn CLI installing a component's own deps is fine).
- Never touch `../api/`, `../frontend_old/`, `../backend_old/` or the template zip. Never open `.env*` except `.env.example`.
- Never stage, commit or push. Leave changes uncommitted for the owner's review (`../AGENTS.md` §3).
