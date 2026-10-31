import {
  endOfISOWeek,
  format,
  isWeekend,
  parseISO,
  startOfISOWeek
} from "date-fns";
import type { components } from "@/lib/api/schema";
import { eachDay, type DateRange } from "./range";

/** API-RPT-001's response. */
export type DashboardReport =
  components["schemas"]["DashboardReportResponseDto"];
export type ReportDay = components["schemas"]["ReportDayDto"];
export type ReportProject = components["schemas"]["ReportProjectDto"];

/** One calendar day of the range. A workday is a day with a start time. */
export interface DayStat {
  workDate: string;
  startMinute: number | null;
  worked: number;
  booked: number;
}

/** One per date of the range, oldest first; a date missing from `days` → { startMinute: null, worked: 0, booked: 0 }. */
export function dayStats(range: DateRange, days: ReportDay[]): DayStat[] {
  const byDate = new Map(days.map((d) => [d.workDate, d]));
  return eachDay(range).map((workDate) => {
    const d = byDate.get(workDate);
    return {
      workDate,
      startMinute: d?.startMinute ?? null,
      worked: d?.workedMinutes ?? 0,
      booked: d?.bookedMinutes ?? 0
    };
  });
}

export interface Totals {
  worked: number;
  booked: number;
  /** Workdays × the daily target. */
  target: number;
  workdays: number;
  avgStart: number | null;
  earliestStart: number | null;
  latestStart: number | null;
}

/** workdays = days with a start; target = workdays × targetMinutes; avgStart = Math.round(mean of the starts). */
export function totals(days: DayStat[], targetMinutes: number): Totals {
  const starts = days.flatMap((d) =>
    d.startMinute === null ? [] : [d.startMinute]
  );
  return {
    worked: days.reduce((t, d) => t + d.worked, 0),
    booked: days.reduce((t, d) => t + d.booked, 0),
    target: starts.length * targetMinutes,
    workdays: starts.length,
    avgStart: starts.length
      ? Math.round(starts.reduce((t, m) => t + m, 0) / starts.length)
      : null,
    earliestStart: starts.length ? Math.min(...starts) : null,
    latestStart: starts.length ? Math.max(...starts) : null
  };
}

/** One bar of the workday chart: a day, or a Monday–Sunday week for long ranges. */
export interface Bucket {
  key: string;
  /** The day itself; a week's first day inside the range. */
  date: string;
  tick: string;
  title: string;
  startMinute: number | null;
  worked: number;
  booked: number;
  unbooked: number;
  /** The daily target for a day; workdays × the daily target for a week. */
  target: number;
  workdays: number;
}

/** Up to 62 days → one bar per day (a weekend day with no start and no work left out); longer → one per ISO week (start = the week's average). */
export function buckets(
  days: DayStat[],
  targetMinutes: number
): { by: "day" | "week"; items: Bucket[] } {
  if (days.length <= 62) {
    const oneMonth =
      days[0]?.workDate.slice(0, 7) === days.at(-1)?.workDate.slice(0, 7);
    return {
      by: "day",
      items: days
        .filter(
          (d) =>
            d.startMinute !== null ||
            d.worked > 0 ||
            !isWeekend(parseISO(d.workDate))
        )
        .map((d) => ({
          key: d.workDate,
          date: d.workDate,
          tick: format(parseISO(d.workDate), oneMonth ? "d" : "d MMM"),
          title: format(parseISO(d.workDate), "EEE, d MMM yyyy"),
          startMinute: d.startMinute,
          worked: d.worked,
          booked: d.booked,
          unbooked: d.worked - d.booked,
          target: targetMinutes,
          workdays: d.startMinute === null ? 0 : 1
        }))
    };
  }
  const weeks = new Map<string, DayStat[]>();
  for (const d of days) {
    const key = format(startOfISOWeek(parseISO(d.workDate)), "yyyy-MM-dd");
    weeks.set(key, [...(weeks.get(key) ?? []), d]);
  }
  return {
    by: "week",
    items: [...weeks].map(([key, ds]) => {
      const t = totals(ds, targetMinutes);
      return {
        key,
        date: ds[0].workDate,
        tick: format(parseISO(ds[0].workDate), "d MMM"),
        title: `Week of ${format(parseISO(key), "d MMM")} – ${format(endOfISOWeek(parseISO(key)), "d MMM yyyy")}`,
        startMinute: t.avgStart,
        worked: t.worked,
        booked: t.booked,
        unbooked: t.worked - t.booked,
        target: t.target,
        workdays: t.workdays
      };
    })
  };
}

export interface RunningPoint {
  workDate: string;
  tick: string;
  worked: number | null;
  booked: number | null;
  target: number | null;
}

/**
 * Cumulative worked, booked and target (+ targetMinutes per day with a start). Before today, one point per day with
 * time logged: days without logs are left out, so the lines have no flat stretches (a workday without logs still adds
 * to the target, on the next point). From today to the range's end, every weekday and any day with logs, as in the
 * Workdays chart, so the lines run flat to the end of the range.
 */
export function running(
  days: DayStat[],
  targetMinutes: number,
  today: string
): RunningPoint[] {
  let worked = 0;
  let booked = 0;
  let target = 0;
  return days.flatMap((d) => {
    worked += d.worked;
    booked += d.booked;
    if (d.startMinute !== null) target += targetMinutes;
    const shown =
      d.worked > 0 || (d.workDate >= today && !isWeekend(parseISO(d.workDate)));
    if (!shown) return [];
    return [
      {
        workDate: d.workDate,
        tick: format(parseISO(d.workDate), "d MMM"),
        worked,
        booked,
        target
      }
    ];
  });
}

/** Axis ticks in minutes at whole-hour steps (1, 2, 4, 5, 10, 20, 25, 50, 100, 200, 250, 500 h, else 1000), at most 5 intervals, from 0 to cover maxMinutes (at least 1 h). */
export function hourTicks(maxMinutes: number): number[] {
  const maxH = Math.max(1, maxMinutes / 60);
  const step =
    [1, 2, 4, 5, 10, 20, 25, 50, 100, 200, 250, 500].find(
      (s) => maxH / s <= 5
    ) ?? 1000;
  const top = Math.ceil(maxH / step) * step;
  return Array.from({ length: top / step + 1 }, (_, i) => i * step * 60);
}
