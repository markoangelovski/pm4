---
id: feat-tlog-billable-reminder
title: "Billable reminder: Remaining and the reminder count billable time; Log time opens with the unlogged duration"
status: approved
owner: Marko Angelovski
last_updated: 2026-11-03
milestone: M4
requirements: [FR-TLOG-016, FR-TLOG-018, FR-TLOG-021, SCR-008, SCR-043]
related: [req-time-logs, web-screens, feat-tlog-reminder, OQ-262]
prototype: 7977c06
---

# Billable reminder: Remaining and the reminder count billable time; Log time opens with the unlogged duration

## Goal
The pie's **Remaining** and the reminder to log time measure the daily target against **billable** time (logs excluded from
statistics don't count), and the pie's middle adds "<billable> of <target>" (FR-TLOG-016, FR-TLOG-018, SCR-043). While the
reminder shows, **Log time** opens by itself with the unlogged time as its duration (FR-TLOG-021, SCR-008). Web only: no API change.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | The six production files are twins of the prototype's: copy, `@/proto/mock/client` → `@/lib/api/client`, `@/proto/` → `@/`, then Prettier, so `pm4 twins` reports them equal. Each differs from its twin only by `7977c06` and the test step's prototype fix (D4's key). | Agent: as feat-tlog-reminder D1 |
| D2 | Pie: **Remaining** = daily target − billable (when positive); every log keeps its slice, excluded ones too. The middle: big = all logged, small = "<billable> of <target>". | Owner, prototype `7977c06` (2026-11-03) |
| D3 | Reminder: today, a start, ≥ 1 log, and *unlogged* = min(now − start − billable, target − billable) ≥ 15 min. Excluded logs never count. `since` = start + billable is no longer shown; with the date it stays the dismissal key. Popover copy: "<unlogged> of billable time unlogged". The day header's *Unlogged* (FR-TLOG-009) is unchanged. | Owner, prototype `7977c06` (2026-11-03) |
| D4 | While the reminder shows, Log time for today is open by itself, Duration = `reminderMinutes` (unlogged rounded down to a multiple of 15, at least 15). Closing it records a *closed* dismissal (same key as D3's) and keeps the bell; **Log your time** reopens it. It opens by itself again when `floor(unlogged / 15)` grows or `since` changes (a saved log): the dialog is keyed by `since`, so a save mounts a fresh form with the new duration (the day refetches before the dialog closes). The bell's × hides both until then. Both states last until reload. | Owner, prototype `7977c06` (2026-11-03) |

## Scope
**In:** the twins of the six prototype files under *Files*.

**Test step (main session):** adds the `reminderMinutes` stub to `web/features/time/reminder.ts`, and updates the existing tests the new
behavior breaks: `reminder.ac.test.ts` AC-1 (excluded logs no longer count), `notifications-button.ac.test.tsx` AC-2 (copy, auto-open),
`day.ac.test.ts` AC-7 (`pieSlices` Remaining 270, its fixture has 60 min excluded) and `day-view.ac.test.tsx` AC-20 (Remaining `4h 30m`,
middle "2h 30m of 7h"). Then `pm4 hash`.

**Non-goals** (implementers must not touch these):
- `api/`, `web/lib/**`, `web/components/ui/*`, `web/proto/**`, `web/app/**`.
- The day header (`day-header.tsx`, `dayFigures`): *Unlogged* stays now − (start + logged).
- Every other `web/features/**` file not under *Files*.

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/04-web/screens.md` (SCR-008, SCR-043) | Behavior and copy |
| `web/proto/features/time/reminder.ts`, `web/proto/features/time/components/notifications-button.tsx` | The new logic, copied as twins |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| web | `web/features/time/reminder.ac.test.ts` | M | tests | AC-1 updated, AC-2 (`reminderMinutes`) |
| web | `web/features/time/components/notifications-button.ac.test.tsx` | M | tests | AC-3…AC-6 (replaces feat-tlog-reminder AC-2) |
| web | `web/features/time/day.ac.test.ts` | M | tests | AC-7 |
| web | `web/features/time/components/day-view.ac.test.tsx` | M | tests | AC-8 |
| web | `web/features/time/reminder.ts` | M | tests, T1 | `reminderMinutes` stub, then the twin (D3, D4) |
| web | `web/features/time/day.ts` | M | T1 | Twin (D2: `pieSlices`) |
| web | `web/features/time/schemas.ts` | M | T1 | Twin (D4: `logFormDefaults(…, link, minutes)`) |
| web | `web/features/time/components/log-form-dialog.tsx` | M | T1 | Twin (D4: `defaultMinutes` prop) |
| web | `web/features/time/components/notifications-button.tsx` | M | T1 | Twin (D3, D4) |
| web | `web/features/time/components/day-charts.tsx` | M | T1 | Twin (D2: the middle's billable line) |

## Interfaces

### Twins (T1)
From the repo root:
```bash
for f in day.ts reminder.ts schemas.ts components/log-form-dialog.tsx components/notifications-button.tsx components/day-charts.tsx; do
  sed -e 's#@/proto/mock/client#@/lib/api/client#' -e 's#@/proto/#@/#g' web/proto/features/time/$f > web/features/time/$f
done
cd web && npx prettier --write features/time/day.ts features/time/reminder.ts features/time/schemas.ts \
  features/time/components/log-form-dialog.tsx features/time/components/notifications-button.tsx features/time/components/day-charts.tsx
```
The diff they bring is `git show 7977c06 -- web/proto/features/time/`, plus `key={shown?.since}` on `LogFormDialog` in the prototype's `notifications-button.tsx` (test step, D4). New or changed signatures:
```ts
// web/features/time/reminder.ts
export interface LogReminder { unlogged: number; since: number }   // unlogged = min(now − start − billable, target − billable); since = start + billable
export function reminderMinutes(reminder: LogReminder): number;     // max(15, floor(unlogged / 15) × 15)
// web/features/time/schemas.ts
export function logFormDefaults(log: TimeLog | undefined, date: string, nowQuarter: number | null,
  link: LogLink = NO_LOG_LINK, minutes: number = DURATION_STEP): LogFormValues;   // `minutes` only for a new log
// web/features/time/components/log-form-dialog.tsx: LogFormDialog gains `defaultMinutes?: number` (15 min when absent)
```
The other callers of `LogFormDialog` and `logFormDefaults` don't change.

## Acceptance criteria
Tests mock `@/lib/api/client`, `next/navigation` and `useMe` (time zone `Europe/Zagreb`, `dailyTargetMinutes` 420), as the existing
`features/time` tests do; times are in Zagreb.

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `logReminder` (target 420), start 480: logs 60 + 60 → now 614 `null`, 615 `{ unlogged 15, since 600 }`; logs 60 + 60 excluded → now 554 `null`, 555 `{ unlogged 15, since 540 }`; logs 300 at now 1020 → `{ unlogged 120, since 780 }` (target cap), the same with 120 more excluded; logs 420 → `null`; no start, no logs, or now `null` → `null`. `dismissalOf` / `isDismissed` as feat-tlog-reminder AC-1 | `web/features/time/reminder.ac.test.ts` | T1 |
| AC-2 | `reminderMinutes`: unlogged 15 → 15; 29 → 15; 80 → 75; 120 → 120 | `web/features/time/reminder.ac.test.ts` | T1 |
| AC-3 | `NotificationsButton`, 2026-10-09 10:20, start 08:00, 2h logged: **Log time** opens by itself for 9 Oct 2026 with Duration `15m`; the bell is "Notifications (1 new)", its popover "Log your time" and "20m of billable time unlogged"; the title starts with "(1) " | `web/features/time/components/notifications-button.ac.test.tsx` | T1 |
| AC-4 | From AC-3: closing Log time (Cancel) → no dialog, the bell still "Notifications (1 new)"; clicking **Log your time** opens Log time again with `15m`; **Dismiss** → no dialog, "Notifications", "No notifications.", no title prefix | `web/features/time/components/notifications-button.ac.test.tsx` | T1 |
| AC-5 | Start 08:00, logs 60 + 60 excluded, at 10:20: "1h 20m of billable time unlogged", Log time opens with `1h 15m`; saving it as `30m` (`POST /api/v1/time-logs` with `durationMinutes` 30, the day now holding it) → Log time opens again with `45m` | `web/features/time/components/notifications-button.ac.test.tsx` | T1 |
| AC-6 | No start, no logs, or 7h billable logged → "Notifications", "No notifications.", no dialog, no title prefix (feat-tlog-reminder AC-3 plus no dialog) | `web/features/time/components/notifications-button.ac.test.tsx` | T1 |
| AC-7 | `pieSlices` of the four owner logs (60 min excluded), target 420 → the four log slices, then Remaining 270; 480 min billable → no Remaining; 360 billable + 120 excluded → Remaining 60 | `web/features/time/day.ac.test.ts` | T1 |
| AC-8 | Day view of the owner logs: the Remaining legend row `4h 30m`; the middle `3h 30m` and "2h 30m of 7h" | `web/features/time/components/day-view.ac.test.tsx` | T1 |
| AC-9 | The six twins equal their prototype files | check | T1 |
| AC-10 | In the browser: with a reminder, Log time opens by itself on any `/app/**` screen with the rounded duration; closing it keeps the bell; it reopens at the next 15 min | manual | T1 |

Typed stubs (created with the tests, so lint and typecheck pass while the tests fail):
- `web/features/time/reminder.ts`: `export function reminderMinutes(reminder: LogReminder): number` with the body
  `throw new Error("not implemented (feat-tlog-billable-reminder)")`.

## Checks
```bash
# AC-9: twins equal
node scripts/pm4.mjs twins
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Billable Remaining and reminder, auto-open Log time: six prototype twins | web | S | haiku | Twin copy, the command under *Twins (T1)* | — |

## Open questions
None.

## Changelog
- 2026-11-03: Initial draft from prototype `7977c06` (owner decisions 2026-11-03). Ready for review.
- 2026-11-03: Approved by the owner.
- 2026-11-03: Test step: AC-5 showed the prototype kept the saved form open after a save; the owner chose to fix the prototype (`key={shown?.since}` on `LogFormDialog`, D4).
