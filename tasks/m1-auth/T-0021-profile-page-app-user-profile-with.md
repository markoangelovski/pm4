---
id: T-0021
title: Profile page /app/user-profile with sign out of all devices
milestone: M1
app: web
status: done
size: S
tier: sonnet
depends_on: [T-0020]
feature_spec: specs/06-features/shell-user-menu.md
spec_row: T2
ac_files:
  - { path: web/lib/time/format-date.ac.test.ts, sha256: 1726060e69211e84e8df905f2b1ce59645dd1a99cdf84750f4c798d9e677fb33 }
  - { path: web/features/users/components/user-profile.ac.test.tsx, sha256: ca17d74dd39aa700bc40f225edf98c8802caa54c6490a491ecfbfb5ef37680ea }
---

# T-0021: Profile page /app/user-profile with sign out of all devices

**Tier reason:** One page from primitives plus a date helper; every string and state given; uses T1's hooks

Work from the brief: `node scripts/pm4.mjs brief T-0021`. Verify with `node scripts/pm4.mjs check T-0021`.

## Implementation notes
Added formatDate, UserProfile and the /app/user-profile page. pm4 check T-0021: PASS (lint, format, typecheck, test, build, AC-12 ok; AC-13 manual).

Review fixes: error card only when `isError && !me`; sign-out mutation `reset` called when the dialog closes (not while pending), so the alert does not reappear after Cancel. Calls `reset()`; the test writer added `reset: vi.fn()` to the AC test's `useSignOutEverywhere` mock and re-hashed (`pm4 hash`). pm4 check T-0021: PASS.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | PASS | Implemented per brief |
| 2 | sonnet | pass | Review fixes: stale data on refetch error, reset sign-out error on close |

## Review
**Verdict: approve** (Opus review, 2026-10-03). `pm4 check --feature` PASS; AC-12 ok, AC-13 manual.

Findings (minor, non-blocking):
- `user-profile.tsx:43` shows only the error card when `isError`, even if `data` is still present after a failed refetch. Suggested fix: `isError && !me`.
- `user-profile.tsx:43-52`: the load-error state also hides the Sessions card, though sign-out-everywhere doesn't need `/me`. Within spec; owner's call.
- `user-profile.tsx:120`: the sign-out error alert persists after Cancel and reopening the dialog. Suggested fix: call the mutation's `reset` when the AlertDialog closes.

Tier feedback: sonnet was right, possibly more than needed (every string and state was given); one attempt.
