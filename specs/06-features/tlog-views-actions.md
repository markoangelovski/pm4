---
id: feat-tlog-views-actions
title: "Logs: + and ⋯ in Timeline, + after a row's task, task icons"
status: approved
owner: Marko Angelovski
last_updated: 2026-11-12
milestone: M4
requirements: [FR-TLOG-003, FR-TLOG-004, FR-TLOG-015, FR-TLOG-023, SCR-040, SCR-042]
related: [feat-tlog-timeline, feat-tlog-timeline-groups, feat-tlog-reminder, req-time-logs, web-screens]
prototype: a28a67f
---

# Logs: + and ⋯ in Timeline, + after a row's task, task icons

## Goal
On the Logs page (SCR-040), Timeline's project groups get the **+** that By Project has, and its rows get the task and
project icons, a **+** after a live task and the log's **⋯** menu (Edit, Delete). By Project and By Task rows get the
same **+** after a live task, and By Task headings a task icon (FR-TLOG-003/015/023, SCR-042).

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | Timeline is no longer read-only: groups get the **+** (supersedes feat-tlog-timeline-groups D3) and rows the ⋯ menu (supersedes feat-tlog-timeline D2). | Owner, prototype `a28a67f` |
| D2 | A row's **+** follows any task that isn't deleted, in every group, Non-prod included; it presets the task and its project. Sequential rows get none. | Owner, prototype `a28a67f` (approved 2026-11-12) |
| D3 | Timeline rows show the folder icon before a project (outside a project's group) and the list icon before a task, as SCR-042. | Owner, prototype `a28a67f` (approved 2026-11-12) |
| D4 | The + button is one shared component, `group-log-button.tsx` (`GroupLogButton`, `LogLinkButton`, `logLink`), moved out of `day-view.tsx`; the ⋯ menu is `LogActions` in `log-row.tsx`, shared by LogRow and Timeline. | Owner, prototype `a28a67f` |
| D5 | feat-tlog-timeline's AC-10 asserted "rows have no actions". The test step changes only that assertion: each Timeline row now has **Log actions**, and the deleted log's row has no **+**. | Main session, 2026-11-12 |

## Scope
**In:** `features/time/components/group-log-button.tsx` (new), `log-row.tsx`, `log-timeline.tsx`, `day-view.tsx`, all as
twins of the prototype.

**Test step (main session, before T1):** writes `log-views-actions.ac.test.tsx` and changes AC-10 of
`log-timeline.ac.test.tsx` as D5 says, nothing else. Then `pm4 hash`.

**Non-goals** (implementers must not touch these):
- `api/` (no contract change), `web/proto/**`, `web/app/proto/**`, `web/components/ui/*`.
- `day.ts`, `api.ts`, `types.ts`, `last-log-link.ts`, `log-form-dialog.tsx`, `delete-log-dialog.tsx`, `day-charts.tsx`.
- Any acceptance test (`*.ac.*`).

## Read first
| Path | Why / copy this |
| --- | --- |
| `web/proto/features/time/components/group-log-button.tsx` | The shared + (T1) |
| `web/proto/features/time/components/log-row.tsx` | `onLog`, `LogActions` (T1) |
| `web/proto/features/time/components/log-timeline.tsx` | Group +, row icons, row +, row ⋯ (T1) |
| `web/proto/features/time/components/day-view.tsx` | `onLog` wiring, By Task heading icon (T1) |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| web | `web/features/time/components/log-views-actions.ac.test.tsx` | C | tests | Through `DayView` |
| web | `web/features/time/components/log-timeline.ac.test.tsx` | M | tests | AC-10 only (D5) |
| web | `proto/features/time/components/group-log-button.tsx` → `features/time/components/group-log-button.tsx` | P | T1 | No `@/proto/` import |
| web | `web/features/time/components/log-row.tsx` | M | T1 | The twin (command below) |
| web | `web/features/time/components/log-timeline.tsx` | M | T1 | The twin (command below) |
| web | `web/features/time/components/day-view.tsx` | M | T1 | The twin (command below) |

## Interfaces

### Web (T1)
`pm4 promote` creates `group-log-button.tsx`. Then, from the repo root:
```bash
for f in log-row.tsx log-timeline.tsx day-view.tsx; do
  sed 's#@/proto/#@/#g' web/proto/features/time/components/$f > web/features/time/components/$f
done
cd web && npx prettier --write features/time/components/group-log-button.tsx features/time/components/log-row.tsx features/time/components/log-timeline.tsx features/time/components/day-view.tsx
```
Make no other change. Everything the files import already exists in production. The props the tests rely on:
`LogTimeline` gains `onLog: (link: LogLink) => void`; `LogRow` gains `onLog?: (link: LogLink) => void`. Every **+** is a
button named `Log time to <task title>` (or `<project title>` on a project group); every ⋯ is `Log actions`.

## Acceptance criteria
The owner's four logs (feat-tlog-web), start 08:00, today 2026-10-07: l1 30 min and l2 1 h 45 min on Manhatan (tasks
Specifications 01 / 02), l3 15 min with no project, l4 1 h on Manhatan excluded from statistics, no task.

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | Timeline → the only **+** is "Log time to Manhatan" (not on Unsorted, Non-prod). Clicking it opens **Log time** with Project "Manhatan", Task empty; the group stays collapsed. | `web/features/time/components/log-views-actions.ac.test.tsx` | T1 |
| AC-2 | Timeline, **Expand all** → the **+** buttons are Manhatan, Specifications 01, Specifications 02, in order. Specifications 02's opens **Log time** with Task "Manhatan · Specifications 02" and Project "Manhatan"; Manhatan stays open. | `web/features/time/components/log-views-actions.ac.test.tsx` | T1 |
| AC-3 | Timeline, **Expand all** → each of the 4 rows has **Log actions**. The first row's **Edit** opens **Edit log** with "Specs review"; the Unsorted row's **Delete** opens "Delete log?". | `web/features/time/components/log-views-actions.ac.test.tsx` | T1 |
| AC-4 | A Non-prod log on Manhatan with task Specifications 01, and a log of a deleted project and task "Old site" / "Old task" → in Timeline (expanded), the Non-prod row has a **+** "Log time to Specifications 01"; the deleted row has none. | `web/features/time/components/log-views-actions.ac.test.tsx` | T1 |
| AC-5 | By Project, Manhatan opened → its rows have **+** "Log time to Specifications 01" and "…02"; Specifications 01's opens **Log time** preset to that task and Manhatan; the group stays open. Unsorted, opened, has no **+** in its row. | `web/features/time/components/log-views-actions.ac.test.tsx` | T1 |
| AC-6 | By Task with the AC-4 Non-prod log, Non-prod opened → its row has **+** "Log time to Specifications 01". Sequential → no **+** at all. | `web/features/time/components/log-views-actions.ac.test.tsx` | T1 |
| AC-7 | feat-tlog-timeline's AC-10 (D5): each Timeline row has **Log actions**, the deleted log's row no **+** | `web/features/time/components/log-timeline.ac.test.tsx` | T1 |
| AC-8 | The four files equal their prototype twins | check | T1 |

No typed stubs: the tests import only `DayView`, which exists.

## Checks
```bash
# AC-8: twins equal
node scripts/pm4.mjs twins
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Logs views: + and ⋯ in Timeline, + after a row's task, task icons: the four prototype twins | web | S | haiku | Promote + twin copy, the commands under *Interfaces → Web* | — |

## Open questions
None.

## Changelog
- 2026-11-12: Initial draft from prototype `a28a67f`. Approved by the owner with the prototype decisions (D2, D3),
  2026-11-12.
