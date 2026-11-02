---
id: T-0133
title: Reminder to log time: reminder.ts, the bell, use-attention.ts, the header
milestone: M4
app: web
status: done
size: S
tier: haiku
depends_on: [T-0132]
feature_spec: specs/06-features/tlog-reminder.md
spec_row: T2
ac_files:
  - { path: web/features/time/reminder.ac.test.ts, sha256: b4e6ee4f788286a77f0bc80556f12596e564bda62bae82b1a70903a1d6ac5efe }
  - { path: web/features/time/components/notifications-button.ac.test.tsx, sha256: 109291e70297dda2db8d6d8a038876c7fba276399fd32bbe1b16c1b3adb150db }
---

# T-0133: Reminder to log time: reminder.ts, the bell, use-attention.ts, the header

**Tier reason:** Twin copy and one promote; the header change is two lines

Work from the brief: `node scripts/pm4.mjs brief T-0133`. Verify with `node scripts/pm4.mjs check T-0133`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `web/features/time/reminder.ts` and `web/features/time/components/notifications-button.tsx`: copied from their prototype twins (sed `@/proto/` → `@/`, then Prettier). `use-attention.ts` promoted unchanged.
- `web/app/(dashboard-layout)/layout/vertical/header/index.tsx`: imports `NotificationsButton` and renders it after the `NewItemButton` Suspense, before `LightDark`.
- AC-9 (browser: dialog widths, tooltip, favicon/title, app badge) is manual, for the owner.
- Review rework (attempt 2): `notifications-button.tsx` re-copied from `web/proto/features/time/components/notifications-button.tsx` with the sed (`@/proto/` → `@/`), then Prettier (unchanged). The bell now reads no day until `useMe` has loaded (D5); `reminder.ts` and `use-attention.ts` unchanged.
- Scope gate fails with the test step's and T-0132's uncommitted files, which pm4's scope rule does not allow for T-0133: `specs/04-web/screens.md`, `specs/06-features/README.md`, `specs/06-features/tlog-reminder.md`, `specs/open-questions.md`, and the prototype files `web/proto/features/auth/use-sign-out.ts`, `web/proto/features/projects/api.ts`, `web/proto/features/tasks/api.ts`, `web/proto/features/time/components/day-prompt-dialog.tsx`, `web/proto/features/time/components/notifications-button.tsx`, `web/proto/features/time/last-log-link.ts`. Not changed by this task; for the reviewer or main session to decide.

`node scripts/pm4.mjs check T-0133`:
```
ac hashes: ok (2)
scope: FAIL (10 file(s))
web lint: ok (17s)
web format:check: ok (5s)
web typecheck: ok (3s)
web test: ok (33s)
web build: ok (7s)
check AC-8: twins equal; the header has the bell: ok
twins: ok (126 equal)
manual (owner verifies): AC-9
FAIL T-0133 (scope only; the 10 files above)
```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | Twins copied, header bell added; AC-1, AC-2, AC-3 tests pass; check PASS |
| 2 | haiku | FAIL | Review rework: bell waits for `useMe` (proto copy + Prettier); lint, typecheck, tests, build, AC-8 ok; check FAIL on scope only (10 spec/proto files from the test step and T-0132, not in T-0133's Files) |

## Review
_Filled in by `review-feature`._

**Verdict (Opus, 2026-11-02): approve.** `pm4 check --feature` PASS; AC-8 ok; AC-9 is manual (owner).
- Minor: the bell calls `useDay(todayIn(me.data?.timeZone ?? "UTC"))` before `useMe` resolves, so it can fetch the UTC date once (wasted request; the reminder itself waits for `me.data`). Optional fix: render the inner component only once `me.data` exists, in the production file and its prototype twin.
- Tier feedback: haiku was right (two twin copies, one promote, two header lines).

**Second review (Opus, 2026-11-02): approve.** The bell renders no day until `useMe` loads (AC-12 passes); AC-2/AC-3 are unchanged. Tier: haiku was right.
