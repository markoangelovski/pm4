import { cut, formatDate } from "./pmspa-fields.js";
import type { RemoteEvent, RemoteLog } from "./pmspa-remote.js";

// The field mapping between PM4 time logs and PMSPA days (feat-int-time-api *Entity mapping*,
// req-integrations *Entity mapping → Time*): pure functions, no I/O. The prototype's engine is `web/proto/mock/pmspa.ts`.

/** The title of the event a day's logs excluded from statistics go to (OQ-168). */
export const NONPROD = "nonprod";

/** A PM4 log as a push reads it. */
export interface Pm4LogForPush {
  id: string;
  text: string;
  title: string | null;
  durationMinutes: number;
  excludeFromStats: boolean;
  booked: boolean;
  task: { id: string | null; title: string; deleted: boolean } | null;
  project: { id: string | null; title: string; deleted: boolean } | null;
}

/** The PM4 logs of a day that go to one PMSPA event (OQ-167, OQ-168). */
export interface PushGroup {
  key: string;
  title: string;
  taskId: string | null;
  projectId: string | null;
  logs: Pm4LogForPush[];
  note: string | null;
}

/** An event title that is "nonprod", ignoring case and surrounding spaces. */
export function isNonprod(eventTitle: string): boolean {
  return eventTitle.trim().toLowerCase() === NONPROD;
}

/** The event title of a log: its project's title, else its own title, else "Unsorted" (OQ-167). */
export function eventTitle(
  projectTitle: string | null,
  logTitle: string | null
): string {
  const t = projectTitle ?? (logTitle?.trim() || "Unsorted");
  return cut(t.length < 3 ? `${t} · Time` : t, 150);
}

/** A day's logs grouped into PMSPA events, in log order. */
export function groupDay(logs: Pm4LogForPush[]): PushGroup[] {
  const groups = new Map<string, PushGroup>();
  for (const l of logs) {
    // OQ-168: logs excluded from statistics all go to the day's "nonprod" event, without a task.
    const nonprod = l.excludeFromStats;
    const task =
      !nonprod && l.task?.id ? { id: l.task.id, title: l.task.title } : null;
    const project =
      !nonprod && l.project?.id
        ? { id: l.project.id, title: l.project.title }
        : null;
    const title = nonprod
      ? NONPROD
      : eventTitle(project?.title ?? null, l.title);
    const key = task
      ? `task:${task.id}`
      : project
        ? `project:${project.id}`
        : `unsorted:${title}`;
    const note =
      !nonprod && (l.project?.deleted || l.task?.deleted)
        ? `Deleted ${l.task?.deleted && project ? "task" : "project"} “${(l.task?.deleted ? l.task : l.project)!.title}”: pushed ${project ? `under ${project.title}` : "as Unsorted"}.`
        : null;
    const group = groups.get(key) ?? {
      key,
      title,
      taskId: task?.id ?? null,
      projectId: project?.id ?? null,
      logs: [],
      note: null
    };
    group.logs.push(l);
    group.note = group.note ?? note;
    groups.set(key, group);
  }
  return [...groups.values()];
}

/** Hours to minutes, rounded. */
export function hoursToMinutes(h: number): number {
  return Math.round(h * 60);
}

/** True when `h` is a whole number of quarter hours. */
export function isQuarterHours(h: number): boolean {
  return Number.isInteger(h * 4);
}

/** A PMSPA start hour as minutes, rounded to the nearest 15 and clamped to 1425 (the latest DTO start, OQ-194). */
export function startToMinute(start: number | null): number | null {
  if (start === null) return null;
  return Math.min(1425, Math.round((start * 60) / 15) * 15);
}

/** A PM4 start minute as PMSPA's decimal hour. */
export function minuteToStart(minute: number): number {
  return minute / 60;
}

/** As web/lib/time: "3h 45m", "45m", "2h". */
export function formatDuration(minutes: number): string {
  const total = Math.abs(Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** As web/lib/time: "16 Oct 2026". */
export function formatWorkDate(date: string): string {
  return formatDate(date);
}

/** "1 log", "3 logs". */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** D1: a PM4 log's fingerprint tuple, `group` its group key mapped to PMSPA. */
export function pm4LogTuple(
  l: Pm4LogForPush,
  group: string
): (string | number | boolean | null)[] {
  return [cut(l.text, 350), l.durationMinutes, group, l.booked];
}

/** D1: a PMSPA log's fingerprint tuple. */
export function pmspaLogTuple(
  log: RemoteLog,
  e: RemoteEvent
): (string | number | boolean | null)[] {
  return [log.title, hoursToMinutes(log.duration), e.taskId, e.title, e.booked];
}
