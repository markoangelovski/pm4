import {
  addDays,
  differenceInCalendarDays,
  format,
  isValid,
  isWeekend,
  parseISO,
  subMonths
} from "date-fns";
import { formatWorkDate } from "@/lib/time";

/** Dates are `YYYY-MM-DD` calendar strings; no time zone arithmetic. */
export interface DateRange {
  from: string;
  to: string;
}

export const RANGE_PRESETS = [
  "this-month",
  "last-month",
  "today",
  "last-7",
  "last-30",
  "last-90",
  "this-year"
] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

/** Statistics' presets: So far (the default) first, then the shared presets. Notes and Bookings use RANGE_PRESETS. */
export const STATS_PRESETS = ["so-far", ...RANGE_PRESETS] as const;
export type StatsPreset = (typeof STATS_PRESETS)[number];

export const PRESET_LABELS: Record<StatsPreset, string> = {
  "so-far": "So far",
  "this-month": "This month",
  "last-month": "Last month",
  today: "Today",
  "last-7": "Last 7 days",
  "last-30": "Last 30 days",
  "last-90": "Last 90 days",
  "this-year": "This year"
};

/** The longest range: to − from ≤ 366 days. */
export const MAX_RANGE_DAYS = 366;

const iso = (d: Date) => format(d, "yyyy-MM-dd");
const shift = (date: string, days: number) =>
  iso(addDays(parseISO(date), days));

/** The 1st to the last day of the month containing `date`. */
function monthOf(date: string): DateRange {
  const [year, month] = date.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    from: `${date.slice(0, 8)}01`,
    to: `${date.slice(0, 8)}${String(last).padStart(2, "0")}`
  };
}

/** so-far: the 1st of today's month..today; this-month: 1st–last of today's month; last-month: the previous month; today: today..today; last-7/30/90: today−6/29/89..today; this-year: 1 Jan..today. */
export function presetRange(preset: StatsPreset, today: string): DateRange {
  switch (preset) {
    case "so-far":
      return { from: `${today.slice(0, 8)}01`, to: today };
    case "this-month":
      return monthOf(today);
    case "last-month":
      return monthOf(iso(subMonths(parseISO(`${today.slice(0, 8)}01`), 1)));
    case "today":
      return { from: today, to: today };
    case "last-7":
      return { from: shift(today, -6), to: today };
    case "last-30":
      return { from: shift(today, -29), to: today };
    case "last-90":
      return { from: shift(today, -89), to: today };
    case "this-year":
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
  }
}

/** The first of `presets` a range equals, or null for a custom range. */
export function matchPreset(
  range: DateRange,
  today: string,
  presets: readonly StatsPreset[] = RANGE_PRESETS
): StatsPreset | null {
  return (
    presets.find((p) => {
      const r = presetRange(p, today);
      return r.from === range.from && r.to === range.to;
    }) ?? null
  );
}

/** to − from > 366 days. */
export function isRangeTooLong(range: DateRange): boolean {
  return (
    differenceInCalendarDays(parseISO(range.to), parseISO(range.from)) >
    MAX_RANGE_DAYS
  );
}

const isWorkDate = (value: string | null): value is string => {
  if (value === null || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parseISO(value);
  return isValid(date) && format(date, "yyyy-MM-dd") === value;
};

/** Real dates, from ≤ to, not too long → that range; anything else (also a missing value) → presetRange(fallback, today). Future dates are allowed. */
export function parseRange(
  from: string | null,
  to: string | null,
  today: string,
  fallback: StatsPreset = "this-month"
): DateRange {
  if (isWorkDate(from) && isWorkDate(to) && from <= to) {
    const range = { from, to };
    if (!isRangeTooLong(range)) return range;
  }
  return presetRange(fallback, today);
}

/** Every calendar day of the range, oldest first. */
export function eachDay({ from, to }: DateRange): string[] {
  const n = differenceInCalendarDays(parseISO(to), parseISO(from));
  return Array.from({ length: n + 1 }, (_, i) => shift(from, i));
}

/** 1st to last day of one month → "October 2026"; else "1 Sep 2026 – 9 Oct 2026". */
export function rangeLabel(range: DateRange): string {
  const month = monthOf(range.from);
  if (month.from === range.from && month.to === range.to)
    return format(parseISO(range.from), "MMMM yyyy");
  return `${formatWorkDate(range.from)} – ${formatWorkDate(range.to)}`;
}

/** Monday–Friday dates of the range that are ≤ today. */
export function weekdaysSoFar(range: DateRange, today: string): number {
  return eachDay(range).filter((d) => d <= today && !isWeekend(parseISO(d)))
    .length;
}
