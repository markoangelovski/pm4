import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfYear,
  subMonths
} from "date-fns";
import { formatWorkDate, monthRange } from "@/lib/time";

export interface DateRange {
  from: string;
  to: string;
}

export const RANGE_PRESETS = [
  "this-month",
  "last-month",
  "last-7",
  "last-30",
  "last-90",
  "this-year"
] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

export const PRESET_LABELS: Record<RangePreset, string> = {
  "this-month": "This month",
  "last-month": "Last month",
  "last-7": "Last 7 days",
  "last-30": "Last 30 days",
  "last-90": "Last 90 days",
  "this-year": "This year"
};

const iso = (d: Date) => format(d, "yyyy-MM-dd");
const shift = (date: string, days: number) =>
  iso(addDays(parseISO(date), days));

/** The range of a preset, as calendar strings relative to `today` (`YYYY-MM-DD`). "This month" runs to the month's last day. */
export function presetRange(
  preset: RangePreset,
  today: string,
  tz: string
): DateRange {
  switch (preset) {
    case "this-month":
      return monthRange(today, tz);
    case "last-month":
      return monthRange(iso(subMonths(parseISO(today), 1)), tz);
    case "last-7":
      return { from: shift(today, -6), to: today };
    case "last-30":
      return { from: shift(today, -29), to: today };
    case "last-90":
      return { from: shift(today, -89), to: today };
    case "this-year":
      return { from: iso(startOfYear(parseISO(today))), to: today };
  }
}

/** The preset a range matches, or null for a custom range. */
export function matchPreset(
  range: DateRange,
  today: string,
  tz: string
): RangePreset | null {
  return (
    RANGE_PRESETS.find((p) => {
      const r = presetRange(p, today, tz);
      return r.from === range.from && r.to === range.to;
    }) ?? null
  );
}

/** Every calendar day of the range, oldest first. */
export function eachDay({ from, to }: DateRange): string[] {
  const n = differenceInCalendarDays(parseISO(to), parseISO(from));
  return Array.from({ length: n + 1 }, (_, i) => shift(from, i));
}

/** "October 2026" for a whole month, otherwise "1 Sep 2026 – 9 Oct 2026". */
export function rangeLabel(range: DateRange, tz: string): string {
  const month = monthRange(range.from, tz);
  if (month.from === range.from && month.to === range.to)
    return format(parseISO(range.from), "MMMM yyyy");
  return `${formatWorkDate(range.from)} – ${formatWorkDate(range.to)}`;
}
