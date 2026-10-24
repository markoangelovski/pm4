---
id: feat-book-web-nav
title: "Bookings navigation: range presets, project filter, Expand all and links between a booking's two days"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-24
milestone: M4
requirements: [FR-BOOK-001, FR-BOOK-003, FR-BOOK-007, FR-BOOK-008, SCR-045]
related: [web-prototype, ADR-0012, web-screens, web-routing, req-bookings, feat-book-web, feat-book-partial, feat-proto-sync-logged-chart, OQ-225, OQ-226, OQ-227, OQ-228, OQ-229]
prototype: cf3052f
---

# Bookings navigation: range presets, project filter, Expand all and links between a booking's two days

## Goal
Production's Bookings page (SCR-045) catches up with the confirmed prototype (`cf3052f`): range presets (FR-BOOK-001), a **Project** filter
(FR-BOOK-007), **Expand all** / **Collapse all** per day (FR-BOOK-003), and "Booked to" / "Worked on" links between a booking's two days
(FR-BOOK-008). Web only; the API doesn't change.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | Presets = the Statistics presets (`features/dashboard/range.ts`) with their end cut at today, plus **Custom range**. A preset applies at once; Custom range opens the calendar; the calendar and **Submit** stay. | OQ-225 (owner, 2026-10-24) |
| D2 | `?project=` = the project id, or `deleted:<title>` for a deleted one. Options: All projects, then the projects with logs or bookings in the range (deleted too), by title. Filtered, days and all six cards count only that project's logs. A value not among the options counts as All projects. Filtered in the browser. | OQ-226 (owner, 2026-10-24) |
| D3 | **Expand all** / **Collapse all** at the right of each day's date bar; the first column header always reads **Project**. | OQ-227 (owner, 2026-10-24) |
| D4 | Day sections have the id `day-YYYY-MM-DD`; both ends of a booking link to each other with `#day-<day>.log-<logId>.to-<bookingDate>`. Listed day → only the hash changes; else that day's month up to today, keeping `project`. | OQ-228 (owner, 2026-10-24) |
| D5 | On arrival: smooth scroll, the day expands, the day and the other row's Booking date cell are outlined until the next click; the page keeps its height until the scroll stops; the last loaded range stays on screen, faded, while a new one loads. | OQ-229 (owner, 2026-10-24) |
| D6 | All five changed files already exist in production as twins of the previous prototype: production becomes the new twin by the copy command in *Interfaces*; `day-link.tsx` and `project-filter.tsx` are promoted. | Agent |

## Scope
**In:** `web/features/bookings/days.ts` and `web/features/bookings/components/*` become the prototype's twins.

**Test step (main session, before T1):** the typed stubs below in `web/features/bookings/days.ts`; the new ACs in
`web/features/bookings/days.ac.test.ts` and `web/features/bookings/components/bookings-view.ac.test.tsx`; and in the latter's existing tests
(behavior the prototype changed): AC-8's collapsed headers start with `"Project"`, not `"Projects"`, and AC-11's empty state reads
"Pick another time range or project.". Then `pm4 hash`.

**Non-goals** (implementers must not touch these):
- `web/proto/**` (the prototype is the source), `web/app/**`, `web/features/dashboard/*` (`range.ts` is reused as it is), `web/components/ui/*`,
  `web/lib/*`, `web/features/bookings/api.ts`.
- The API and the contract (`api/`, `openapi.json`, `schema.d.ts`).
- Any acceptance test (`*.ac.*`).

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/04-web/prototype.md#twin-check` | What "equals its twin" means |
| `web/proto/features/bookings/api.ts` | The mock hooks the components call; production's `features/bookings/api.ts` already has the same names |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| web | `web/features/bookings/days.ts` | M | tests, T1 | Typed stubs, then the twin |
| web | `web/features/bookings/days.ac.test.ts` | M | tests | AC-1…AC-3 |
| web | `web/features/bookings/components/bookings-view.ac.test.tsx` | M | tests | AC-4…AC-9; AC-8 / AC-11 edits (Scope) |
| web | `web/proto/features/bookings/components/day-link.tsx` → `web/features/bookings/components/day-link.tsx` | P | T1 | |
| web | `web/proto/features/bookings/components/project-filter.tsx` → `web/features/bookings/components/project-filter.tsx` | P | T1 | |
| web | `web/features/bookings/components/booking-cell.tsx`, `web/features/bookings/components/bookings-view.tsx`, `web/features/bookings/components/day-section.tsx`, `web/features/bookings/components/range-field.tsx` | M | T1 | Replaced by the twins |

## Interfaces

### Typed stubs (test step; T1)
Added to `web/features/bookings/days.ts` (exports and signatures exactly as in `web/proto/features/bookings/days.ts`), each function body
`throw new Error("not implemented (feat-book-web-nav)")`:
```ts
export const projectKey: (project: Ref) => string;
export interface ProjectOption { key: string; project: Ref }
export function projectOptions(logs: BookingLog[], range: DateRange): ProjectOption[];
export function logsOfProject(logs: BookingLog[], key: string | null): BookingLog[];
export function bookingPresetRange(preset: RangePreset, today: string): DateRange;   // RangePreset from @/features/dashboard/range
export function matchBookingPreset(range: DateRange, today: string): RangePreset | null;
export const dayAnchor: (date: string) => string;
export const bookingRowId: (logId: string, date: string) => string;
export interface BookingTarget { day: string; logId: string; bookingDate: string }
export const targetAnchor: (t: BookingTarget) => string;
export function parseAnchor(hash: string): { day: string; row: string | null } | null;
export function monthUpTo(date: string, today: string): DateRange;
```

### Web (T1)
`pm4 promote` has copied `day-link.tsx` and `project-filter.tsx`. Then, from `web/`:
```bash
for f in features/bookings/days.ts features/bookings/components/booking-cell.tsx \
         features/bookings/components/bookings-view.tsx features/bookings/components/day-section.tsx \
         features/bookings/components/range-field.tsx; do
  sed 's#@/proto/mock/client#@/lib/api/client#; s#@/proto/#@/#g' "proto/$f" > "$f"
done
npx prettier --write features/bookings
node ../scripts/pm4.mjs twins   # every features/bookings pair: equal
```
Nothing else changes: the rewritten imports (`@/features/dashboard/range`, `@/lib/routes`, `@/features/projects/components/project-icon`,
`@/features/time/components/deleted-marker`, `@/components/ui/select`) all exist in production. URL state stays in `useQueryStates`
(`from`, `to`, `project`, `history: "replace"`); the hash is read from `window.location`.

## Acceptance criteria
Today is 2026-10-09 (Europe/Zagreb), target 7 h. View fixtures: the existing `ownerLogs` (projects Anthropic `p-anthropic`, Nvidia `p-nvidia`,
PM Internal `p-pmi`). The view tests stub `Element.prototype.scrollIntoView` with `vi.fn()` and reset the URL
(`window.history.replaceState(null, "", "/")`) after each test. Select options are picked as in `dashboard-view.ac.test.tsx` (`pick`).

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `bookingPresetRange` with today 2026-10-09: `this-month` → 2026-10-01…2026-10-09; `last-month` → 2026-09-01…2026-09-30; `last-7` → 2026-10-03…2026-10-09; `this-year` → 2026-01-01…2026-10-09. `matchBookingPreset({2026-10-01, 2026-10-09})` → `"this-month"`; `{2026-09-15, 2026-10-09}` → `null` | `web/features/bookings/days.ac.test.ts` | T1 |
| AC-2 | `projectOptions(logs, October 1–9)` with the view test's `ownerLogs` (copied into this file) plus a log on a deleted project (`{id: null, title: "Old site", deleted: true}`) worked 2026-10-02 and a Zeta log worked 2026-09-20 booked to 2026-09-21 → keys `["p-anthropic", "p-nvidia", "deleted:Old site", "p-pmi"]` (Zeta, worked and booked outside the range, and Unsorted are not options). `logsOfProject(logs, null)` → all; `"p-anthropic"` → logs a, d, f; `"deleted:Old site"` → that log | `web/features/bookings/days.ac.test.ts` | T1 |
| AC-3 | `targetAnchor({day: "2026-10-07", logId: "a", bookingDate: "2026-10-07"})` → `"day-2026-10-07.log-a.to-2026-10-07"`; `parseAnchor` of it → `{day: "2026-10-07", row: "a:2026-10-07"}`; `"day-2026-10-06"` → `{day: "2026-10-06", row: null}`; `""` and `"top"` → `null`. `monthUpTo("2026-09-30", "2026-10-09")` → 2026-09-01…2026-09-30; `monthUpTo("2026-10-03", "2026-10-09")` → 2026-10-01…2026-10-09 | `web/features/bookings/days.ac.test.ts` | T1 |
| AC-4 | Range preset (FR-BOOK-001): the **Range preset** combobox shows "This month"; its options are This month, Last month, Last 7 days, Last 30 days, Last 90 days, This year, Custom range; **Last 7 days** → URL `from=2026-10-03`, `to=2026-10-09` and GET for that range. `?from=2026-09-01&to=2026-09-30` shows "Last month", and **This month** then removes `from` and `to`. `?from=2026-09-15&to=2026-10-09` shows "Custom range"; picking **Custom range** opens the calendar | `web/features/bookings/components/bookings-view.ac.test.tsx` | T1 |
| AC-5 | Project filter (FR-BOOK-007): the **Project** combobox shows "All projects"; options All projects, Anthropic, Nvidia, PM Internal. **Anthropic** → URL `project=p-anthropic`; sections 2026-10-06, 2026-10-07 only; 7 Oct: Logged `2h 15m`, Billable `2h 15m`, Overtime `0h`, Booked current `45m`, Booked from external `2h`, Booked total `2h 45m`; 6 Oct: Logged `3h 30m`, Billable `2h`, Booked current `0h`, Booked from external `30m`, Booked total `30m`. `?project=p-unknown` → "All projects" and all three sections. With the "Old site" log of AC-2, `?project=deleted:Old site` → only 2026-10-02 | `web/features/bookings/components/bookings-view.ac.test.tsx` | T1 |
| AC-6 | Expand all (FR-BOOK-003): each day heading has **Expand all** (`aria-expanded="false"`); on 6 Oct it expands all four group rows of that day only and reads **Collapse all** (`aria-expanded="true"`); clicked again, all four collapse. The first header is "Project" collapsed and expanded | `web/features/bookings/components/bookings-view.ac.test.tsx` | T1 |
| AC-7 | Links (FR-BOOK-008): sections have the id `day-<date>`. 6 Oct, log a: link "Booked to 7 Oct 2026", href `#day-2026-10-07.log-a.to-2026-10-07`, with **Edit booking** and **Remove booking**; 7 Oct, log e (booked to its own day): "7 Oct 2026", no link; 7 Oct, incoming a: link "Worked on 6 Oct 2026", href `#day-2026-10-06.log-a.to-2026-10-07`; 1 Oct, incoming g: link "Worked on 30 Sep 2026", href `/app/bookings?from=2026-09-01&to=2026-09-30#day-2026-09-30.log-g.to-2026-10-01`, and with `?project=p-nvidia` `/app/bookings?from=2026-09-01&to=2026-09-30&project=p-nvidia#day-2026-09-30.log-g.to-2026-10-01` | `web/features/bookings/components/bookings-view.ac.test.tsx` | T1 |
| AC-8 | Same-page click: expand 6 Oct's Anthropic, click "Booked to 7 Oct 2026" → `window.location.hash` is `#day-2026-10-07.log-a.to-2026-10-07`, no URL update for `from` / `to`, every group of 7 Oct is expanded, and `scrollIntoView` was called on 7 Oct's `tr[data-booking="a:2026-10-07"]` with `{behavior: "smooth", block: "center"}` | `web/features/bookings/components/bookings-view.ac.test.tsx` | T1 |
| AC-9 | Opened with a hash: `#day-2026-10-06.log-f.to-2026-10-06` → 6 Oct is expanded and `scrollIntoView` is called on its `tr[data-booking="f:2026-10-06"]` (`block: "center"`); `#day-2026-10-07` → called on the 7 Oct section with `{behavior: "smooth", block: "start"}`, no group expanded | `web/features/bookings/components/bookings-view.ac.test.tsx` | T1 |
| AC-10 | Dev server, `/app/bookings` (D5): after a link click the day and the other row's Booking date cell are outlined; the next click anywhere removes the outlines and the day stays expanded; clicking the same link again scrolls and outlines again. "Worked on 30 Sep 2026" from October: the page scrolls smoothly from where it was (no jump to the top), October stays on screen faded until September loads. At 375 px the presets, the range and the Project filter wrap | manual | T1 |

Typed stubs: *Typed stubs* above.

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Bookings from the prototype: presets, Project filter, Expand all, booking links (promote two files, copy five twins) | web | S | haiku | Copy commands spelled out; no new logic, no import left to replace | — |

## Open questions
None. OQ-225…OQ-229 are resolved.

## Changelog
- 2026-10-24: Initial draft from prototype `cf3052f` (OQ-225…OQ-229). Ready for review.
