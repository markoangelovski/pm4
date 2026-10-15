---
id: T-0053
title: Migrate the confirmed UI prototype to the prototype layout (dev-only routes, twins, mock client)
milestone: M0
app: web
status: done
size: L
tier: opus
depends_on: [T-0052]
feature_spec: —
files: [web/proto/**, web/app/proto/**, web/tsconfig.json]
specs: [specs/04-web/prototype.md, specs/decisions/ADR-0012-ui-prototype.md]
ac_files: []
---

# T-0053: Migrate the confirmed UI prototype to the prototype layout (dev-only routes, twins, mock client)

**Tier reason:** opus: restructures every prototype file and replaces the mock backend; the owner-confirmed UI must not change.

## Goal
The owner-confirmed prototype (2026-10-11) follows `specs/04-web/prototype.md` and passes the T-0052 guards, with
**no visual change**, so it can be tracked and committed as the base of the prototype → production sync spec.
(Re-scoped by the owner: the earlier plan rebuilt the prototype from production and would have lost the confirmed UI.)

## Change
- Routes: `app/proto/layout.dev.tsx` and `app/proto/app/**/page.dev.tsx` (dev server only).
- Mirrored paths: prototype screens move to `proto/features/<domain>/…`, routes to `proto/lib/routes.ts` (same names as
  `lib/routes.ts`, app screens under `/proto/app`). `protoRoutes.x` becomes `routes.app.x`.
- Twins: the production files the prototype used through the fetch patch are copied under `proto/features/`
  (time, projects, tasks, users; `@/features` → `@/proto/features`, `@/lib/api/client` → `@/proto/mock/client`),
  plus a mock `useSignOut`. The shell parts go to `proto/mock/shell/`.
- Mock layer `proto/mock/`: `store.ts` (state, `PROTO_MARKER`), `seed.ts` (same data, relative to today), `client.ts`
  (openapi-fetch client over a store-backed `fetch`, `MOCK_LATENCY_MS`), `hooks.ts` (store hooks for Dashboard,
  Bookings and logged time), `session.tsx` (always signed in; not-found off localhost).
- Removed: `proto/mock-backend.ts` (the `window.fetch` patch, the `pm4.refreshToken = "x"` login), `AuthGuard` in the
  prototype shell, `proto/.snapshots/`.
- `web/tsconfig.json`: exclude `.next/dev/types/validator.ts` (see notes).
- Tailwind: the 26 prototype-only classes that generated no CSS while the prototype was git-excluded are deleted, so
  tracking the files changes nothing visually.

## Acceptance criteria
- [ ] Every prototype route renders as before (owner check at `/proto/app/**`).
- [ ] `npm run lint` passes the T-0052 import rules; no prototype file imports `@/features`, `@/lib/api/client`,
      `@/lib/auth` or the real shell.
- [ ] No request leaves the browser on `/proto/app/**`; mutations update the mock data until a reload.
- [ ] `npm run build` emits no `/proto` route, `postbuild` passes.

## Checks
```bash
test ! -e web/out/proto && test ! -e web/out/proto.html
! grep -rqE 'from "@/(features|lib/api/client|lib/auth|app/\(dashboard-layout\))' web/proto web/app/proto
```

---

## Implementation notes
Done in the main session in `.worktrees/T-0053`, from a copy of the main checkout's prototype.

Verified against the confirmed prototype (main checkout, `next dev` :3000) with the migrated one (:3002), `agent-browser`:
- Rendered DOM of all 7 routes identical except the banner text and the logo link (`/app` → `/proto/app`).
- Full-page pixel diffs: only the banner, plus the "Created …" timestamp (seed time) and headless chart flakiness;
  the chart SVGs (Dashboard, Logs) are identical.
- No console errors, no `/api/v1` requests, `pm4.refreshToken` untouched; creating a project works.
- Tailwind (oxide scanner + `@tailwindcss/node` compile): 26 prototype-only candidates generated CSS that the
  git-ignore-aware scan never saw (e.g. `text-right`, `px-6`, `table-fixed`, `min-w-[64rem]`, `h-64!`, `border-2`,
  `bg-amber-500/10`); confirmed absent from the served CSS, then deleted. Re-scan: 0.

Found here (a T-0052 gap): after `next dev` has run, `next build` and `npm run typecheck` failed with
`.next/dev/types/validator.ts: Type '"/proto"' is not assignable to type '"/"'`. Next 16.3 type-checks the build with
the `tsc` CLI (`experimental.useTypeScriptCli` defaults to `true`), which doesn't drop `.next/dev/types` the way the
older in-process check did, so the dev validator checks the dev-only `/proto` layout against the build's route types.
Pages are unaffected (T-0052's probe was a page). Fix: `tsconfig.json` excludes the dev validator; the build still
validates every real route with `.next/types/validator.ts`. `next dev` keeps the exclude on restart.

Intentional changes:
- Banner: "UI prototype: mock data in memory, reset on every reload." (the `pm4.refreshToken = "x"` hint is gone).
- The logo goes to the prototype dashboard. Sign-out goes to the landing page. Settings and User profile
  still link to the real app (no prototype twins yet).

Follow-ups (proposals, not done):
- Dashboard, Bookings and the logged-time section read the store through `proto/mock/hooks.ts`, not a mock `api.ts`
  twin: their API shape is decided by the sync spec, which converts them.
- `npm run format:check` doesn't cover `proto/` (the files are Prettier-formatted).

`pm4 check T-0053`: scope ok, lint ok (1 warning: TanStack Table vs React Compiler, as in production), format:check ok,
typecheck ok, test ok, build ok (postbuild: no `out/proto`, no marker), checks ok → PASS.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | opus (main session) | done | Migrated, compared route by route, dead classes removed |

## Review
Owner reviewed the diff (quick lane), 2026-10-11: approved.
