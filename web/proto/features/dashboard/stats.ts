import { endOfISOWeek, format, parseISO, startOfISOWeek } from "date-fns";
import { isBookable } from "@/proto/features/bookings/month";
import type { TimeLog } from "@/proto/features/time/types";

/** One calendar day of the range. A workday is a day with a start time. */
export interface DayStat {
  workDate: string;
  startMinute: number | null;
  /** Every log of the day (Logs' "Logged"). */
  worked: number;
  /** Logs of the day that have a booking date, whatever that date is. */
  booked: number;
}

const isBooked = (log: TimeLog, bookings: Record<string, string>) =>
  isBookable(log) && !!bookings[log.id];

export function dayStats(
  days: string[],
  logs: TimeLog[],
  starts: Record<string, number>,
  bookings: Record<string, string>
): DayStat[] {
  const byDate = new Map<string, DayStat>(
    days.map((d) => [
      d,
      { workDate: d, startMinute: starts[d] ?? null, worked: 0, booked: 0 }
    ])
  );
  for (const log of logs) {
    const day = byDate.get(log.workDate);
    if (!day) continue;
    day.worked += log.durationMinutes;
    if (isBooked(log, bookings)) day.booked += log.durationMinutes;
  }
  return [...byDate.values()];
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
  /** Daily target for a day bar (even on a day off, for the reference line); workdays × target for a week. */
  target: number;
  workdays: number;
}

/** Days up to 62 → a bar per day; longer → a bar per ISO week (start = the week's average). */
export function buckets(
  days: DayStat[],
  targetMinutes: number
): { by: "day" | "week"; items: Bucket[] } {
  if (days.length <= 62) {
    const oneMonth =
      days[0]?.workDate.slice(0, 7) === days.at(-1)?.workDate.slice(0, 7);
    return {
      by: "day",
      items: days.map((d) => ({
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

/** Cumulative worked, booked and target per day; null after `today`, so the lines stop at today. */
export function running(
  days: DayStat[],
  targetMinutes: number,
  today: string
): RunningPoint[] {
  let worked = 0,
    booked = 0,
    target = 0;
  return days.map((d) => {
    worked += d.worked;
    booked += d.booked;
    if (d.startMinute !== null) target += targetMinutes;
    const future = d.workDate > today;
    return {
      workDate: d.workDate,
      tick: format(parseISO(d.workDate), "d MMM"),
      worked: future ? null : worked,
      booked: future ? null : booked,
      target: future ? null : target
    };
  });
}

export interface ProjectShare {
  key: string;
  projectId: string | null;
  title: string;
  kind: "project" | "unsorted" | "nonprod";
  worked: number;
  booked: number;
}

/** Worked and booked minutes per project, biggest first; then "Unsorted" (no project) and "Non-prod" (excluded from statistics). */
export function byProject(
  logs: TimeLog[],
  bookings: Record<string, string>
): ProjectShare[] {
  const rows = new Map<string, ProjectShare>();
  for (const log of logs) {
    const kind = log.excludeFromStats
      ? "nonprod"
      : log.project
        ? "project"
        : "unsorted";
    const key =
      kind === "project"
        ? (log.project!.id ?? `deleted:${log.project!.title}`)
        : kind;
    let row = rows.get(key);
    if (!row) {
      row = {
        key,
        kind,
        worked: 0,
        booked: 0,
        projectId: kind === "project" ? log.project!.id : null,
        title:
          kind === "project"
            ? log.project!.title
            : kind === "unsorted"
              ? "Unsorted"
              : "Non-prod"
      };
      rows.set(key, row);
    }
    row.worked += log.durationMinutes;
    if (isBooked(log, bookings)) row.booked += log.durationMinutes;
  }
  const all = [...rows.values()];
  return [
    ...all
      .filter((r) => r.kind === "project")
      .sort((a, b) => b.worked - a.worked),
    ...all.filter((r) => r.kind === "unsorted"),
    ...all.filter((r) => r.kind === "nonprod")
  ];
}

/** Axis ticks in minutes at whole, round hour steps (1, 2, 4, 5, 10, 20, 25, 50…h), at most ~5 intervals, covering `maxMinutes`. */
export function hourTicks(maxMinutes: number): number[] {
  const maxH = Math.max(1, maxMinutes / 60);
  const step =
    [1, 2, 4, 5, 10, 20, 25, 50, 100, 200, 250, 500].find(
      (s) => maxH / s <= 5
    ) ?? 1000;
  const top = Math.ceil(maxH / step) * step;
  return Array.from({ length: top / step + 1 }, (_, i) => i * step * 60);
}
