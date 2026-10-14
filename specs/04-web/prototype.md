---
id: web-prototype
title: UI Prototype
status: approved
owner: Marko Angelovski
last_updated: 2026-10-14
related: [ADR-0012, web-static-export, web-routing, web-conventions, qa-task-routing, feat-template]
---

# UI Prototype

## Purpose
How the frontend-only UI prototype is built, kept apart from production, and promoted into the real app
(ADR-0012). The prototype is where UI is decided. The aim: a Haiku implementer can promote a confirmed
prototype screen and only adapt its data wiring.

## Routes and availability
- Every app screen has a prototype twin under `/proto`: `/proto/app`, `/proto/app/projects`, `/proto/app/project?id=`,
  `/proto/app/tasks`, `/proto/app/time`, `/proto/app/bookings`, … The query params match `routing.md#route-map`.
- **Dev server only.** Route files under `web/app/proto/` are named `page.dev.tsx` and `layout.dev.tsx` (never
  `page.tsx`). `next.config.ts` adds the `dev.tsx` page extension only in the `PHASE_DEVELOPMENT_SERVER` phase, so
  `next build` emits no `/proto` route and production serves the normal `404.html` for `/proto/*`.
- **Localhost only.** The prototype shell renders the not-found page unless `window.location.hostname` is
  `localhost` or `127.0.0.1`.
- **Always signed in** as a fixed mock user. There is no prototype sign-in page, and no real auth code runs.

## Layout: mirror the app
Under `web/proto/`, every file sits at the path its production twin has (or will have) under `web/`. Promotion
then is a copy plus an import rewrite (`@/proto/` → `@/`).

```
web/
  app/proto/
    layout.dev.tsx                 # prototype shell (mock session, sidebar pointing at /proto routes, host guard)
    app/<route>/page.dev.tsx       # twin of app/(dashboard-layout)/app/<route>/page.tsx
  proto/
    features/<domain>/
      api.ts                       # MOCK hooks: copy of features/<domain>/api.ts over @/proto/mock/client
      proposed-types.ts            # API shapes the screen needs that schema.d.ts doesn't have yet
      components/  *.ts            # twins of features/<domain>/components/ and helpers (promoted)
    lib/routes.ts                  # twin of lib/routes.ts: same names, every path prefixed with /proto
    mock/                          # prototype-only, NEVER promoted
      client.ts                    #   mock apiClient: same surface as lib/api/client, answers from the store
      session.tsx                  #   fixed mock user + provider
      store.ts                     #   in-memory store per domain (module state: resets on reload); holds
                                   #   PROTO_MARKER = "pm4-proto-only" as a runtime value (see Separation)
      seed.ts                      #   seed data, dates relative to today in the mock user's time zone
      shell/                       #   prototype sidebar items and shell parts
```

- Within a feature folder, imports may be relative. Everything else uses `@/proto/...` for prototype files.
- `proto/features/<domain>/api.ts` and `proto/lib/routes.ts` are **never promoted**: the production twins are written
  (or already exist) in the real app, with the same exported names, so promoted components compile unchanged.

## Mock data layer
- `proto/features/<domain>/api.ts` is a **copy of the real `features/<domain>/api.ts`** (or what it will be) with one
  change: it imports `apiClient` (and `unwrap` etc.) from `@/proto/mock/client` instead of `@/lib/api/client`. The mock
  client has the same call surface (`GET`/`POST`/`PATCH`/`PUT`/`DELETE` by API path) and answers from the in-memory
  store, never over the network and without patching `fetch`. Query keys, invalidation and return shapes are then
  identical to production, and keeping the twins in sync is a copy. New endpoints are added to the mock client
  first, typed with `proposed-types.ts`.
- Reads resolve after a short fixed delay (`MOCK_LATENCY_MS` in `proto/mock/client.ts`) so loading states show.
- Data resets on every reload (no storage). The seed covers the empty, typical and edge cases the screen needs
  (long names, zero values, logs of deleted projects and tasks); edge cases may be switchable from the prototype shell.
- Types come from `@/lib/api/schema` where they exist. A field or endpoint the API doesn't have yet is declared in
  `proposed-types.ts` (DTO-shaped, named like the future schema type). The feature spec's *API* interfaces copy
  these shapes; after the API task, `npm run api:types` replaces them.
- The mock may also simulate API errors (`problem+json`) for the error states the spec will need.

## What the prototype may import
- **Yes:** `@/components/ui/*`, `@/hooks/*`, `@/lib/*` (except below), `@/app/components/shared/*`, `@/lib/api/schema`
  (types), other `@/proto/*` files.
- **No:** `@/features/*` (the prototype has its own twins), `@/lib/api/client`, `@/lib/auth/*`, the real shell
  under `app/(dashboard-layout)/`.

## Code standard
Prototype code follows `conventions.md` in full (shadcn via the CLI, forms with react-hook-form + zod, `lib/time`,
nuqs URL state, loading / empty / error states), so it can be promoted rather than rewritten. It has no
acceptance tests; lint and typecheck cover it.

## Separation (no trace in production)
| Guard | Where |
| --- | --- |
| `/proto` route files only match the dev-only `dev.tsx` page extension | `next.config.ts` |
| Nothing outside `proto/` and `app/proto/` imports `@/proto/*` (`no-restricted-imports`) | `eslint.config.*` |
| `postbuild` fails if `out/proto` exists or any file in `out/` contains `pm4-proto-only` (every mock hook imports the store, so leaked mock code carries the marker) | `web/package.json` |
| Shell renders not-found on non-localhost hosts | `app/proto/layout.dev.tsx` |

## Twin check
`scripts/pm4.mjs` keeps promoted files equal to their prototype twins, so feature specs don't need their own
"equals its prototype twin" checks.
- **Pairs:** every file under `web/proto/features/**` with the file at the same path minus `proto/`
  (`web/proto/features/time/api.ts` ↔ `web/features/time/api.ts`). Nothing else is compared: `proto/lib/routes.ts`,
  `proto/mock/**` and the `app/proto/**` pages differ from production by design. A prototype file with no production
  file yet is *not promoted* (counted, never a failure).
- **Normalisation:** in the prototype text, `@/proto/mock/client` becomes `@/lib/api/client`, then every other
  `@/proto/` becomes `@/`. The result is formatted with `web/`'s Prettier and the production path's config, and must
  equal the production file.
- **Intended differences:** a prototype file containing `pm4-twin: differs (<why>)` (in its doc comment) is not
  compared. Use it only where the prototype can't do what production does, e.g. `features/auth/use-sign-out.ts`
  can't import `lib/auth`.
- **Fail or warn:** a differing pair is a **failure** when either file has an uncommitted change (the change under
  check made it differ). Otherwise it's a **warning**: the prototype is ahead after a prototype commit, or the pair
  drifted earlier.
- **Where it runs:** `pm4 check` for a `web` task, and `pm4 check --feature` when the spec's *Files* table has a `web`
  row (so in `implement-task` and `review-feature`), after the spec's checks. `pm4 twins` runs it alone and exits 1
  on a failure. It needs `web/node_modules` (`npm ci` in `web/`).

## Workflow
1. **Build** (main session with the owner, `prototype` skill): the screen, its mock hooks, seed and proposed types.
   The owner tries it at `http://localhost:3000/proto/app/...`.
2. **Confirm**: the owner says the screen is confirmed. The owner commits it (`proto(web): …`). The commit SHA goes
   into the feature spec's `prototype:` field.
3. **Spec** (`write-spec`): the feature spec takes the UI from the prototype and states only the delta (see
   `specs/06-features/_TEMPLATE.md`).
4. **Promote** (`implement-task`): before delegating a web task, the orchestrator runs
   `node scripts/pm4.mjs promote <T-####>`. For each *Files* row marked `P`, it copies the prototype file to its
   production path (only if that path doesn't exist yet), rewrites `@/proto/` imports to `@/`, and lists the
   remaining `@/proto/mock/` imports the implementer must replace. Existing production files are left alone; the spec
   says how to apply the prototype's changes to them (usually `git diff <old prototype SHA> <prototype SHA> -- <file>`).
   From then on, the [twin check](#twin-check) holds the promoted and replaced files equal to their twins.
5. **Stay ahead**: a later UI change to a promoted screen starts again at step 1. A review finding that changes UI is
   fixed in both the production file and its prototype twin (both listed in *Files*).

## Open questions
—

## Changelog
- 2026-10-11: Initial version (ADR-0012).
- 2026-10-11: Approved by the owner.
- 2026-10-11: Mock hooks are copies of the real `api.ts` over a mock client (owner).
- 2026-10-11: Twin check: `pm4 check` and `pm4 twins` compare `proto/features/**` with production (T-0058).
