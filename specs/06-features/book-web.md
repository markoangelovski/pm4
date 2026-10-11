---
id: feat-book-web
title: "Bookings web: the Bookings page"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-09
milestone: M4
requirements: [FR-BOOK-001, FR-BOOK-002, FR-BOOK-003, FR-BOOK-004, FR-BOOK-005, FR-BOOK-006, SCR-045]
related: [req-bookings, web-screens, web-routing, feat-book-api, feat-tlog-web, OQ-122, OQ-123, OQ-124, OQ-125]
---

# Bookings web: the Bookings page

## Goal
A signed-in user opens **Bookings** from the sidebar, picks a date range, and sees each day's figures and per-project rows, then books logs one by one
or per project, changes a booking date or removes it. Behavior: [screens.md](../04-web/screens.md) SCR-045 and [req-bookings](../01-requirements/bookings.md).
API: feat-book-api. Patterns: feat-tlog-web.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | The day and group logic is plain functions, final before the implementation (test step): `isBookable`, `bookingDays`, `defaultRange`, `parseRange`, `rangeLabel`. | Agent: as feat-tlog-web D1 |
| D2 | A row's *Hours booked* counts hours booked to that day only, so the rows add up to *Booked total*. | OQ-122 (owner) |
| D3 | The range is `?from=&to=`; absent or invalid → the current month up to today. Applying the default range removes both parameters. | OQ-125 (owner) |
| D4 | `bookingKeys` live under `timeKeys.all`, so every log mutation of feat-tlog-web (which invalidates `timeKeys.all`) also refreshes Bookings, e.g. after **Log time** in the header. | Agent |
| D5 | Booking changes save at once with no success toast; a failure shows a toast. | Agent: like the inline status in SCR-030 |

## Scope
**In:** `features/bookings/` (logic, hooks, components); the page `/app/bookings`; the route constant and the sidebar link.

**Before the tests are written:** feat-book-api and feat-tlog-web are done. The test writer runs `npm run api:types`.

**Non-goals** (implementers must not touch these):
- `api/`. The Logs day view and log dialog (`features/time/*`), the dashboard, the project and task pages.
- `lib/api/*` (except the generated `schema.d.ts`), `lib/auth/*`, `web/components/ui/*` (add shadcn components only with the CLI, if one is missing).

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/04-web/screens.md` (SCR-045) | Screen behavior and copy |
| `specs/03-api/endpoints.md#shared-booking-shapes`, API-BOOK-001/002 | Contract |
| `web/features/time/api.ts` | `timeKeys`, hooks, `unwrap`, invalidation to copy |
| `web/features/time/components/day-view.tsx` | `useMe`, nuqs query state, states (skeletons, error + Retry, empty) |
| `web/features/time/components/date-field.tsx` | The date field the booking cell reuses |
| `web/features/time/types.ts`, `web/lib/time/index.ts` | `TimeLog`, `Ref`; `today`, `formatDuration`, `formatWorkDate` |
| `web/features/projects/components/project-icon.tsx` | The project icon |
| `web/components/ui/table.tsx`, `calendar.tsx`, `popover.tsx`, `tooltip.tsx`, `empty.tsx` | Table, range calendar, tooltips, empty state |
| `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ts`, `web/lib/routes.ts` | Where the link and the route go |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| web | `web/features/bookings/days.ac.test.ts` | C | tests | Acceptance tests |
| web | `web/features/bookings/api.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/features/bookings/components/bookings-view.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ac.test.ts` | M | tests | Bookings under Time (feat-shell-sidebar-sections AC-1, AC-3) |
| web | `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.test.ts` | M | tests | The same expectation |
| web | `web/lib/api/schema.d.ts` | M | tests | `npm run api:types` |
| web | `web/features/bookings/days.ts` | C | tests | Pure logic, final (D1) |
| web | `web/features/bookings/api.ts` | C | tests, T1 | Stub from the test writer (`bookingKeys` real) |
| web | `web/features/bookings/components/bookings-view.tsx` | C | tests, T2 | The page body (stub from the test writer) |
| web | `web/features/bookings/components/range-field.tsx` | C | T2 | Range calendar + Submit |
| web | `web/features/bookings/components/day-section.tsx` | C | T2 | One date: figures and table |
| web | `web/features/bookings/components/booking-cell.tsx` | C | T2 | A log's booking controls |
| web | `web/app/(dashboard-layout)/app/bookings/page.tsx` | C | T2 | Renders `BookingsView` |
| web | `web/lib/routes.ts` | M | T2 | `routes.app.bookings` |
| web | `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ts` | M | T2 | The **Bookings** link |

## Interfaces

### Types and pure logic (final in the test step, D1)
```ts
// web/features/bookings/days.ts
export type BookingLog = components["schemas"]["BookingLogResponseDto"];   // TimeLog + bookingDate: string | null
export interface DateRange { from: string; to: string }
export type GroupKind = "project" | "unsorted" | "nonprod";
/** !excludeFromStats && project !== null (a deleted project too). */
export function isBookable(log: Pick<BookingLog, "excludeFromStats" | "project">): boolean;
export interface BookingEntry { log: BookingLog; worked: number; booked: number; incoming: boolean }
export interface BookingGroup { key: string; kind: GroupKind; project: Ref | null; worked: number; booked: number; entries: BookingEntry[]; unbookedIds: string[] }
export interface BookingDay { workDate: string; logged: number; billable: number; overtime: number;
  bookedCurrent: number; bookedExternal: number; bookedTotal: number; groups: BookingGroup[] }
export function bookingDays(logs: BookingLog[], range: DateRange, targetMinutes: number): BookingDay[];
/** { from: the 1st of today's month, to: today } */
export function defaultRange(today: string): DateRange;
/** Real dates (YYYY-MM-DD), from ≤ to ≤ today, to − from ≤ 366 days → that range; anything else (also a missing one) → defaultRange(today). */
export function parseRange(from: string | null, to: string | null, today: string): DateRange;
/** Same year and month → "October 2026"; else "1 Sep 2026 – 9 Oct 2026" (formatWorkDate, an en dash with spaces). */
export function rangeLabel(range: DateRange): string;
```
`bookingDays` rules (FR-BOOK-001…003, D2), with `logs` in API order (by `workDate`, then entry order):
- **Dates:** every `d` in the range that is some log's `workDate`, or the `bookingDate` of a bookable log worked on another day; ascending.
- **Own logs** of `d`: `workDate === d`. **Incoming:** bookable, `bookingDate === d`, `workDate !== d`.
- `logged` = Σ own; `billable` = Σ own not excluded; `overtime` = max(0, billable − target); `bookedCurrent` = Σ own bookable with `bookingDate === d`;
  `bookedExternal` = Σ incoming; `bookedTotal` = their sum.
- **Group** of an own log: excluded → `nonprod` (key `"nonprod"`, project null); no project → `unsorted` (key `"unsorted"`); else `project` with key
  `project.id ?? \`deleted:${project.title}\``. An incoming log joins its project's group, which it creates when the day has none.
- **Entry:** own → `worked` = duration, `booked` = duration when `bookingDate === d` else 0, `incoming` false; incoming → `worked` 0, `booked` = duration, `incoming` true.
  Own entries first, then incoming ones, each in input order.
- `group.worked` / `group.booked` = sums of its entries; `unbookedIds` = ids of its own bookable entries with `bookingDate === null` (project groups only).
- **Group order:** project groups by `worked` descending (ties keep first appearance), then `unsorted`, then `nonprod`.

### Data (T1)
```ts
// web/features/bookings/api.ts (re-exports BookingLog)
export const bookingKeys = {
  all: [...timeKeys.all, "bookings"] as const,                 // D4
  range: (from: string, to: string) => [...bookingKeys.all, from, to] as const,
};
export function useBookingRange(from: string, to: string): UseQueryResult<BookingLog[], Error>;   // GET /bookings?from=&to=, returns data.items (API-BOOK-001)
export function useSetBooking(): UseMutationResult<BookingLog[], Error, { logIds: string[]; bookingDate: string | null }>;
// PUT /bookings (API-BOOK-002), returns data.items; onSuccess invalidates bookingKeys.all
```

### Page and components (T2)
```tsx
// web/features/bookings/components/bookings-view.tsx — ?from=&to= with nuqs useQueryStates (parseAsString), history "replace"
export function BookingsView(): React.JSX.Element;
// web/features/bookings/components/range-field.tsx — keyed by `${from}:${to}` in BookingsView so it resets when the URL changes
export function RangeField(props: { applied: DateRange; max: string; onSubmit: (range: DateRange) => void }): React.JSX.Element;
// web/features/bookings/components/day-section.tsx
export function DaySection(props: { day: BookingDay; today: string }): React.JSX.Element;
// web/features/bookings/components/booking-cell.tsx — own entries of bookable logs only; max = today
export function BookingCell(props: { log: BookingLog; max: string }): React.JSX.Element;
export const bookedTone: (sameDay: boolean) => string;   // "text-green-700 dark:text-green-400" | "text-yellow-700 dark:text-yellow-500"
```
- `BookingsView`: `useMe` (`timeZone`, `dailyTargetMinutes`); `today = today(me.timeZone)`; `range = parseRange(q.from, q.to, today)`; `useBookingRange(range.from, range.to)`;
  `days = bookingDays(data, range, me.dailyTargetMinutes)` (memoised). Submit → `setQuery(equal to defaultRange(today) ? { from: null, to: null } : range)` (D3).
  Render, per SCR-045: heading, `rangeLabel(range)`, `RangeField`, then by state: skeletons; error → "Couldn't load the bookings." + **Retry** (`refetch`);
  no days → the empty card; else one `DaySection` per day.
- `RangeField`: `<Calendar mode="range" numberOfMonths={2} disabled={{ after: max }}>` in a `Popover`; **Submit** disabled until a start is picked, and while `to − from` > 366 days, then with the hint "Pick at most 366 days." (OQ-130, as SCR-010); a start alone → `{ from, to: from }`.
- `DaySection`: `<section aria-label={day.workDate}>`; the heading, six figure cards (SCR-045 labels and tooltips; hours `minutes === 0 ? "0h" : formatDuration(minutes)`),
  then the table. Expanded state is per section, all collapsed at first; the collapsed layout (3 columns) shows while no group is expanded, the 6-column layout
  otherwise. A group row click toggles it unless the target is inside `a, button, input, [role=dialog]`. The chevron is a button labelled "Expand project" /
  "Collapse project" with `aria-expanded`. **Book all** → `useSetBooking().mutate({ logIds: group.unbookedIds, bookingDate: day.workDate })`.
  Log rows by entry: `incoming` → "Worked on {formatWorkDate(log.workDate)}" in `bookedTone(false)` with a bookmark icon and the `title` "Edit this booking from the day
  the log was worked"; `unsorted` group → "Add the log to a Project or Task"; `nonprod` → nothing; else `<BookingCell log={entry.log} max={today} />`.
  Group names: project → icon + link `${routes.app.project}?id=` (deleted: plain text and "(deleted)"); "Unsorted"; "Non-prod". Tasks: list icon + link
  `${routes.app.task}?id=` (deleted: plain text and "(deleted)"), none → `—`.
- `BookingCell`: booked and not editing → bookmark icon + `formatWorkDate(bookingDate)` in `bookedTone(bookingDate === log.workDate)`, buttons "Edit booking date"
  (opens the date field at the booking date, with "Save booking date" ✓ and "Cancel" ×) and "Remove booking" (`bookingDate: null`); unbooked → `DateField`
  (`value` starts at `log.workDate`, `max`) and **Book**. Every action calls `useSetBooking().mutate({ logIds: [log.id], bookingDate })`; its buttons are disabled
  while pending; `onError` → `toast.error("Couldn't save the booking.")` (D5). Save closes the editor on success.
- `page.tsx`: `<Suspense><BookingsView /></Suspense>`, `metadata.title` "Bookings". `routes.app.bookings = "/app/bookings"`. Sidebar: under **Time**, after Logs,
  `{ id: "bookings", name: "Bookings", icon: CalendarCheck, url: routes.app.bookings }`.

## Acceptance criteria
Tests mock `@/lib/api/client`, `next/navigation` and `useMe` (time zone `Europe/Zagreb`, `dailyTargetMinutes` 420), wrap in `NuqsTestingAdapter`, and use fake
timers (2026-10-09 12:00 in Zagreb). "The owner's logs" (API order): *g* 30 Sep 60 min Nvidia/PM booked 1 Oct; *a* 6 Oct 120 min Anthropic/Meetings booked 7 Oct;
*b* 6 Oct 60 min PM Internal (no task) unbooked; *c* 6 Oct 45 min unsorted; *d* 6 Oct 90 min Anthropic, excluded; *e* 7 Oct 240 min Nvidia/Development booked 7 Oct;
*f* 7 Oct 135 min Anthropic/Meetings unbooked. Range 1–9 Oct 2026.

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `bookingDays` of the owner's logs → three days: 1 Oct, 6 Oct, 7 Oct | `web/features/bookings/days.ac.test.ts` | tests |
| AC-2 | 6 Oct: logged 315, billable 225, overtime 0, booked current / external / total 0 / 0 / 0; groups Anthropic (worked 120, booked 0, `unbookedIds` []), PM Internal (60, 0, [b]), unsorted (45), nonprod (90, holding d although it has a project) | `web/features/bookings/days.ac.test.ts` | tests |
| AC-3 | 7 Oct: logged 375, billable 375, overtime 0, booked current 240, external 120, total 360; groups Nvidia (240, 240), Anthropic (worked 135, booked 120, entries f then a with `incoming` true, `unbookedIds` [f]); the groups' `booked` add up to the total | `web/features/bookings/days.ac.test.ts` | tests |
| AC-4 | 1 Oct: logged 0, booked external 60; one group Nvidia (worked 0, booked 60) with g incoming; a non-bookable log with a `bookingDate` lists no date and counts nowhere as booked; 8 h billable with a 7 h target → overtime 60 | `web/features/bookings/days.ac.test.ts` | tests |
| AC-5 | `isBookable`: excluded → false, no project → false, a deleted project → true; `defaultRange("2026-10-09")` → 1–9 Oct; `parseRange` returns the given range for 2026-09-01..2026-10-09 and 2025-10-08..2026-10-09 (366 days), and the default for a missing value, `2026-02-30`, from > to, `to` 2026-10-10, 2025-10-07..2026-10-09 (367 days); `rangeLabel` → "October 2026", "1 Sep 2026 – 9 Oct 2026" | `web/features/bookings/days.ac.test.ts` | tests |
| AC-6 | `useBookingRange` calls `GET /bookings` with `from`/`to` and returns the items; `useSetBooking` sends `PUT /bookings` with the body and invalidates `bookingKeys.all`; `bookingKeys.all` starts with `timeKeys.all` | `web/features/bookings/api.ac.test.tsx` | T1 |
| AC-7 | `/app/bookings` without parameters: heading **Bookings**, "October 2026", the sections 1, 6 and 7 Oct in that order with their full dates; 7 Oct shows `6h 15m`, `6h 15m`, `0h`, `4h`, `2h`, `6h`; with one more log on 9 Oct, that section is listed last and marked **Today** | `web/features/bookings/components/bookings-view.ac.test.tsx` | T2 |
| AC-8 | Collapsed: the columns **Projects**, **Hours worked**, **Hours booked**; 6 Oct lists Anthropic, PM Internal, Unsorted, Non-prod in that order; **Book all** only on PM Internal (6 Oct) and Anthropic (7 Oct); clicking a row expands it and the columns become Project, Tasks, Logs, Booking date, Hours worked, Hours booked | `web/features/bookings/components/bookings-view.ac.test.tsx` | T2 |
| AC-9 | Expanded rows: a on 6 Oct shows the Meetings link (`/app/task?id=`), its text, "7 Oct 2026" and `0h` booked; on 7 Oct a shows "Worked on 6 Oct 2026" with no buttons; c shows "Add the log to a Project or Task"; d has no booking controls; b has a date field set to 6 Oct and **Book** | `web/features/bookings/components/bookings-view.ac.test.tsx` | T2 |
| AC-10 | **Book** on b → `PUT /bookings {logIds:[b], bookingDate:"2026-10-06"}`; **Book all** on Anthropic (7 Oct) → `{logIds:[f], bookingDate:"2026-10-07"}`; **Remove booking** on e → `{logIds:[e], bookingDate:null}`; **Edit booking date** on e, pick 8 Oct, Save → `{logIds:[e], bookingDate:"2026-10-08"}`; Cancel sends nothing; a failure → toast "Couldn't save the booking." | `web/features/bookings/components/bookings-view.ac.test.tsx` | T2 |
| AC-11 | Picking 1 Sep – 9 Oct and **Submit** sets `?from=2026-09-01&to=2026-10-09` and requests that range; submitting 1–9 Oct again clears both; `?from=2026-10-05&to=2026-10-01` shows the default range; no logs → "No logs in this range"; an error → "Couldn't load the bookings." with **Retry** | `web/features/bookings/components/bookings-view.ac.test.tsx` | T2 |
| AC-12 | The sidebar's **Time** section lists Logs (`/app/time`), then Bookings (`/app/bookings`), and every app route is linked once | `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ac.test.ts` | T2 |
| AC-13 | The build has the page `/app/bookings` | `check` | T2 |

Typed stubs (created with the tests, so lint and typecheck pass while the tests fail):
- `web/features/bookings/api.ts`: the exports above, hooks throwing `new Error("not implemented (feat-book-web)")` (`bookingKeys` and the type re-export real).
- `web/features/bookings/components/bookings-view.tsx`: `BookingsView`, its body `throw new Error("not implemented (feat-book-web)")`.

## Checks
```bash
# AC-13: the build has the bookings page
test -f web/out/app/bookings.html
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Booking hooks (`features/bookings/api.ts`) | web | S | haiku | Copies `features/time/api.ts`; the keys, URLs and invalidation are stated | — (feat-book-api, feat-tlog-web done) |
| T2 | Bookings page: range in the URL, day sections with the collapsible table, booking cell, Book all, route and sidebar link | web | L | sonnet | A table whose columns change with the expanded state, an inline editor per row and URL state | T1 |

## Open questions
None.

## Changelog
- 2026-10-09: Initial draft from the owner's Bookings screen (OQ-122…OQ-125). Ready for review.
