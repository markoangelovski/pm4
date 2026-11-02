---
id: feat-tlog-reminder
title: "Log presets, the reminder to log time, Prompt Edit and wider dialogs"
status: approved
owner: Marko Angelovski
last_updated: 2026-11-02
milestone: M4
requirements: [FR-TLOG-004, FR-TLOG-020, FR-TLOG-021, SCR-008, SCR-022, SCR-032, SCR-040, SCR-041, SCR-043, SCR-072]
related: [req-time-logs, web-screens, feat-tlog-web, feat-tlog-prompt, feat-shell-new-menu, feat-note-todos, feat-auth-web-session, OQ-211, OQ-262, OQ-263]
prototype: 570b9cc
---

# Log presets, the reminder to log time, Prompt Edit and wider dialogs

## Goal
Logging time takes fewer clicks: a new log starts at 15 min (ArrowUp / ArrowDown ±15 min) with the last log's project and task, or
with a group's from its **+** (FR-TLOG-004, SCR-040, SCR-041). A header bell reminds the user to log unlogged time today, also in the
tab title, favicon and app badge (FR-TLOG-021, SCR-008). The Prompt's notes are read-only with an **Edit** mode (FR-TLOG-020). The
New project / task / to-do / log dialogs are as wide as New note, and the Time by log tooltip can grow to the screen edge (SCR-043).
Web only: no API change.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | The production files are twins of the prototype's: copy, `@/proto/mock/client` → `@/lib/api/client`, `@/proto/` → `@/`, then Prettier, so `pm4 twins` reports them equal. | Agent: as feat-tlog-prompt D6 |
| D2 | Duration: a new log starts at `15m`; ArrowUp / ArrowDown add / take 15 min within 15 min – 24 h; from an empty or invalid value → `15m`. Editing a log keeps its duration. | Owner, prototype `570b9cc` |
| D3 | The last log's project and task live in module state (`last-log-link.ts`) until the page reloads. Every new log saved from the log dialog sets them, those from a group's **+** included; editing a log doesn't. A new log without a preset starts with them; a preset wins. Sign-out and the end of the session (every `queryClient.clear()` in `useSignOut` and `AuthGuard`) reset them to `NO_LOG_LINK`, so no other user gets them in the same tab; deleting their project or task forgets them (`forgetLogLinkTo` in `useDeleteProject` / `useDeleteTask`'s `onSuccess`). | Owner, prototype `570b9cc`; OQ-263 (review) |
| D4 | A group's **+** (By Project: the project; By Task: the task and its project) is hidden on Unsorted, Non-prod, deleted projects or tasks, and a task group without a task. The group header is `AccordionTrigger nativeButton={false} render={<div />}`, so the **+** button can sit inside it; its click and keys don't toggle the group. | Owner, prototype `570b9cc` |
| D5 | The reminder (OQ-262): today only; a start, ≥ 1 log, all logs (excluded too) < the daily target, and *unlogged* (now − start − logged) ≥ 15 min. A dismissal holds while the date and start + logged are unchanged and `floor(unlogged / 15)` hasn't grown; it lives in the bell's state until reload. It reads today's day with the existing `useDay` (API-WD-001) and `useNowMinute`, only once `useMe` has the user (their time zone): until then the bell shows no notifications and reads no day. | OQ-262 (owner, 2026-11-02); prototype `570b9cc`; OQ-263 (review) |
| D6 | While the reminder shows: "(1) " before the tab title (re-applied when a navigation changes the title), the favicon redrawn with a red dot (restored after), and `navigator.setAppBadge(1)` where it exists. The Badging API works only in Chrome / Edge installed apps on Windows and macOS (not Android or most Linux); elsewhere nothing happens and nothing fails. | Owner, prototype `570b9cc` |
| D7 | Prompt: the cards' notes are plain text. **Edit** swaps the cards for the Copy all markdown in `MarkdownEditor` (Write / Preview, no length limit) and hides itself; there's no way back to the cards: **Cancel** closes and discards the edit. Copy all copies the edited text. **Edit** is disabled while a card's project or task query is fetching (`useIsFetching` on `projectKeys.details()` and `taskKeys.details()`), since its text is fixed when clicked; Copy all isn't (feat-tlog-prompt AC-9). Supersedes feat-tlog-prompt D8. | Owner, prototype `570b9cc`; OQ-263 (review) |
| D8 | The pie's tooltip is a portal on `document.body` that follows the pointer (12 px away), may grow to 16 px from the right edge, wraps a long label, and flips above the pointer near the bottom. | Owner, prototype `570b9cc` |
| D9 | The project, task, to-do and log dialogs use `sm:max-w-2xl!`, as the note dialog. | Owner, prototype `570b9cc` |

## Scope
**In:** the twins of the prototype files under *Files*, three new files (`last-log-link.ts`, `reminder.ts`, `notifications-button.tsx`),
`features/system/use-attention.ts`, the bell in the app header, and resetting the last link in `use-sign-out.ts` and `auth-guard.tsx`.

**Test step (main session):** writes `web/features/time/last-log-link.ts` as the final twin (module state only), the stubs below, the new
tests, and updates the existing tests the new behavior breaks: in `day-prompt-notes.ac.test.tsx` the editable-notes tests (feat-tlog-prompt
AC-15…AC-17) become AC-7 below; `log-form-dialog.ac.test.tsx` resets `setLastLogLink(NO_LOG_LINK)` before each test (D3 carries a link
from test to test); `day-view.ac.test.tsx` AC-16 queries the group trigger so that it doesn't also match the group's **+** ("Log time to …").
Then `pm4 hash`.

**Non-goals** (implementers must not touch these):
- `api/`, `web/lib/api/*`, `web/components/ui/*`, `web/proto/**`, `web/app/proto/**`.
- `features/dashboard/*` (feat-rpt-web D9), `features/time/api.ts`, `features/time/day.ts`, every other `features/**` file not under *Files*.

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/04-web/screens.md` (SCR-008, SCR-040, SCR-041, SCR-043) | Behavior and copy |
| `web/proto/features/time/api.ts` | The mock hooks the twins call: production's `features/time/api.ts` has the same `useDay`, `useNowMinute`, `useCreateLog` |
| `web/proto/features/time/reminder.ts`, `web/proto/features/time/last-log-link.ts` | The new logic, copied as twins |
| `web/app/(dashboard-layout)/layout/vertical/header/index.tsx`, `web/proto/mock/shell/header.tsx` | Where the bell goes in production; where it sits in the prototype |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| web | `web/features/time/reminder.ac.test.ts` | C | tests | Acceptance tests (AC-1) |
| web | `web/features/time/last-log-link.ac.test.tsx` | C | tests | Acceptance tests (AC-10, AC-11) |
| web | `web/features/time/components/notifications-button.ac.test.tsx` | C | tests | Acceptance tests (AC-2, AC-3, AC-12) |
| web | `web/features/time/components/log-form-dialog.ac.test.tsx` | M | tests | AC-4, AC-5; reset the last link before each test |
| web | `web/features/time/components/day-view.ac.test.tsx` | M | tests | AC-6; AC-16's group query |
| web | `web/features/time/components/day-prompt-notes.ac.test.tsx` | M | tests | AC-7 replaces feat-tlog-prompt AC-15…AC-17; AC-13 |
| web | `web/features/time/last-log-link.ts` | C | tests | The twin of the prototype file, final (D3, `forgetLogLinkTo`) |
| web | `web/features/time/reminder.ts` | C | tests, T2 | Stub, then the twin |
| web | `web/features/time/components/notifications-button.tsx` | C | tests, T2 | Stub, then the twin |
| web | `web/features/projects/components/project-form-dialog.tsx` | M | T1 | Twin (D9) |
| web | `web/features/tasks/components/task-form-dialog.tsx` | M | T1 | Twin (D9) |
| web | `web/features/notes/components/todo-form-dialog.tsx` | M | T1 | Twin (D9) |
| web | `web/features/notes/components/markdown-editor.tsx` | M | T1 | Twin: `placeholder`, `maxLength`, `aria-label` props |
| web | `web/features/time/prompt.ts` | M | T1 | Twin (a comment) |
| web | `web/features/time/components/day-prompt-dialog.tsx` | M | T1 | Twin (D7, Edit waits for the cards) |
| web | `web/features/time/components/day-charts.tsx` | M | T1 | Twin (D8) |
| web | `web/features/time/schemas.ts` | M | T1 | Twin (D2, D3: `DURATION_STEP`, `logFormDefaults(…, link)`) |
| web | `web/features/time/components/log-form-dialog.tsx` | M | T1 | Twin (D2, D3, D9: `preset` prop) |
| web | `web/features/time/components/day-view.tsx` | M | T1 | Twin (D4) |
| web | `web/features/projects/api.ts` | M | T1 | Twin (D3: `useDeleteProject` forgets the last link) |
| web | `web/features/tasks/api.ts` | M | T1 | Twin (D3: `useDeleteTask` forgets the last link) |
| web | `web/features/auth/use-sign-out.ts` | M | T1 | D3, *Sign-out (T1)*; an intended twin difference (no copy) |
| web | `web/features/auth/components/auth-guard.tsx` | M | T1 | D3, *Sign-out (T1)*; no prototype twin |
| web | `proto/features/system/use-attention.ts` → `features/system/use-attention.ts` | P | T2 | D6 |
| web | `web/app/(dashboard-layout)/layout/vertical/header/index.tsx` | M | T2 | The bell (*Web (T2)*) |

## Interfaces

### Twins (T1)
From the repo root:
```bash
for f in projects/components/project-form-dialog.tsx tasks/components/task-form-dialog.tsx notes/components/todo-form-dialog.tsx \
  notes/components/markdown-editor.tsx time/prompt.ts time/components/day-prompt-dialog.tsx time/components/day-charts.tsx \
  time/schemas.ts time/components/log-form-dialog.tsx time/components/day-view.tsx projects/api.ts tasks/api.ts; do
  sed -e 's#@/proto/mock/client#@/lib/api/client#' -e 's#@/proto/#@/#g' web/proto/features/$f > web/features/$f
done
cd web && npx prettier --write features/projects/components/project-form-dialog.tsx features/tasks/components/task-form-dialog.tsx \
  features/notes/components/todo-form-dialog.tsx features/notes/components/markdown-editor.tsx features/time/prompt.ts \
  features/time/components/day-prompt-dialog.tsx features/time/components/day-charts.tsx features/time/schemas.ts \
  features/time/components/log-form-dialog.tsx features/time/components/day-view.tsx features/projects/api.ts features/tasks/api.ts
```
The diff they bring is `git diff 570b9cc~1 570b9cc -- web/proto/features/` (those files). New exports: `DURATION_STEP` (`schemas.ts`);
`logFormDefaults(log, date, nowQuarter, link = NO_LOG_LINK)`; `LogFormDialog` gains `preset?: LogLink`; `MarkdownEditor` gains
`placeholder?`, `maxLength?: number | null` (default `NOTE_BODY_MAX`), `"aria-label"?`. The other callers of `LogFormDialog` and
`MarkdownEditor` don't change.

### Last log link (test step, D3)
```ts
// web/features/time/last-log-link.ts: the prototype file as is
export interface LogLink { project: ProjectRef | null; task: TaskRef | null }
export const NO_LOG_LINK: LogLink;
export const getLastLogLink: () => LogLink;
export function setLastLogLink(link: LogLink): void;
export function forgetLogLinkTo(id: string): void;   // resets to NO_LOG_LINK when the link's project, task or task's project is `id`
```

### Sign-out (T1)
Not twins (the prototype's sign-out differs on purpose; the guard has none). In `web/features/auth/use-sign-out.ts` and
`web/features/auth/components/auth-guard.tsx`: `import { NO_LOG_LINK, setLastLogLink } from "@/features/time/last-log-link";` and
`setLastLogLink(NO_LOG_LINK);` on the line after each `queryClient.clear();` (one in the hook; two in the guard: no session, session ended),
as in `web/proto/features/auth/use-sign-out.ts`. Then Prettier on the two.

### Reminder (T2)
```ts
// web/features/time/reminder.ts (D5): the prototype file
export const REMINDER_STEP = 15;
export interface LogReminder { unlogged: number; since: number }        // since = start + logged, minutes after midnight
export function logReminder(day: Day, nowMinute: number | null, targetMinutes: number): LogReminder | null;
export interface ReminderDismissal { workDate: string; since: number; steps: number }   // steps = floor(unlogged / 15)
export function dismissalOf(workDate: string, reminder: LogReminder): ReminderDismissal;
export function isDismissed(workDate: string, reminder: LogReminder, dismissal: ReminderDismissal | null): boolean;
// web/features/time/components/notifications-button.tsx (SCR-008)
export function NotificationsButton(): React.JSX.Element;
// web/features/system/use-attention.ts (D6)
export function useAttention(count: number): void;
```
T2 copies `reminder.ts` and `notifications-button.tsx` over their stubs with the T1 command (`time/reminder.ts time/components/notifications-button.tsx`);
`pm4 promote` copies `use-attention.ts`. Then Prettier on the three.

### Web (T2)
In `web/app/(dashboard-layout)/layout/vertical/header/index.tsx`: `import { NotificationsButton } from "@/features/time/components/notifications-button";`
and `<NotificationsButton />` right after the `<Suspense>` that wraps `<NewItemButton />`, before `<LightDark />`, as in `web/proto/mock/shell/header.tsx`.

## Acceptance criteria
Tests mock `@/lib/api/client`, `next/navigation` and `useMe` (time zone `Europe/Zagreb`, `dailyTargetMinutes` 420), as the existing
`features/time` tests do; times are in Zagreb.

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `logReminder` (target 420), start 480 and logs of 60 + 60 min (one excluded): now 614 → `null`; 615 → `{ unlogged 15, since 600 }`; no start, no logs, logs adding up to 420, or now `null` → `null`. `dismissalOf("2026-10-09", {20, 600})` → `{ steps 1 }`; `isDismissed` true for `{29, 600}`, false for `{30, 600}`, for `{20, 615}` (start + logged changed), for another date, and for no dismissal | `web/features/time/reminder.ac.test.ts` | T2 |
| AC-2 | `NotificationsButton`, today 2026-10-09 10:20 with start 08:00 and 2h logged: the button is "Notifications (1 new)"; its popover shows **Log your time** and "20m unlogged since 10:00"; `document.title` starts with "(1) "; **Dismiss** → "Notifications", "No notifications.", the title prefix gone; clicking **Log your time** opens the **Log time** dialog for today | `web/features/time/components/notifications-button.ac.test.tsx` | T2 |
| AC-3 | `NotificationsButton` with no start, with no logs, or with 7h logged → "Notifications", "No notifications.", no title prefix | `web/features/time/components/notifications-button.ac.test.tsx` | T2 |
| AC-4 | New log: Duration is `15m`; ArrowUp → `30m`; ArrowDown twice → `15m`; `24h` + ArrowUp → `24h`; `abc` + ArrowUp → `15m`; editing a 45-min log shows `45m` | `web/features/time/components/log-form-dialog.ac.test.tsx` | T1 |
| AC-5 | After adding a log with task Specifications 01, a new log starts with Manhatan and Specifications 01; after editing a log on another project, a new log still starts with Specifications 01; with a `preset` of project Tesla, it starts with Tesla and no task | `web/features/time/components/log-form-dialog.ac.test.tsx` | T1 |
| AC-6 | Day view By Project: the **+** "Log time to Manhatan" opens **Log time** with project Manhatan and no task, and the group stays closed; By Task: "Log time to Specifications 01" opens it with that task and Manhatan; Unsorted, Non-prod and a deleted project's group have no **+** | `web/features/time/components/day-view.ac.test.tsx` | T1 |
| AC-7 | Prompt: the notes are text, no textbox; **Edit** shows one textbox "Prompt text" holding exactly what Copy all would copy, and hides **Edit**; after typing, **Copy all** copies the edited text; closing and reopening shows the cards again; no API write | `web/features/time/components/day-prompt-notes.ac.test.tsx` | T1 |
| AC-8 | The twins under *Files* equal their prototype files; the header renders `NotificationsButton` | check | T2 |
| AC-10 | With the last link Manhatan · Specifications 01: `forgetLogLinkTo` of another project or task keeps it; of t1 or of p1 → `NO_LOG_LINK` (also for the project-only link Tesla and p2); `useDeleteTask` of another task keeps it, of Specifications 01 forgets it; `useDeleteProject` of another project keeps it, of Manhatan forgets it | `web/features/time/last-log-link.ac.test.tsx` | T1 |
| AC-11 | `useSignOut` resets the last link; in `AuthGuard`, the session ending resets it, and so does finding no session (`getAccessToken` → `null`) | `web/features/time/last-log-link.ac.test.tsx` | T1 |
| AC-12 | `NotificationsButton` while `GET /me` is pending (2026-10-09 22:30 UTC, Zagreb already 2026-10-10): "Notifications", no workday request; once the user loads, it requests 2026-10-10 only | `web/features/time/components/notifications-button.ac.test.tsx` | T2 |
| AC-13 | Prompt: while task X's query is pending, **Edit** is disabled and **Copy all** isn't; once it loads, **Edit** is enabled | `web/features/time/components/day-prompt-notes.ac.test.tsx` | T1 |
| AC-9 | In the browser: the four dialogs are as wide as New note; the Time by log tooltip follows the pointer above the card and reaches the screen edge for a long log; the reminder dots the favicon and prefixes the tab title, and they clear on dismiss; in an installed Chrome app on Windows or macOS, the app icon shows a badge | manual | T2 |

Typed stubs (created with the tests, so lint and typecheck pass while the tests fail):
- `web/features/time/reminder.ts`: the exports above; `REMINDER_STEP` and the types real, each function body `throw new Error("not implemented (feat-tlog-reminder)")`.
- `web/features/time/components/notifications-button.tsx`: `NotificationsButton`, its body `throw new Error("not implemented (feat-tlog-reminder)")`.

## Checks
```bash
# AC-8: twins equal; the header has the bell
node scripts/pm4.mjs twins
grep -q "<NotificationsButton />" "web/app/(dashboard-layout)/layout/vertical/header/index.tsx"
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Log presets, group **+**, Prompt Edit, pie tooltip, wider dialogs: ten prototype twins | web | S | haiku | Twin copy, the command under *Twins (T1)* | — |
| T2 | Reminder to log time: `reminder.ts`, the bell, `use-attention.ts`, the header | web | S | haiku | Twin copy and one promote; the header change is two lines | T1 |

## Open questions
None.

## Changelog
- 2026-11-02: Initial draft from prototype `570b9cc` (OQ-262; the Prompt's editable notes of OQ-211 become an Edit mode). Ready for review.
- 2026-11-02: Approved by the owner.
- 2026-11-02: After the Opus review (OQ-263): D3 resets the last link on sign-out / session end and forgets it on its project's or task's delete; D5 the bell waits for the user; D7 Edit waits for the cards. Prototype twins changed (`last-log-link.ts`, `projects/api.ts`, `tasks/api.ts`, `auth/use-sign-out.ts`, `notifications-button.tsx`, `day-prompt-dialog.tsx`); AC-10…AC-13 added. Approved by the owner.
