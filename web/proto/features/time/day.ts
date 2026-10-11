import { formatClock } from "@/lib/time/clock";
import type { DayView, TimeLog } from "./types";

export interface DayFigures {
  start: string | null;
  logged: number;
  startPlusLogged: string | null;
  unlogged: number | null;
  billable: number;
  percentBillable: number;
  overtime: number;
}

/** logged = all logs; billable = logs without excludeFromStats; percentBillable = round(billable / target × 100) (0 when target is 0);
 *  overtime = max(0, billable − target); unlogged only when nowMinute !== null (today), start set, and nowMinute − (start + logged) > 0. */
export function dayFigures(
  startMinute: number | null,
  logs: TimeLog[],
  nowMinute: number | null,
  targetMinutes: number
): DayFigures {
  const logged = logs.reduce((sum, l) => sum + l.durationMinutes, 0);
  const billable = logs.reduce(
    (sum, l) => (l.excludeFromStats ? sum : sum + l.durationMinutes),
    0
  );
  const stats = {
    logged,
    billable,
    percentBillable:
      targetMinutes > 0 ? Math.round((billable / targetMinutes) * 100) : 0,
    overtime: Math.max(0, billable - targetMinutes)
  };
  if (startMinute === null) {
    return { start: null, startPlusLogged: null, unlogged: null, ...stats };
  }
  const end = startMinute + logged;
  const gap = nowMinute === null ? 0 : nowMinute - end;
  return {
    start: formatClock(startMinute),
    startPlusLogged: formatClock(end),
    unlogged: gap > 0 ? gap : null,
    ...stats
  };
}

export interface LogGroup {
  key: string;
  project: string | null;
  task: string | null;
  totalMinutes: number;
  logs: TimeLog[];
}

const refKey = (ref: { id: string | null; title: string }) =>
  ref.id ?? `deleted:${ref.title}`;

/** First-appearance order of the project (or task) ref; then key "unsorted" (no ref, not excluded); then key "nonprod" (excludeFromStats,
 *  whatever the ref). A group's key is ref.id ?? `deleted:${title}`; for by "task", `project` is the log's project title. */
export function groupLogs(logs: TimeLog[], by: "project" | "task"): LogGroup[] {
  const groups = new Map<string, LogGroup>();
  let unsorted: LogGroup | null = null;
  let nonProd: LogGroup | null = null;
  for (const log of logs) {
    const ref = log[by];
    let group: LogGroup;
    if (log.excludeFromStats) {
      nonProd ??= {
        key: "nonprod",
        project: null,
        task: null,
        totalMinutes: 0,
        logs: []
      };
      group = nonProd;
    } else if (!ref) {
      unsorted ??= {
        key: "unsorted",
        project: null,
        task: null,
        totalMinutes: 0,
        logs: []
      };
      group = unsorted;
    } else {
      const key = refKey(ref);
      let existing = groups.get(key);
      if (!existing) {
        existing = {
          key,
          project: by === "task" ? (log.project?.title ?? null) : ref.title,
          task: by === "task" ? ref.title : null,
          totalMinutes: 0,
          logs: []
        };
        groups.set(key, existing);
      }
      group = existing;
    }
    group.totalMinutes += log.durationMinutes;
    group.logs.push(log);
  }
  return [
    ...groups.values(),
    ...(unsorted ? [unsorted] : []),
    ...(nonProd ? [nonProd] : [])
  ];
}

/** What a row shows (FR-TLOG-003/015): sequential → all; else title = !log[view], project = group is "unsorted" or "nonprod",
 *  task = view === "project" || group is "nonprod". */
export function rowFields(
  log: TimeLog,
  view: DayView,
  groupKey: string | null
): { title: boolean; project: boolean; task: boolean } {
  if (view === "sequential") return { title: true, project: true, task: true };
  const loose = groupKey === "unsorted" || groupKey === "nonprod";
  return {
    title: !log[view],
    project: loose,
    task: view === "project" || groupKey === "nonprod"
  };
}

export interface PieSlice {
  key: string;
  label: string;
  minutes: number;
  kind: "log" | "remaining";
}

/** One slice per log in order (key = log id, label = [project, task, text] present parts joined by " - "),
 *  then { key "remaining", label "Remaining" } of target − all logged when positive. */
export function pieSlices(logs: TimeLog[], targetMinutes: number): PieSlice[] {
  const slices: PieSlice[] = logs.map((l) => ({
    key: l.id,
    label: [l.project?.title, l.task?.title, l.text]
      .filter(Boolean)
      .join(" - "),
    minutes: l.durationMinutes,
    kind: "log"
  }));
  const remaining = targetMinutes - slices.reduce((s, x) => s + x.minutes, 0);
  if (remaining > 0) {
    slices.push({
      key: "remaining",
      label: "Remaining",
      minutes: remaining,
      kind: "remaining"
    });
  }
  return slices;
}

export interface Bar {
  key: string;
  label: string;
  minutes: number;
}

/** One bar per groupLogs(logs, by) group: "Project · Task" for by "task", the project for by "project", "Unsorted", "Non-prod". */
export function barBars(logs: TimeLog[], by: "project" | "task"): Bar[] {
  return groupLogs(logs, by).map((g) => ({
    key: g.key,
    label:
      g.key === "unsorted"
        ? "Unsorted"
        : g.key === "nonprod"
          ? "Non-prod"
          : by === "task"
            ? `${g.project} · ${g.task}`
            : (g.project ?? ""),
    minutes: g.totalMinutes
  }));
}
