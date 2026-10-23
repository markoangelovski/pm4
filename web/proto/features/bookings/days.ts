import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import type { Ref } from "@/proto/features/time/types";
import { formatWorkDate } from "@/lib/time";
import type { BookingDto, BookingLogResponseDto } from "./proposed-types";

/** A time log with its bookings (API-BOOK-001). */
export type BookingLog = BookingLogResponseDto;
export type { BookingDto } from "./proposed-types";

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

/** Minutes of the log booked to any date (0 for a log that can't be booked). */
export function bookedMinutes(log: BookingLog): number {
  if (!isBookable(log)) return 0;
  return log.bookings.reduce((total, b) => total + b.minutes, 0);
}

/** Minutes of a bookable log that aren't booked yet (0 for a log that can't be booked). */
export function unbookedMinutes(log: BookingLog): number {
  return isBookable(log) ? log.durationMinutes - bookedMinutes(log) : 0;
}

/** `bookings` with `minutes` more on `date` (one booking per date), by date ascending. */
export function addBooking(
  bookings: BookingDto[],
  date: string,
  minutes: number
): BookingDto[] {
  const same = bookings.find((b) => b.date === date);
  const rest = bookings.filter((b) => b.date !== date);
  return [...rest, { date, minutes: (same?.minutes ?? 0) + minutes }].sort(
    (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)
  );
}

/** `bookings` without the one on `date`. */
export function removeBooking(
  bookings: BookingDto[],
  date: string
): BookingDto[] {
  return bookings.filter((b) => b.date !== date);
}

/**
 * One log row of a day. A day's own bookable log has one row per booking (whatever its date) and, while part of it
 * is unbooked, one more row for that part (`booking` null). A log that can't be booked has one row. A log worked on
 * another day with a booking to this one has one row for that booking (`incoming`).
 */
export interface BookingEntry {
  log: BookingLog;
  /** The booking the row shows; null on the unbooked row (and on a log that can't be booked). */
  booking: BookingDto | null;
  /** The row's minutes: the booking's, or the log's unbooked minutes (its duration if it can't be booked). */
  minutes: number;
  /** The log's first row of the day: it shows the task, the text and the hours worked. */
  first: boolean;
  /** The log's last row of the day. */
  last: boolean;
  /** The log's duration on its first own row, else 0. */
  worked: number;
  /** The booking's minutes when it is booked to this day, else 0. */
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
  /** The day's own bookable logs with unbooked minutes (project groups only): what **Book all** books. */
  unbooked: BookingLog[];
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

/** The rows of one of the day's own logs: its bookings by date, then its unbooked part. */
function ownEntries(log: BookingLog, workDate: string): BookingEntry[] {
  const parts: { booking: BookingDto | null; minutes: number }[] = isBookable(
    log
  )
    ? log.bookings.map((b) => ({ booking: b, minutes: b.minutes }))
    : [];
  const rest = isBookable(log) ? unbookedMinutes(log) : log.durationMinutes;
  if (rest > 0) parts.push({ booking: null, minutes: rest });
  return parts.map((p, i) => ({
    log,
    booking: p.booking,
    minutes: p.minutes,
    first: i === 0,
    last: i === parts.length - 1,
    worked: i === 0 ? log.durationMinutes : 0,
    booked: p.booking?.date === workDate ? p.minutes : 0,
    incoming: false
  }));
}

function bookingDay(
  workDate: string,
  logs: BookingLog[],
  targetMinutes: number
): BookingDay {
  const bookingHere = (log: BookingLog) =>
    isBookable(log) ? log.bookings.find((b) => b.date === workDate) : undefined;
  const own = logs.filter((l) => l.workDate === workDate);
  const incoming = logs.filter(
    (l) => l.workDate !== workDate && bookingHere(l)
  );

  const groups = new Map<string, BookingGroup>();
  const groupOf = (log: BookingLog) => {
    const id = groupKeyOf(log);
    let group = groups.get(id.key);
    if (!group) {
      group = { ...id, worked: 0, booked: 0, entries: [], unbooked: [] };
      groups.set(id.key, group);
    }
    return group;
  };

  for (const log of own) {
    const group = groupOf(log);
    const entries = ownEntries(log, workDate);
    group.entries.push(...entries);
    group.worked += log.durationMinutes;
    group.booked += entries.reduce((t, e) => t + e.booked, 0);
    if (group.kind === "project" && unbookedMinutes(log) > 0)
      group.unbooked.push(log);
  }
  for (const log of incoming) {
    const group = groupOf(log);
    const booking = bookingHere(log)!;
    group.entries.push({
      log,
      booking,
      minutes: booking.minutes,
      first: true,
      last: true,
      worked: 0,
      booked: booking.minutes,
      incoming: true
    });
    group.booked += booking.minutes;
  }

  const sum = (list: BookingLog[]) =>
    list.reduce((total, l) => total + l.durationMinutes, 0);
  const bookedHere = (list: BookingLog[]) =>
    list.reduce((total, l) => total + (bookingHere(l)?.minutes ?? 0), 0);
  const billable = sum(own.filter((l) => !l.excludeFromStats));
  const bookedCurrent = bookedHere(own);
  const bookedExternal = bookedHere(incoming);
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
 * work date, or a booking date of a bookable log worked on another day. `logs` in API order.
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
    if (!isBookable(log)) continue;
    for (const b of log.bookings)
      if (b.date !== log.workDate && inRange(b.date)) dates.add(b.date);
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
