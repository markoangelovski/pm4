# AGENTS.md — pm4/web

Instructions for AI coding agents working in `web/`, the PM4 frontend. Read the repo root
`AGENTS.md` first (monorepo rules, non-negotiable constraints, "agents never commit"). This file
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

Node version: see `.nvmrc` (24). `.npmrc` has `legacy-peer-deps=true` — still required (see
*Known toolchain pins* below), don't remove it without re-testing `npm install` from scratch.

## Structure

```
app/
  layout.tsx                    # root layout: metadata (noindex), ThemeProvider, QueryProvider
  home/                          # public landing page (SCR-003), own header, no sidebar
  auth/sign-in/  auth/callback/  # outside the authenticated shell
  (dashboard-layout)/            # authenticated shell (sidebar + header)
    layout.tsx                   #   TODO(M1): auth guard goes here
    page.tsx                     #   dashboard
    projects/  projects/view/  tasks/  tasks/view/  time/  trash/  settings/
    layout/                      #   shell internals: header, sidebar, footer, logo
  components/shared/             # small shared pieces used by pages (not shadcn primitives)
components/ui/                   # shadcn primitives — see the shadcn CLI rule below
hooks/                           # small reusable hooks (e.g. use-mobile)
lib/
  api/                           # openapi-fetch client + generated schema.d.ts (see ADR-0010)
  time/                          # time-zone-aware date helpers (see below)
  query-client.tsx               # TanStack Query client + provider (ADR-0009)
  utils.ts                       # cn()
features/<domain>/               # not created yet; conventions.md's target structure for
                                  # data-driven work: api.ts (query keys + hooks), schemas.ts
                                  # (zod), components/ — add as each domain is implemented
```

Entity detail pages use **query-param routes**, not dynamic segments: `/projects/view/?id=…`. A
client component reads `id` with `useSearchParams` inside `<Suspense>` and redirects (replace) to
the list route when `id` is missing or empty — see `app/components/shared/view-id-guard.tsx`.

## Static-export hard rules (re-read `../specs/04-web/static-export.md` before changing `next.config.ts`)

- No Route Handlers (`app/**/route.ts`), Server Actions, middleware/proxy, ISR, `cookies()` /
  `headers()`, or Next image optimization. Client components + the API only.
- Every route must exist at build time. No `[id]` dynamic segments — use query-param routes.
- `next.config.ts` is the tested baseline (`output: "export"`, `trailingSlash: true`,
  `images.unoptimized: true`, `reactCompiler` + `experimental.turbopackRustReactCompiler`). Before
  adding any other Next config option, build with `output: "export"` and confirm it actually works
  — several template options (`output: "standalone"`, `cacheComponents`, `partialPrefetching`,
  `experimental.useOffline`) do not, and were removed in T-0002 (see the config file's comments
  and the task's Implementation notes for why).
- After `npm run build`, serve `out/` statically (`npx serve out`) and hard-refresh a deep route
  (e.g. `/projects/view/?id=…`) before calling anything done.

## Components (shadcn) — always use the CLI

- Install every shadcn component, primitive or block, with `npx shadcn@latest add <name>` **run
  from `web/`**. Never hand-write or copy component source into `components/ui/`.
- This template's style is `base-nova` on **Base UI** (`@base-ui/react`), not Radix. Its
  polymorphic prop is `render={<Link href="…" />}`, not `asChild`. Check an existing
  `components/ui/*.tsx` file for the pattern before assuming Radix conventions.
- A custom component is allowed only when no shadcn component fits, or the fitting one is paid —
  build it in `features/<domain>/components/` (or `app/components/shared/` if it's shell-level),
  and say why in the task's Implementation notes.

## Data layer (ADR-0009 / ADR-0010)

- Components call hooks from `features/<domain>/api.ts`, never `fetch`/`lib/api` directly.
- `lib/api/client.ts` wraps `openapi-fetch` over generated types (`lib/api/schema.d.ts`). That
  schema file is a **stub** (`export interface paths {}`) until `../api/openapi.json` exists —
  regenerate it with `npm run api:types` once it does, and keep it committed and current (CI will
  fail on drift once that's wired up).
- TanStack Query defaults (`lib/query-client.tsx`): `staleTime` 30s, `retry: 1` for queries,
  `retry: 0` for mutations. Query keys come from a per-domain factory; mutations invalidate the
  precise keys they affect.
- Auth headers, the shared refresh-on-401, and Problem Details → field error mapping land with
  auth (M1). Until then `lib/api/client.ts` has no auth handling — don't add ad hoc token logic
  elsewhere; do it there when M1 lands.

## Time and dates (`lib/time`)

- Always use `lib/time`'s `today(tz)`, `monthRange(date, tz)`, `formatDuration(minutes)`. Never
  `new Date().toISOString().split("T")[0]` — that reads the UTC date and is wrong near midnight.
- Work dates are `YYYY-MM-DD` strings end to end, handled as calendar arithmetic, not instants —
  see the comments in `lib/time/index.ts` for why `monthRange` deliberately avoids going through a
  time-zone-converted instant.
- `parseDuration` is a typed stub (throws `"not implemented (M4)"`) until the time-log form needs
  it.
- `lib/time/index.test.ts` has the required Europe/Zagreb midnight/DST test cases
  (`specs/05-quality/testing.md`) — extend it, don't remove the coverage, when you touch this file.

## Known toolchain pins (revisit when the ecosystem catches up)

- **TypeScript is pinned to `6.0.3`**, not the `7.0.x` native compiler `specs/02-architecture/tech-stack.md`'s
  Shared table lists. `typescript-eslint` (used by `eslint-config-next`) does not support TypeScript
  7.x yet (confirmed against its latest published peer range at T-0002). Re-test with `7.x` and
  update this note + flag the tech-stack.md Shared table for an owner update once it does.
- **ESLint is pinned to `9.39.x`**, not `10.x`. `eslint-plugin-react` (via `eslint-config-next`)
  does not support ESLint 10 yet (`context.getFilename is not a function`). ESLint 9 is EOL
  upstream, so this is a temporary, deliberately-tracked pin, not a long-term choice.
- `.npmrc`'s `legacy-peer-deps=true` is required for at least two independent reasons: the
  template's own peer graph, and `openapi-typescript`'s peer range (`typescript ^5.x`) conflicting
  with our pinned `6.0.3`.

## Testing

- Vitest (`vitest.config.ts`, jsdom environment, `@` alias matching `tsconfig.json`) +
  Testing Library. `vitest.setup.ts` loads `@testing-library/jest-dom`.
- Mock `next/navigation` (`useRouter`, `useSearchParams`) for components that read the URL — see
  `app/components/shared/view-id-guard.test.tsx`.
- Playwright is **not** set up yet — that's M1+, once there's a real API to run journeys against.

## Non-negotiable reminders

- Agents never commit, stage, stash or push (repo root `AGENTS.md` §3). Leave changes uncommitted.
- Don't touch `../api/`, `../frontend_old/`, `../backend_old/`, or the template zip.
- Don't open any `.env*` file except `.env.example`.
