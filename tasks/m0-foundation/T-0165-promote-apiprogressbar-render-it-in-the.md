---
id: T-0165
title: Promote ApiProgressBar, render it in the app layout
milestone: M0
app: web
status: done
size: S
tier: haiku
implementer: opencode/opencode/mimo-v2.6-flash-free
depends_on: []
feature_spec: specs/06-features/shell-api-progress.md
spec_row: T1
ac_files:
  - { path: web/features/system/components/api-progress-bar.ac.test.tsx, sha256: f7156495b5d1892f1fbdc0e7109f20e89c17d99b6a19220b2aba14ac25239117 }
---

# T-0165: Promote ApiProgressBar, render it in the app layout

**Tier reason:** Promotion plus one import and one element

Work from the brief: `node scripts/pm4.mjs brief T-0165`. Verify with `node scripts/pm4.mjs check T-0165`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

Promoted `web/features/system/components/api-progress-bar.tsx` as copied from the prototype twin
(no `@/proto/` imports, so nothing to rewrite), and in `web/app/(dashboard-layout)/layout.tsx` added
the `ApiProgressBar` import below `RateLimitNotifier` and rendered `<ApiProgressBar />` right after
`<RateLimitNotifier />`, inside `SidebarProvider`. Nothing else changed.

`node scripts/pm4.mjs check T-0165` summary:

```
  web typecheck: ok (30s)
  web test: FAIL (66s)
  web build: ok (30s)
  check AC-4: the app layout renders the bar: ok
  twins: ok (138 equal)
  manual (owner verifies): AC-5

FAIL T-0165
- web test failed
```

The `web test` failure is **not from this task**: 14 tests in 8 other features' AC files fail in this
scratch worktree (`features/auth/use-sign-out`, `features/auth/components/auth-guard`,
`features/time/logged-time`, `features/time/components/logged-time-section`,
`features/projects/components/project-detail`, `features/projects/components/project-form-dialog`,
`features/tasks/components/task-detail` — plus a skipped `features/system/form-drafts`).
No test outside this task renders `(dashboard-layout)/layout.tsx`, and none imports
`api-progress-bar`. This task's own AC file passes:
`npx vitest run features/system/components/api-progress-bar.ac.test.tsx` → 3 passed.
`npm run lint` (0 errors, 4 pre-existing warnings) and `npm run format:check` are clean.

### Attempts
| # | Agent | Result | Summary |
| --- | --- | --- | --- |
| 1 | opencode/opencode/mimo-v2.6-flash-free | done | Promoted ApiProgressBar unchanged, rendered it in the app layout; own ACs pass, pm4 check FAILs only on other features' ACs (scratch worktree) |

## Review
**Verdict: approve** (reviewer `claude-code/claude-opus-5-5`, 2026-11-21)

No findings. `api-progress-bar.tsx` is byte-identical to its prototype twin and imports nothing from `@/proto`. The layout import and `<ApiProgressBar />` sit where *Interfaces* says (inside `SidebarProvider`/`AuthGuard`). D1 to D3, AC-1 to AC-4 and the non-goals hold. `pm4 check --feature` failed scope only on the other features' files on this branch. Its build step failed only because another `next build` was running at the same time; the build passes on its own. AC-5 (Slow 4G bar, no flash, absent on landing/sign-in/legal) is left for the owner to check by hand.

| Agent | Attempts | ACs first try | Rules kept | Blocks right | Code | Grade | Fit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| opencode/opencode/mimo-v2.6-flash-free | 1 | yes (AC-1..AC-3, AC-4 check ok) | yes | n/a (no BLOCKED) | Exact twin copy plus the two specified layout lines; accurate notes | A | right: a free flash model was enough for a promotion plus two lines |
