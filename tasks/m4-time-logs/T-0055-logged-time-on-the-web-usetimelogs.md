---
id: T-0055
title: Logged time on the web: useTimeLogs and the invalidations (D3), the prototype api.ts twins without proposed types, the Logged column and Logged time section from the prototype
milestone: M4
app: web
status: done
size: M
tier: haiku
depends_on: [T-0054]
feature_spec: specs/06-features/proto-sync-web.md
spec_row: T2
ac_files:
  - { path: web/features/time/logged-time.ac.test.tsx, sha256: ca5f2e868d6427286c1236cec41f7021f0ad24a65318b4e71e082389173f0f83 }
  - { path: web/features/time/components/logged-time-section.ac.test.tsx, sha256: 68af6b70a1e7b8f43bc4ce18e018b2f44acef1ab1cdc2a3c2a13411d00cb714c }
  - { path: web/features/projects/components/projects-list.ac.test.tsx, sha256: 0c57bc636d1b29c9f1dcef2739d3366e2980ec3fb30bc24b96d5e6739b1a294b }
  - { path: web/features/tasks/components/tasks-list.ac.test.tsx, sha256: 03eb7aec909ffbd9a410e749614e3f766596750b9f5d78b37ca056c187f8c55c }
  - { path: web/features/projects/components/project-detail.ac.test.tsx, sha256: 6486e007573b9997c69653bb8404a6340b45b44098289882f60380d4cbf17080 }
  - { path: web/features/tasks/components/task-detail.ac.test.tsx, sha256: dbc13e9e2dd5a1ddde5ec7a32aeee679b1d7035411772710c70714800c49f899 }
---

# T-0055: Logged time on the web: useTimeLogs and the invalidations (D3), the prototype api.ts twins without proposed types, the Logged column and Logged time section from the prototype

**Tier reason:** Hooks, keys and the copy commands spelled out. The components are prototype copies

Work from the brief: `node scripts/pm4.mjs brief T-0055`. Verify with `node scripts/pm4.mjs check T-0055`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `web/features/time/api.ts`: real `useTimeLogs` (API-TLOG-001, `keepPreviousData`); create, update and delete logs invalidate `timeKeys.all`, `projectKeys.all` and `taskKeys.all` through `refreshAfterLogChange`.
- `web/features/bookings/api.ts`: `useSetBooking` also invalidates `timeKeys.logs()`.
- `web/features/tasks/api.ts`: `useUpdateTask` also invalidates `TIME_LOGS_KEY` (declared locally, no import of `features/time`).
- `web/proto/features/{time,bookings,tasks,projects}/api.ts`: each is the production file with only the client import (`@/proto/mock/client`) and the `@/features/*` imports changed to `@/proto/features/*`. The three `proposed-types.ts` were removed with `rm`.
- Replaced `features/{projects,tasks}/components/{projects-list,project-detail,tasks-list,task-detail}.tsx` with their prototype twins (`@/proto/` → `@/`), then Prettier. `logged-time-section.tsx` and `logged-total.tsx` were left unchanged (AC-18 passes for them).
- Acceptance tests of this task pass: 6 files, 22 tests. Typecheck is clean.
- Attempt 1 was blocked because AC-18 covered both T2 and T3, so this task's check also ran the T3 comparison (Dashboard and Bookings, T-0056's work). Resolved in the spec (owner, `51f9ea3`): AC-18 is T2's comparison, AC-22 is T3's. The code was not changed again.
- One full gate run timed out once in `dashboard-view.ac.test.tsx` AC-8 (5 s, not a file of this task); the file passes alone and in the later full run.

`pm4 check T-0055` (summary): PASS. ac hashes ok (6); scope ok; web lint, format:check, typecheck, test, build, api:types ok; AC-18 ok; AC-19 ok; AC-17, AC-20, AC-22 pending (T-0056); AC-21 manual.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | BLOCKED: spec | T2 code, twins and components done; T2 ACs pass. `pm4 check` fails only on the T3 half of AC-18 (Dashboard, out of scope). Lint errors from proto imports fixed. |
| 2 | — | PASS | No re-delegation: after the spec split AC-18 (AC-22 for T3), the main session's `pm4 check` passes. |

## Review
**Verdict: approve** (Opus reviewer, 2026-10-11). `pm4 check --feature specs/06-features/proto-sync-web.md`: PASS (8 AC hashes, scope, all api and web gates, AC-18, AC-19, AC-20, AC-22; AC-21 manual).

- Minor, information only: `web/proto/features/time/api.ts` moved `WorkdayList` above `TimeLogList` to match production's order (AC-19). No behavior change.
- Tier feedback: haiku was right; the one block came from the spec (AC-18 covered T2 and T3), resolved in `51f9ea3`.
