import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import type { components } from "@/lib/api/schema";
import type { Ref } from "@/features/time/types";
import { formatWorkDate } from "@/lib/time";

/** A time log with its booking date (API-BOOK-001). */
export type BookingLog = components["schemas"]["BookingLogResponseDto"];

export interface DateRange {
  from: string;
  to: string;
}

export type GroupKind = "project" | "unsorted" | "nonprod";

/** !excludeFromStats && project !== null (a deleted project too). */
export function isBookable(
  log: Pick<BookingLog, "excludeFromStats" | "project">
): boolean {
  return !log.excludeFromStats && log.project !== null;
}

/** One log row of a day: its own log, or one worked on another day and booked to this one (`incoming`). */
export interface BookingEntry {
  log: BookingLog;
  worked: number;
  booked: number;
  incoming: boolean;
}

export interface BookingGroup {
  key: string;
  kind: GroupKind;
  project: Ref | null;
  worked: number;
  booked: number;
  entries: BookingEntry[];
  /** Ids of the day's own bookable logs with no booking (project groups only): what **Book all** books. */
  unbookedIds: string[];
}

export interface BookingDay {
  workDate: string;
  logged: number;
  billable: number;
  overtime: number;
  bookedCurrent: number;
  bookedExternal: number;
  bookedTotal: number;
  groups: BookingGroup[];
}

/** Excluded → Non-prod, no project → Unsorted, else the project (a deleted one keyed by its title). */
function groupKeyOf(
  log: BookingLog
): Pick<BookingGroup, "key" | "kind" | "project"> {
  if (log.excludeFromStats)
    return { key: "nonprod", kind: "nonprod", project: null };
  if (!log.project) return { key: "unsorted", kind: "unsorted", project: null };
  return {
    key: log.project.id ?? `deleted:${log.project.title}`,
    kind: "project",
    project: log.project
  };
}

function bookingDay(
  workDate: string,
  logs: BookingLog[],
  targetMinutes: number
): BookingDay {
  const bookedHere = (log: BookingLog) =>
    isBookable(log) && log.bookingDate === workDate;
  const own = logs.filter((l) => l.workDate === workDate);
  const incoming = logs.filter((l) => l.workDate !== workDate && bookedHere(l));

  const groups = new Map<string, BookingGroup>();
  const groupOf = (log: BookingLog) => {
    const id = groupKeyOf(log);
    let group = groups.get(id.key);
    if (!group) {
      group = { ...id, worked: 0, booked: 0, entries: [], unbookedIds: [] };
      groups.set(id.key, group);
    }
    return group;
  };

  for (const log of own) {
    const group = groupOf(log);
    const booked = bookedHere(log) ? log.durationMinutes : 0;
    group.entries.push({
      log,
      worked: log.durationMinutes,
      booked,
      incoming: false
    });
    group.worked += log.durationMinutes;
    group.booked += booked;
    if (group.kind === "project" && log.bookingDate === null)
      group.unbookedIds.push(log.id);
  }
  for (const log of incoming) {
    const group = groupOf(log);
    group.entries.push({
      log,
      worked: 0,
      booked: log.durationMinutes,
      incoming: true
    });
    group.booked += log.durationMinutes;
  }

  const sum = (list: BookingLog[]) =>
    list.reduce((total, l) => total + l.durationMinutes, 0);
  const billable = sum(own.filter((l) => !l.excludeFromStats));
  const bookedCurrent = sum(own.filter(bookedHere));
  const bookedExternal = sum(incoming);
  const all = [...groups.values()];
  return {
    workDate,
    logged: sum(own),
    billable,
    overtime: Math.max(0, billable - targetMinutes),
    bookedCurrent,
    bookedExternal,
    bookedTotal: bookedCurrent + bookedExternal,
    groups: [
      // Array.prototype.sort is stable: ties keep their first appearance.
      ...all
        .filter((g) => g.kind === "project")
        .sort((a, b) => b.worked - a.worked),
      ...all.filter((g) => g.kind === "unsorted"),
      ...all.filter((g) => g.kind === "nonprod")
    ]
  };
}

/**
 * The listed days of a range, oldest first (FR-BOOK-001…003): each date in the range that is a log's
 * work date, or the booking date of a bookable log worked on another day. `logs` in API order.
 */
export function bookingDays(
  logs: BookingLog[],
  range: DateRange,
  targetMinutes: number
): BookingDay[] {
  const inRange = (date: string) => date >= range.from && date <= range.to;
  const dates = new Set<string>();
  for (const log of logs) {
    if (inRange(log.workDate)) dates.add(log.workDate);
    if (
      isBookable(log) &&
      log.bookingDate !== null &&
      log.bookingDate !== log.workDate &&
      inRange(log.bookingDate)
    )
      dates.add(log.bookingDate);
  }
  return [...dates].sort().map((date) => bookingDay(date, logs, targetMinutes));
}

/** { from: the 1st of today's month, to: today } */
export function defaultRange(today: string): DateRange {
  return { from: `${today.slice(0, 8)}01`, to: today };
}

const isWorkDate = (value: string | null): value is string => {
  if (value === null || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parseISO(value);
  return isValid(date) && format(date, "yyyy-MM-dd") === value;
};

/** The longest range the page lists: to − from ≤ 366 days. */
export function isRangeTooLong(from: string, to: string): boolean {
  return differenceInCalendarDays(parseISO(to), parseISO(from)) > 366;
}

/** Real dates (YYYY-MM-DD), from ≤ to ≤ today, to − from ≤ 366 days → that range; anything else (also a missing one) → defaultRange(today). */
export function parseRange(
  from: string | null,
  to: string | null,
  today: string
): DateRange {
  if (
    isWorkDate(from) &&
    isWorkDate(to) &&
    from <= to &&
    to <= today &&
    !isRangeTooLong(from, to)
  )
    return { from, to };
  return defaultRange(today);
}

/** Same year and month → "October 2026"; else "1 Sep 2026 – 9 Oct 2026" (formatWorkDate, an en dash with spaces). */
export function rangeLabel(range: DateRange): string {
  return range.from.slice(0, 7) === range.to.slice(0, 7)
    ? format(parseISO(range.from), "MMMM yyyy")
    : `${formatWorkDate(range.from)} – ${formatWorkDate(range.to)}`;
}
