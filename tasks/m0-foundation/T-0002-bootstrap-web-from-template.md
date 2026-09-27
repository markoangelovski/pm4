---
id: T-0002
title: Bootstrap web/ from the dashboard template as a static export
milestone: M0
app: web
status: done
size: L
depends_on: [T-0005]
specs:
  - specs/04-web/template-adaptation.md
  - specs/04-web/static-export.md
  - specs/04-web/conventions.md
  - specs/04-web/routing.md
  - specs/decisions/ADR-0009-web-data-layer-and-forms.md
  - specs/decisions/ADR-0010-openapi-contract.md
requirements: []
---

# T-0002: Bootstrap web/ from the dashboard template as a static export

## Goal
Turn `next-shadcn-dashboard-main.zip` into a clean PM4 app shell that builds to a static `out/`.

## Scope
**In:** unzip the template into `web/`, then everything in `04-web/template-adaptation.md` (Keep / Remove / Change),
including the pnpm → npm conversion; the static export config (served from the root; no `public/CNAME` or `.nojekyll`, see `deployment.md`);
placeholder pages for the route map in `routing.md` (with the missing-`id` redirect on `view` pages);
the TanStack Query provider and a `lib/api` stub reading `NEXT_PUBLIC_API_BASE_URL`; `lib/time` skeleton;
`.nvmrc`; `web/AGENTS.md` / `web/CLAUDE.md` (replacing the template's, and deleting its `.agents`/`.claude` skill copies).

**Out:** real auth, real data screens, CI/CD (T-0003).

## Acceptance criteria
- [x] No `app/api/**` Route Handlers and no demo features remain. Unused dependencies removed.
- [x] `next.config.ts` matches the static-export baseline. Every incompatible template option is removed, and each removal is documented.
- [x] Only `package-lock.json` exists (no pnpm lockfile). `npm run lint` and `npm run build` pass, and `out/` is produced.
- [x] Served statically from the root, the shell and every placeholder route load on hard refresh. `/projects/view/` without an `id` redirects to `/projects/`.
- [x] `swr`, the template contexts and `app/api/**` are gone.
- [x] The sidebar shows the PM4 navigation. Light/dark theme works.
- [x] `web/AGENTS.md` describes the adapted app (not the template). The tech-stack spec is updated with the actual versions.
- [x] Definition of Done satisfied (see below; one item is N/A at this stage and one could not be
      verified in this session — both called out explicitly rather than silently ticked).

## Blocked by
- T-0005 (monorepo). Specs approved 2026-09-27.

---

## Implementation notes

### What changed
Unzipped `next-shadcn-dashboard-main.zip` into `web/` (flattened, no `node_modules` in the zip).
Deleted all demo content per `template-adaptation.md`'s Remove list: `app/api/**`, `app/context/**`,
the `apps/`, `icons/`, `pages/`, `types/apps` route groups, `app/components/{apps,dashboards,
user-profile,animated-components,icons}`, `app/components/tables/**` (unused by the shell — the
plan said keep it only if the shell uses it; it doesn't yet), password/2FA/maintenance/error auth
pages, `sidebar/buy-now`, header `search`/`notifications`, `Dockerfile`/`.dockerignore`,
`CHANGELOG.md`, `skills-lock.json`, `.agents/`, `.claude/`, the template's own `AGENTS.md`/
`CLAUDE.md`/`README.md` (LICENSE kept), and all demo images under `public/images/**` (kept only
`google-icon.svg` and the app `favicon.ico`, moved to `app/favicon.ico` for Next's auto-favicon
convention — it was oddly sitting at the template's project root, not `app/`, so this is a genuine
fix, not just a copy).

Rewrote the shell to remove now-unused libraries: `sidebaritems.ts` (PM4 nav, no `lodash.uniqueId`),
`app-sidebar.tsx` (shadcn `ScrollArea` instead of `simplebar-react`), `nav-items/index.tsx` (plain
CSS hover instead of `motion`/`framer-motion`), header (`search`/`notifications` removed, added a
disabled "Log time" placeholder button + a real user-menu dropdown), `profile.tsx` → a static
avatar/settings/sign-out `DropdownMenu` (no session yet), `full-logo.tsx` → PM4 text mark, `footer`
→ minimal PM4 text (also **moved out of a routable `page.tsx`**: the template had it at
`layout/footer/page.tsx`, which Next was building as a real, unintended public route at
`/layout/footer` — renamed to `layout/footer.tsx`, confirmed the stray route is gone from the
build's route list). Deleted the unused `logo.tsx` (icon-only variant, no reference), unused
`breadcrumb-comp.tsx`, `nav-user.tsx`/`nav-secondary.tsx` (help-center/upgrade demo widgets), and
the now-orphaned `components/ui/input-otp.tsx` shadcn primitive (its only consumer, the 2FA demo
page, was removed, and `input-otp` is off the dependency list).

Added the route map from `routing.md`: `(dashboard-layout)/{page,projects,projects/view,tasks,
tasks/view,time,trash,settings}` (placeholders picking sensible milestones: Settings M1, Projects/
Tasks M2, Time M3, Trash M4, Dashboard M5 — reports naturally come last since they read
projects+tasks+time), `auth/sign-in` (Google-only, no-op button), `auth/callback` (spinner),
`home` (public landing, own header, no sidebar), `not-found.tsx` (plain, no demo image). The two
`view` pages use a new shared `app/components/shared/view-id-guard.tsx` client component
(`useSearchParams` inside `<Suspense>`, `router.replace(listPath)` when `id` is missing/empty) —
built as a plain-`children` component, not a render-prop function, because a Server Component page
cannot pass a function to a Client Component prop (`next build` initially failed with exactly that
error; fixed by making `children` a `ReactNode`).

Added `lib/time/index.ts` (`today`, `monthRange`, `formatDuration`, stub `parseDuration`), `lib/api/
client.ts` (+ stub `schema.d.ts`), `lib/query-client.tsx` (TanStack Query client + provider, ADR-0009
defaults), root `app/layout.tsx` (PM4 metadata, `robots: {index:false, follow:false}`, ThemeProvider
+ QueryProvider), `.env.example`, `.nvmrc` (`24`), `vitest.config.ts` + `vitest.setup.ts`.

### `next.config.ts` decisions (tested with real builds, not just docs)
| Option | Kept? | Why |
| --- | --- | --- |
| `output: "standalone"` → `output: "export"` | replaced | static-export.md's hard requirement |
| `trailingSlash`, `images.unoptimized` | kept | static-export.md baseline |
| `experimental.useOffline` | **removed** | Per the plan (unconditional). Its retry mechanism targets navigation/prefetch/Server-Action requests against a live server, none of which exist in a static export; also removed the template's `OfflineBanner` (`next/offline`'s `useOffline()` consumer) |
| `partialPrefetching` | **removed** | Per the plan (unconditional) — and confirmed it *couldn't* work anyway: it requires `cacheComponents`, which fails outright (see below) |
| `cacheComponents` | **removed — build fails without it** | `next build` throws `Invariant: PPR cannot be enabled in export mode`. Cache Components implements Partial Prerendering, which needs a server to stream in the dynamic parts; a static export has none. This is a real build failure I hit, not a documentation inference |
| `reactCompiler` + `experimental.turbopackRustReactCompiler` | **kept** | `next build` succeeds; served `out/` verified working (shell, theme toggle wiring, routes). Using the Rust port avoids needing the `babel-plugin-react-compiler` dev dependency |

Resolved the TODO in `specs/04-web/static-export.md:27` and added a changelog line there (in scope:
only that line + its changelog).

### Dependencies removed (with versions, from the template's `package.json`)
`@iconify/react@6.0.2`, `@tiptap/*@^3.22.3` (7 packages) + `tiptap.css`/`tiptap-edit.tsx`,
`chance@^1.1.13` + `@types/chance`, `framer-motion@^12.38.0`, `motion@^12.38.0`,
`input-otp@^1.4.2` (+ the `components/ui/input-otp.tsx` primitive), `lodash@^4.18.1` +
`@types/lodash`, `nextjs-toploader@^3.9.17`, `react-dropzone@^15.0.0`,
`react-syntax-highlighter@^16.1.1` + `@types/react-syntax-highlighter`, `simplebar-react@3.3.2`,
`swr@^2.4.1`, `uuid@^13.0.0`. Verified with `grep` across `app/`/`components/`/`lib/`/`hooks/`
before removing each, and confirmed no leftover imports after.

### Dependencies added (with actual installed versions)
Runtime: `@tanstack/react-query@5.104.0`, `openapi-fetch@0.17.0`, `@date-fns/tz@1.5.0` (`date-fns`
was already present, kept at `4.4.0`). Dev: `openapi-typescript@7.13.0`, `vitest@5.0.2`,
`@testing-library/react@16.3.3`, `@testing-library/jest-dom@6.9.1`, `jsdom@25.0.1`,
`@vitejs/plugin-react@4.7.0`, `@tanstack/react-query-devtools@5.104.0` (not in the plan's explicit
list, added because ADR-0009 says "Devtools in development only" — flagging this addition).
Also had to add, beyond the plan's list, purely to make the above actually work:
`@testing-library/dom@10.4.2` (peer dep `@testing-library/react` needs but doesn't auto-install)
and `vite@7.3.6` (peer dep `vitest`/`@vitejs/plugin-react` need but doesn't auto-install).
**Not installed**: MSW (tech-stack.md lists it, but nothing in this task's scope calls the API yet
to mock — flagged in tech-stack.md's Notes column to add with the first feature that needs it).
**Owner decision 2026-09-27**: `nuqs`, `react-hook-form`, `zod`, `@hookform/resolvers` were initially
installed per ADR-0009's pre-provisioning approach but removed later when unused (they had no references
in `app/`, `components/`, `lib/`, or `hooks/`). Scheduled to be added back by the first task that uses them.

### Version bumps beyond the plan's explicit list (flagged)
- `next` `16.3.0` → `16.3.6`: `npm audit` reported a critical RCE advisory on `16.0.0–16.3.2`;
  `16.3.6` is also tech-stack.md's stated target. Zero vulnerabilities after.
- `react`/`react-dom` `19.2.5` (exact-pinned by the template) → `19.3.0`, to match tech-stack.md's
  `19.3.x` target. Next 16.3.6's peer range (`^19.0.0`) accepts it.

### Toolchain pins forced by current ecosystem gaps (important — flagging for the owner)
Two dependencies had to be pinned **below** what the specs currently say, not by choice but because
`npm run lint` cannot run otherwise. Both are documented in `web/AGENTS.md` and in
`tech-stack.md`'s new changelog line (Frontend table only — the actual spec-conflicting row,
Language/TypeScript, lives in the **Shared** table, which is out of this task's scope-fence to
edit, so I'm flagging it here instead of silently touching it):
1. **`typescript`**: tech-stack.md's Shared table says `7.0.x` (the native compiler). Pinned to
   `6.0.3` instead. `typescript-eslint` (which `eslint-config-next` depends on) throws
   `typescript-eslint does not support TS 7.0` at lint time — checked its latest published peer
   range on npm (`typescript: '>=4.8.4 <6.1.0'`, even on `8.70.x`, its newest version): there is
   currently no version of `typescript-eslint` that supports TS 7.x at all. AGENTS.md §3 already
   anticipates exactly this for `api/` ("If the Nest CLI or its Swagger plugin doesn't work with
   7.x at T-0001, `api/` pins 6.0.x and records why"); applied the same reasoning to `web/` since
   the constraint (lint must pass) is identical and unavoidable.
2. **`eslint`**: the template's own `package.json` asked for `^10`. Pinned to `9.39.x` instead.
   `eslint-plugin-react@7.37.5` (latest published, via `eslint-config-next@16.3.6`) throws
   `context.getFilename is not a function` under ESLint 10 — it doesn't support ESLint 10 yet, and
   no newer version exists to fix it. `eslint-config-next`'s own peer range (`>=9.0.0`) accepts
   9.39.x. Note: `npm install` prints `eslint@9.39.5: This version is no longer supported` (ESLint
   9 is EOL upstream) — this is a deliberate, temporary pin to unblock linting, not a long-term
   choice; revisit both pins once `typescript-eslint`/`eslint-plugin-react` publish support.

`.npmrc`'s `legacy-peer-deps=true` **is still required** (tested removing it: `npm install` fails
immediately with `ERESOLVE` because `openapi-typescript` wants `typescript ^5.x`, which our pinned
`6.0.3` doesn't satisfy — a second, independent reason beyond whatever the template originally
needed it for).

### Other fixes found along the way
- This template's shadcn style (`base-nova` on **Base UI**, not Radix) uses `render={<Link .../>}`
  for polymorphism, not `asChild`. I initially wrote a few `asChild` usages out of habit (classic
  shadcn/Radix pattern); `tsc` caught all of them (`Property 'asChild' does not exist`) before any
  build/runtime issue. Fixed in `home/page.tsx`, `not-found.tsx`, `profile.tsx`. Documented the
  pattern difference in `web/AGENTS.md` so it doesn't recur.
- `hooks/use-mobile.ts` and `layout/shared/header/light-dark.tsx` (both template files, kept
  per template-adaptation.md) failed the new `react-hooks/set-state-in-effect` lint rule (from the
  `eslint-plugin-react-hooks` version pulled in by `eslint-config-next@16.3.6`). Fixed
  `use-mobile.ts` with a lazy initial state (the effect now only subscribes, doesn't also set
  initial state). `light-dark.tsx`'s `isMounted` hydration-guard flag has no external system to
  synchronize with — that's the sanctioned exception to the rule — so it gets a single, commented
  `eslint-disable-next-line` instead of being contorted to avoid it.
- Replaced two `(x as any)` casts in `light-dark.tsx` (`document.startViewTransition` feature
  detection) with a proper `DocumentWithViewTransition` type, to satisfy
  `@typescript-eslint/no-explicit-any`.

### Commands run (clean `npm ci`-equivalent: deleted `node_modules`/`package-lock.json`, then `npm install`)
- `npm install` — **pass**, 0 vulnerabilities, 795 packages.
- `npm run lint` — **pass**, no output (0 problems).
- `npm run typecheck` (`tsc --noEmit`) — **pass**, no output.
- `npm test` (`vitest run`) — **pass**, 3 test files, 14 tests:
  - `lib/time/index.test.ts`: `today()` around midnight (plain + the night before spring-forward +
    across the spring-forward instant + fall-back day), a UTC-vs-Zagreb disagreement case,
    `monthRange()` for March/October 2026 (DST months) and Feb 2026/2028 (non-leap/leap),
    `formatDuration()`, `parseDuration()` throws.
  - `app/components/shared/view-id-guard.test.tsx`: redirects on missing `id`, on empty `id=`,
    renders children and does not redirect when `id` is present (mocks `next/navigation`).
  - `sidebaritems.test.ts`: nav list matches `["Dashboard","Time","Projects","Tasks","Trash",
    "Settings"]` in order, every item has a `url` and an `icon`.
- `npm run build` — **pass**. Route list exactly matches routing.md's route map (no stray routes;
  caught and fixed one — see "footer" above): `/`, `/_not-found`, `/auth/callback`, `/auth/sign-in`,
  `/home`, `/projects`, `/projects/view`, `/settings`, `/tasks`, `/tasks/view`, `/time`, `/trash`.
- `find out -name "route*"` → no output. `grep -r "app/api" out` → only a false positive
  (Next's own doc URL `nextjs.org/docs/app/api-reference/...` inside a vendor chunk) — no real
  Route Handler leftovers.
- Confirmed present: `out/404.html`, `out/projects/view/index.html`, `out/home/index.html`.
- Served `out/` with `npx serve@latest out` (via the harness's `run_in_background`, stopped
  afterwards): all of `/`, `/projects/`, `/projects/view/?id=x`, `/tasks/`, `/tasks/view/?id=x`,
  `/time/`, `/trash/`, `/settings/`, `/auth/sign-in/`, `/auth/callback/`, `/home/` → `200`.
  `grep -io noindex` on `/` and `/home/` → present on both.
- `grep -E "swr|@iconify|tiptap" package.json` → no output (clean). No `pnpm-lock.yaml` anywhere.
- `git status` at the repo root → nothing staged; `web/` and `api/` (a concurrent task) show as
  untracked directories; `tasks/BOARD.md` and three task files show as modified (this task's own
  bookkeeping edits, plus pre-existing modifications from other in-progress tasks I did not touch).
  `git check-ignore -v web/node_modules web/.next web/out` → all three correctly ignored via
  `web/.gitignore` (already covered `/node_modules`, `/.next/`, `/out/`).

### Deviations from the plan (all flagged above where they occur; summarized here)
1. `typescript` pinned to `6.0.3` and `eslint` pinned to `9.39.x` (both below what the shipped
   template/spec asked for) — forced by current, verifiable ecosystem incompatibilities, not
   preference. See "Toolchain pins" above.
2. MSW (listed in tech-stack.md) not installed — nothing to mock yet.
3. Playwright not installed — explicitly deferred by the plan itself (decision 5).
4. `next`/`react`/`react-dom` bumped beyond the template's exact pins to match tech-stack.md's own
   stated targets (see "Version bumps" above) — a "record the actual version" bookkeeping action,
   not a behavior change.
5. `app/components/tables/**` (the template's TanStack Table wrappers) deleted rather than kept,
   because template-adaptation.md's Keep list says "keep tables/shared only if the shell uses
   them," and the shell doesn't (they were only reachable from now-deleted demo pages, and used
   `@iconify/react`, which is being removed). Nothing in this task's scope needs them; a future
   task adding a real data table re-adds via the shadcn/TanStack Table pattern from scratch.

### Follow-ups (for future tasks, not done here — out of scope)
- `lib/api/schema.d.ts` is a stub (`export interface paths {}`). Regenerate with
  `npm run api:types` once `api/openapi.json` exists (T-0001, running concurrently).
- Real auth: the `(dashboard-layout)/layout.tsx` has a `// TODO(M1): auth guard` comment marking
  where session-restore + redirect-to-sign-in goes; `auth/sign-in`'s Google button and
  `auth/callback`'s token exchange are no-ops until M1.
- `lib/time`'s `parseDuration` throws `"not implemented (M4)"` until the time-log form needs it.
- Header's "Log time" button is a disabled placeholder (FR-TLOG-008) until M3/M4's time-log flow.

### Definition of Done walk-through
**All tasks:**
- [x] Every acceptance criterion met, evidence above.
- [x] Implementation matches the referenced specs; every deviation (toolchain pins, MSW/Playwright
      deferral, table-wrapper deletion) raised above, not silently made.
- [x] Lint, type-check, tests and build pass locally (commands + results above).
- [x] Tests added per testing.md (time-zone must-have case, redirect component test, nav-list test).
- [x] No secrets, debug leftovers, commented-out code or unrelated changes.
- [x] New env vars documented: `.env.example` has `NEXT_PUBLIC_API_BASE_URL`,
      `NEXT_PUBLIC_APP_URL`. (`specs/02-architecture/environments.md` already documents these two
      per its own scope — not edited here, out of this task's file scope.)
- [x] `web/AGENTS.md` written/updated to describe the adapted app.
- [x] Task status updated here and in `tasks/BOARD.md`.
- [x] Nothing staged, committed or pushed — confirmed via `git status`.

**Web tasks (additional):**
- [x] `npm run build` produces a working `out/`; verified served statically from the root.
- [x] Dates/ranges use `lib/time` — n/a beyond the helpers themselves yet (no date-range UI in this
      task's scope), but the helpers are time-zone-correct and tested.
- [ ] Loading, empty and error states — **N/A at this stage**: every route is an inert placeholder
      with no data fetching yet (the DoD item is about data views, which start in M2+).
- [ ] Works at 360px and desktop width — **not verified**. The Chrome browser tool was
      unavailable in this session (extension not connected), so I could not visually check real
      viewports. The shell's responsive mechanics (sidebar collapse, header) are unchanged from
      the template, and placeholder pages are simple centered text, so risk is low, but this is
      an honest gap, not a pass — the reviewer or owner should do a quick visual check.
- [x] Light/dark theme: `next-themes` wiring unchanged from the template, `ThemeProvider` present
      in `app/layout.tsx`, verified the toggle component (`light-dark.tsx`) builds and lints clean.
- [x] Generated API types are current — `lib/api/schema.d.ts` is the documented stub; `npm run
      api:types` has nothing to diff against yet (`api/openapi.json` doesn't exist).

## Review

**Verdict: approve** (should-fix items are documentation/AC-wording tensions, not functional
defects; none block merge).

1. **[should-fix]** `nuqs`, `react-hook-form`, `zod` and `@hookform/resolvers` are installed
   (`package.json` dependencies) but have zero references anywhere under `app/`, `components/`,
   `lib/`, `hooks/` (verified by `grep -rl` across all four packages — no matches). This is in
   direct tension with this task's own AC "Unused dependencies removed": they were *added* unused,
   not merely left over. The approved plan (`plan-T-0002.md` step 2) did explicitly call for
   installing them ahead of need per ADR-0009, and `tech-stack.md` documents this ("Installed at
   T-0002; not yet used"), so this looks like a deliberate pre-provisioning choice rather than an
   oversight — but the task's AC as literally worded is still violated. Recommend the owner
   explicitly confirm this reading of the AC (pre-provision future-task deps vs. strictly "no
   unused deps"), and note it in the AC or the Implementation notes rather than leaving the tension
   implicit. Not a build/runtime issue: none of the four are imported, so none affect the shipped
   `out/` bundle.
2. `@tanstack/react-query-devtools` (not in `tech-stack.md` before this task, added with a
   changelog note): confirmed it does **not** ship in the production bundle. `lib/query-client.tsx:29-31`
   gates it behind `process.env.NODE_ENV === "development"`, and grepping the real `out/_next/static/chunks/*`
   output for `devtools`/`ReactQueryDevtools` found only an unrelated false positive (Next's own
   internal `createDevToolsInstrumentedPromise` helper, not the react-query package). Approved.
3. `.npmrc`'s `legacy-peer-deps=true`: reproduced independently. Copied `web/` to a scratchpad
   directory, removed `.npmrc` and `node_modules`, ran `npm install --dry-run`: it fails immediately
   with `ERESOLVE`, `openapi-typescript@7.13.0` requiring `typescript@^5.x` against the pinned
   `6.0.3` — exactly the second reason documented in `web/AGENTS.md:123-125`. Confirmed necessary.
4. Static-export compliance: no `app/**/route.ts`, no `middleware.ts`/`proxy.ts`, no dynamic `[id]`
   segments, no `cookies()`/`headers()` usage anywhere in `app/` (all `grep`/`find` checks came back
   empty). `next.config.ts` is byte-for-byte the baseline in `static-export.md` (`output: "export"`,
   `trailingSlash`, `images.unoptimized`, `reactCompiler` + `turbopackRustReactCompiler`, nothing
   else). Both `view` pages (`projects/view/page.tsx`, and `tasks/view/page.tsx` by the same
   pattern) wrap `ViewIdGuard` (which calls `useSearchParams`) in `<Suspense>` and
   `router.replace(listPath)` on a missing/empty `id`.
5. `noindex`: `app/layout.tsx:21-24` sets `robots: {index: false, follow: false}` at the root;
   spot-checked page-level `metadata` exports (`home`, dashboard, others) — none override
   `robots`, so it's inherited everywhere. No `sitemap.ts`/`sitemap.xml` anywhere. No remaining
   `@iconify` imports, no template branding strings (`next-shadcn-dashboard`, `kiranism`,
   `shadcnuikit`) in `app/`/`components/`/`lib/`. `public/` contains only `google-icon.svg` (favicon
   moved to `app/favicon.ico`) — demo images gone.
6. `components/ui/`: diffed every one of the 49 present files byte-for-byte against
   `next-shadcn-dashboard-main.zip` (`unzip -p`, read-only) — all identical, no hand modifications.
   `input-otp.tsx` is the only zip file missing from `web/`, and its only consumer (the 2FA demo
   page) was removed along with the `input-otp` dependency — a clean deletion, not an orphaned
   primitive.
7. TypeScript `6.0.3` / ESLint `9.39.x` pins: both stated reasons check out. The ESLint reason
   (`eslint-plugin-react` not supporting ESLint 10) wasn't independently re-tested here, but is
   consistent with the `.npmrc` reproduction above and with T-0001's independently-confirmed finding
   that TS 7.0.2 is a native/Go compiler preview lacking the classic Compiler API entirely — which
   makes web's stated reason (`typescript-eslint`'s published peer range excludes 7.x) plausible and,
   if anything, an understatement of the incompatibility. Note: the *paired* changelog line in
   `tech-stack.md` for `api/`'s TS pin ("no stable 7.0.x exists") is factually wrong — see T-0001's
   review, finding 1 — that inaccuracy is specific to the API-side sentence, not web's.
8. DoD: the two items the implementer left explicitly unchecked (loading/empty/error states — N/A,
   no data-fetching in scope; 360 px/desktop visual check — not verified, Chrome tool unavailable)
   are honestly disclosed rather than silently ticked, which is exactly what the DoD asks for. Not a
   blocker for this review, but the 360 px/desktop check is still outstanding and should be done by
   the owner (or in T-0003) before relying on it.
9. `tech-stack.md` and `static-export.md` edits are bookkeeping only (installed versions + two
   changelog lines, plus the explicitly-in-scope `next.config.ts` TODO resolution) — no unauthorized
   behavior changes. `tasks/BOARD.md` row is correct (`review`). Implementation notes are thorough,
   include an explicit DoD walk-through, and every deviation is flagged rather than silently made.

**Owner sign-off (2026-09-27):** runs correctly locally; accepted.
