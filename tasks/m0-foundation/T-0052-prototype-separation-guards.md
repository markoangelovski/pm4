---
id: T-0052
title: Prototype separation guards (dev-only routes, import rules, build check)
milestone: M0
app: web
status: done
size: S
tier: opus
depends_on: []
feature_spec: —
files: [web/next.config.ts, web/eslint.config.mjs, web/package.json]
specs: [specs/04-web/prototype.md#separation-no-trace-in-production, specs/04-web/static-export.md#prototype-routes-stay-out-of-the-build-adr-0012]
ac_files: []
---

# T-0052: Prototype separation guards (dev-only routes, import rules, build check)

**Tier reason:** opus: a Next config change (needs a static-export build check) that every later prototype relies on.

## Goal
No prototype route, import or code can reach the production build (ADR-0012).

## Change
- `web/next.config.ts`: export a function of the phase. In `PHASE_DEVELOPMENT_SERVER` add
  `pageExtensions: ["tsx", "ts", "dev.tsx"]`, otherwise `["tsx", "ts"]`. Everything else unchanged.
- `web/eslint.config.mjs`: `no-restricted-imports`
  - outside `proto/**` and `app/proto/**`: no `@/proto` / `@/proto/**` (or any `proto/` path);
  - inside them: no `@/features/**`, `@/lib/api/client`, `@/lib/auth/**`, `@/app/(dashboard-layout)/**`.
- `web/package.json`: `postbuild` fails when `out/proto` or `out/proto.html` exists, or any file in `out/`
  contains `pm4-proto-only`.

## Acceptance criteria
- [ ] `npm run dev`: a `app/proto/x/page.dev.tsx` renders at `/proto/x`; `npm run build`: no `/proto` route, `postbuild` passes.
- [ ] A production file importing `@/proto/…` fails `npm run lint`; a prototype file importing `@/features/…` fails it too.
- [ ] `postbuild` fails when `out/` contains the marker or a `proto` entry.

## Checks
```bash
test ! -e web/out/proto && test ! -e web/out/proto.html
```

---

## Implementation notes
Done in the main session (config-only, a few lines).
- `next.config.ts` is now a function of the phase; `pageExtensions` adds `dev.tsx` only for `next dev`.
- `eslint.config.mjs`: two `no-restricted-imports` blocks (production → `@/proto`; prototype → real data/auth/shell).
- `package.json`: `postbuild` (runs after every `npm run build`, so CI and `pm4 check` get it too).

Verified with temporary probe files (removed): `app/proto/x/page.dev.tsx` served at `/proto/x` (200) by `next dev`;
`next build` emitted no proto route and `postbuild` passed; `postbuild` exits 1 with the marker in `out/` or an
`out/proto` folder; ESLint flagged a `lib/` file importing `@/proto/…` and a `proto/` file importing `@/features/…`.

`pm4 check T-0052`: scope ok, lint ok, format:check ok, typecheck ok, test ok, build ok, checks ok → PASS.

Heads-up: the current untracked prototype in the main checkout (`web/proto/`, `web/app/proto/`) breaks these rules
(plain `page.tsx` routes, `@/features` imports, the `@/proto/mock-backend` import in the real layout) until it's migrated.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | opus (main session) | done | Guards added and probed; pm4 check PASS |

## Review
Owner reviewed the diff (quick lane), 2026-10-11: approved.
