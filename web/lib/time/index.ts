import { TZDate } from "@date-fns/tz";
import { format, parseISO } from "date-fns";

const DATE_FORMAT = "yyyy-MM-dd";

/**
 * Today's date (`YYYY-MM-DD`) as seen in `tz`, computed from the wall clock
 * in that time zone (never `new Date().toISOString().split("T")[0]`, which
 * reads the UTC date and is wrong near midnight — conventions.md).
 */
export function today(tz: string): string {
  return format(new TZDate(new Date(), tz), DATE_FORMAT);
}

/**
 * The first and last day (`YYYY-MM-DD`, inclusive) of the calendar month
 * containing `date`.
 *
 * Work dates are plain `YYYY-MM-DD` calendar strings (conventions.md), not
 * instants, so this is pure calendar arithmetic: `tz` is accepted for API
 * symmetry with `today()` but is not needed here. Converting a date-only
 * string to an instant and back through a time-zone offset is exactly the
 * kind of round trip that can shift the calendar day near midnight, so this
 * function deliberately avoids it.
 */
export function monthRange(
  date: string,
  tz: string
): { from: string; to: string } {
  void tz;

  const [yearStr, monthStr] = date.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr); // 1-indexed

  const pad = (n: number) => String(n).padStart(2, "0");
  // Day 0 of next month == last day of this month (UTC arithmetic never
  // observes a local time zone, so this is DST-safe by construction).
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return {
    from: `${yearStr}-${monthStr}-01`,
    to: `${yearStr}-${monthStr}-${pad(lastDay)}`
  };
}

/** Formats a duration in minutes as e.g. "1h 15m", "45m" or "2h". */
export function formatDuration(minutes: number): string {
  const sign = minutes < 0 ? "-" : "";
  const total = Math.abs(Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;

  if (h === 0) return `${sign}${m}m`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}m`;
}

/**
 * Parses a duration string (e.g. "1h 15m") into minutes.
 * TODO(M4): implement once the time-log form needs it.
 */
export function parseDuration(value: string): number {
  void value;
  throw new Error("not implemented (M4)");
}

/** An ISO instant as a calendar date in `tz`: formatDate("2026-10-02T22:30:00.000Z", "Europe/Zagreb") → "3 October 2026". */
export function formatDate(iso: string, tz: string): string {
  return format(new TZDate(iso, tz), "d MMMM yyyy");
}

/** An ISO instant as a short date in `tz`: formatShortDate("2026-10-02T22:30:00.000Z", "Europe/Zagreb") → "3 Oct 2026". */
export function formatShortDate(iso: string, tz: string): string {
  return format(new TZDate(iso, tz), "d MMM yyyy");
}

/** An ISO instant as a date and time in `tz`: formatDateTime("2026-10-02T22:30:00.000Z", "Europe/Zagreb") → "3 October 2026, 00:30". */
export function formatDateTime(iso: string, tz: string): string {
  return format(new TZDate(iso, tz), "d MMMM yyyy, HH:mm");
}

/** A work date (`YYYY-MM-DD`) as a short date: formatWorkDate("2026-10-03") → "3 Oct 2026". Calendar string in, no time zone. */
export function formatWorkDate(date: string): string {
  return format(parseISO(date), "d MMM yyyy");
}
