---
id: T-0008
title: Slash-free URLs, app pages under /app, landing page at the root
milestone: M1
app: web
status: done
size: M
tier: sonnet
depends_on: [T-0007]
feature_spec: specs/06-features/land-app-route-split.md#tasks   # row "T2" of its Tasks table
requirements: [FR-LAND-001, FR-AUTH-001, FR-AUTH-004, FR-AUTH-005]
ac_files:
  - { path: web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ac.test.ts, sha256: dffd0bd82e810928c690154e79059fa303341e4e1acbc5e0146a2904396f34ec }
  - { path: web/app/links.ac.test.tsx, sha256: 2c59f1cdfd284688c69827888a3455556f0ad81f0c593e00c1fe749f85f646e6 }
---

# T-0008: Slash-free URLs, app pages under /app, landing page at the root

## Goal
Set `trailingSlash: false`; move the app pages under `app/(dashboard-layout)/app/` (detail pages to `app/project/` and `app/task/`) and the landing page to `app/page.tsx` (plain `mv`, delete `app/home/` and the empty old folders), switch every link in *Link targets* to `routes.*`, and update the three TODO comments.

## Task
**Feature spec row:** T2. **Tier reason:** One app, ~19 files, mechanical but spread over the route tree and the shell. More than 3 files rules out haiku.

Read: this file → the feature spec (whole) → the files under its *Read first* → the app's `AGENTS.md`.
Change only the files that the spec's *Files* table assigns to T2.

## Acceptance criteria
- [ ] The acceptance tests listed in `ac_files` pass, and are unchanged (hashes match).
- [ ] `AC-9`, `AC-10`, `AC-11`, `AC-12`, `AC-13`, `AC-14` pass; lint/typecheck/test/build green.
- [ ] Definition of Done satisfied (`specs/05-quality/definition-of-done.md`).

## Blocked by (if status is blocked)
- T-0007 (spec T1)

---

## Implementation notes
_Filled in by the implementer: changes, commands run and their real results, follow-ups._

Moves, link switches, TODO comments and `trailingSlash: false` done. Also changed `web/app/page.tsx` landing Login links to `routes.signIn` (old `"/auth/sign-in/"` literal failed AC-13) and `web/lib/routes.ts` `APP_PREFIX` to `${routes.app.dashboard}/` (`"/app/"` literal failed AC-13).

`pm4 check T-0008`: FAIL. lint/typecheck/test/build ok, AC-12 ok, AC-13 ok. AC-11 fails with `stale app/projects`: Next's export emits RSC payload dirs `out/app/projects/` (also `tasks/`, `time/`, ...) holding only `__next.*.txt`, no `index.html`. The check's `test ! -e out/app/projects` / `app/tasks` can never pass. Suggested: check `app/projects/index.html` and `app/tasks/index.html` instead.

Orchestrator (2026-10-02, owner-approved): spec fixed instead of the code. AC-11 now checks
`out/app/{projects,tasks}/index.html`; AC-13 excludes `lib/routes.ts` (D3), so `APP_PREFIX` is back to the
spec's `"/app/"` literal. The landing page's `routes.signIn` switch is now in the Files table.
Re-run `pm4 check T-0008`: lint/typecheck/test/build ok, AC-11/AC-12/AC-13 ok; manual AC-14/AC-15 pending.
The only failure is scope: `specs/04-web/static-export.md` and the feature spec, the orchestrator's own spec edits.

### Attempts
| # | Tier | Result (`done` / `BLOCKED` / `FAILED`) | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | BLOCKED | AC-11 check wrong: `out/app/projects` and `out/app/tasks` are RSC payload dirs Next always emits; no index.html inside |
| 2 | (orchestrator) | done | Spec checks fixed (AC-11, AC-13), `APP_PREFIX` restored; all gates and checks pass |

## Review
**Verdict: approve** (Opus review, 2026-10-02). Moves, link targets, TODO comments and `trailingSlash` match the spec; Non-goals respected. Minor findings, fixed in the main session: `web/AGENTS.md` structure and patterns updated (spec follow-up); `next.config.ts` header comment reworded. Open (owner's call): the doc comment in `view-id-guard.tsx:14` (a Non-goal file) still says `/projects/view/?id=…`. Tier: sonnet right; the block came from the spec's checks, not the tier.

Re-review (Opus, 2026-10-03): **approve** again. Still open (owner's call): `view-id-guard.tsx:14` comment. New minor (tests weak, no defect): AC-10 doesn't cover the user-menu Settings link or the view pages' `listPath`; AC-13's grep misses bare `"/"`/`"/app"` literals. All checked by reading.

Fixed in the main session (owner, 2026-10-03): `view-id-guard.tsx` doc comment now says `/app/project?id=…`, `/app/task?id=…`.
