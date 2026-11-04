---
id: feat-tlog-reminder-all-logged
title: "Reminder counts all logs: unlogged since the start counts excluded logs, the target only billable"
status: approved
owner: Marko Angelovski
last_updated: 2026-11-04
milestone: M4
requirements: [FR-TLOG-018, FR-TLOG-021, SCR-008]
related: [req-time-logs, web-screens, feat-tlog-billable-reminder]
prototype: 5dcda69
---

# Reminder counts all logs: unlogged since the start counts excluded logs, the target only billable

## Goal
The reminder to log time (FR-TLOG-021, SCR-008) measures the gap since the start against **all** logs, excluded ones
too, and still caps it at the target's remaining **billable** time: *unlogged* = min(now − start − logged, target − billable).
Non-prod time no longer shows as unlogged, and the reminder still shows until the billable target is logged. Web only: no API change.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | *unlogged* = min(now − start − logged, target − billable), logged = all logs, billable = logs not excluded; it shows from 15 min. Replaces feat-tlog-billable-reminder D3's now − start − billable. Owner's examples (target 7h, start 08:00): 6h logged with 1h excluded at 14:30 → 30m; 7h 45m logged with 1h excluded at 16:30 → 15m. | Owner, prototype `5dcda69` (2026-11-04) |
| D2 | `since` (the dismissal key and the reminder dialog's `key`) = start + logged, so saving an excluded log also mounts a fresh form with the new duration and ends a dismissal. | Agent, prototype `5dcda69` |
| D3 | `web/features/time/reminder.ts` is a twin of the prototype's: copy, then Prettier, so `pm4 twins` reports it equal. | Agent: as feat-tlog-billable-reminder D1 |

## Scope
**In:** the twin of `web/proto/features/time/reminder.ts`.

**Test step (main session):** updates `reminder.ac.test.ts` AC-1 and `notifications-button.ac.test.tsx` AC-5 (feat-tlog-billable-reminder)
to the new formula, then `pm4 hash`. No stubs: no signature changes.

**Non-goals** (implementers must not touch these):
- `api/`, `web/lib/**`, `web/components/ui/*`, `web/proto/**`, `web/app/**`.
- `notifications-button.tsx`, the copy "<unlogged> of billable time unlogged", `reminderMinutes`, `dismissalOf`, `isDismissed`.
- The day header (`dayFigures`), the pie (`pieSlices`).

## Read first
| Path | Why / copy this |
| --- | --- |
| `web/proto/features/time/reminder.ts` | The new logic, copied as the twin |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| web | `web/features/time/reminder.ac.test.ts` | M | tests | AC-1 |
| web | `web/features/time/components/notifications-button.ac.test.tsx` | M | tests | AC-2 |
| web | `web/features/time/reminder.ts` | M | T1 | Twin (D1, D2) |

## Interfaces

### Twin (T1)
From the repo root:
```bash
cp web/proto/features/time/reminder.ts web/features/time/reminder.ts
cd web && npx prettier --write features/time/reminder.ts
```
The diff it brings is `git show 5dcda69 -- web/proto/features/time/reminder.ts`. Signatures don't change:
```ts
// web/features/time/reminder.ts
export interface LogReminder { unlogged: number; since: number }   // unlogged = min(now − start − logged, target − billable); since = start + logged
```

## Acceptance criteria
Tests mock as the existing `features/time` tests do (`dailyTargetMinutes` 420, Zagreb).

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `logReminder` (target 420), start 480: logs 60 + 60 → now 614 `null`, 615 `{ unlogged 15, since 600 }`; logs 60 + 60 excluded → the same (614 `null`, 615 `{ 15, 600 }`); logs 300 + 60 excluded at 870 → `{ 30, 840 }`; logs 405 + 60 excluded at 990 → `{ 15, 945 }` (target cap); logs 300 at 1020 → `{ 120, 780 }`; logs 300 + 120 excluded at 1020 → `{ 120, 900 }`; logs 420 + 60 excluded at 1020 → `null`; logs 420 → `null`; no start, no logs, or now `null` → `null`. `dismissalOf` / `isDismissed` unchanged | `web/features/time/reminder.ac.test.ts` | T1 |
| AC-2 | `NotificationsButton`, start 08:00, logs 60 + 60 excluded: at 10:20 "20m of billable time unlogged", Log time opens with `15m`; at 11:20 "1h 20m of billable time unlogged", Log time opens with `1h 15m`; saving it as `30m` → Log time opens again with `45m` (replaces feat-tlog-billable-reminder AC-5) | `web/features/time/components/notifications-button.ac.test.tsx` | T1 |
| AC-3 | The twin equals its prototype file | check | T1 |

## Checks
```bash
# AC-3: twin equal
node scripts/pm4.mjs twins
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Reminder counts all logs: the `reminder.ts` twin | web | S | haiku | One-file twin copy, the command under *Twin (T1)* | — |

## Open questions
None.

## Changelog
- 2026-11-04: Initial draft from prototype `5dcda69` (owner request 2026-11-04). Ready for review.
- 2026-11-04: Approved by the owner.
