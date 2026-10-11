import type { TimeLog } from "@/proto/features/time/types";

export type GroupKind = "project" | "unsorted" | "nonprod";

/** One table row: a project of the day (with its logs as `subRows`) or one of its logs. */
export interface BookingRow {
  id: string;
  group: GroupKind;
  projectId: string | null;
  project: string;
  tasks: string[];
  minutes: number;
  booked: number;
  log?: TimeLog;
  /** The date this log is booked to, or null (log rows only). */
  bookingDate?: string | null;
  /** Set on a log worked on another day and booked to this one: shown here, editable only from its own day. */
  incomingFrom?: string;
  subRows?: BookingRow[];
}

export interface DayFigures {
  workDate: string;
  logged: number;
  billable: number;
  overtime: number;
  /** Minutes of this day's own logs booked to this day. */
  bookedCurrent: number;
  /** Minutes of other days' logs booked to this day. */
  bookedExternal: number;
  projects: BookingRow[];
}

/** Only logs of a project (or task) that are not excluded from statistics can be booked. */
export const isBookable = (log: TimeLog) =>
  !log.excludeFromStats && !!log.project;

/**
 * The days to show, oldest first: those with logs in the range, plus those in the range that
 * another day's log is booked to. `allLogs` is every log (incoming bookings may come from outside the range).
 */
export function daysWithLogs(
  rangeLogs: TimeLog[],
  allLogs: TimeLog[],
  range: { from: string; to: string },
  targetMinutes: number,
  bookings: Record<string, string>
): DayFigures[] {
  const dates = new Set(rangeLogs.map((l) => l.workDate));
  for (const l of allLogs) {
    const b = bookings[l.id];
    if (b && isBookable(l) && b >= range.from && b <= range.to) dates.add(b);
  }
  return [...dates]
    .sort()
    .map((d) => dayFigures(d, rangeLogs, allLogs, targetMinutes, bookings));
}

const SPECIAL = ["unsorted", "nonprod"];

/** Logs excluded from statistics are Non-prod, logs without a project are Un-sorted, the rest group by project. */
function groupOf(log: TimeLog): {
  kind: GroupKind;
  key: string;
  title: string;
  projectId: string | null;
} {
  if (log.excludeFromStats)
    return {
      kind: "nonprod",
      key: "nonprod",
      title: "Non-prod",
      projectId: null
    };
  if (!log.project)
    return {
      kind: "unsorted",
      key: "unsorted",
      title: "Un-sorted",
      projectId: null
    };
  return {
    kind: "project",
    key: log.project.id ?? `deleted:${log.project.title}`,
    title: log.project.title,
    projectId: log.project.id
  };
}

/** Prototype figures for one day. Billable = not excluded from statistics; overtime = billable over the daily target; booked current/external/total = minutes booked to this date from this day's / other days' / all logs. */
function dayFigures(
  workDate: string,
  rangeLogs: TimeLog[],
  allLogs: TimeLog[],
  targetMinutes: number,
  bookings: Record<string, string>
): DayFigures {
  const dayLogs = rangeLogs.filter((l) => l.workDate === workDate);
  const incoming = allLogs.filter(
    (l) =>
      l.workDate !== workDate && isBookable(l) && bookings[l.id] === workDate
  );
  const logged = dayLogs.reduce((t, l) => t + l.durationMinutes, 0);
  const billable = dayLogs.reduce(
    (t, l) => (l.excludeFromStats ? t : t + l.durationMinutes),
    0
  );
  const rows = new Map<string, BookingRow>();
  const rowFor = (log: TimeLog) => {
    const group = groupOf(log);
    let row = rows.get(group.key);
    if (!row) {
      row = {
        id: `${workDate}:${group.key}`,
        group: group.kind,
        projectId: group.projectId,
        project: group.title,
        tasks: [],
        minutes: 0,
        booked: 0,
        subRows: []
      };
      rows.set(group.key, row);
    }
    if (log.task && !row.tasks.includes(log.task.title))
      row.tasks.push(log.task.title);
    return row;
  };
  for (const log of dayLogs) {
    const row = rowFor(log);
    const bookingDate = isBookable(log) ? (bookings[log.id] ?? null) : null;
    const booked = bookingDate ? log.durationMinutes : 0;
    row.minutes += log.durationMinutes;
    row.booked += booked;
    row.subRows!.push({
      id: log.id,
      group: row.group,
      projectId: row.projectId,
      project: row.project,
      tasks: [],
      minutes: log.durationMinutes,
      booked,
      log,
      bookingDate
    });
  }
  for (const log of incoming) {
    const row = rowFor(log);
    row.booked += log.durationMinutes;
    row.subRows!.push({
      id: `${workDate}:in:${log.id}`,
      group: row.group,
      projectId: row.projectId,
      project: row.project,
      tasks: [],
      minutes: 0,
      booked: log.durationMinutes,
      log,
      bookingDate: workDate,
      incomingFrom: log.workDate
    });
  }
  return {
    workDate,
    logged,
    billable,
    overtime: Math.max(0, billable - targetMinutes),
    bookedCurrent: dayLogs.reduce(
      (t, l) =>
        isBookable(l) && bookings[l.id] === workDate
          ? t + l.durationMinutes
          : t,
      0
    ),
    bookedExternal: incoming.reduce((t, l) => t + l.durationMinutes, 0),
    projects: [
      ...[...rows.values()]
        .filter((r) => !SPECIAL.includes(r.id.slice(workDate.length + 1)))
        .sort((a, b) => b.minutes - a.minutes),
      ...SPECIAL.flatMap((k) => rows.get(k) ?? [])
    ]
  };
}
