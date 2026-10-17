import type { RemoteEvent, RemoteLog } from "./pmspa-remote.js";

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
  void eventTitle;
  throw new Error("not implemented (feat-int-time-api)");
}

/** The event title of a log: its project's title, else its own title, else "Unsorted" (OQ-167). */
export function eventTitle(
  projectTitle: string | null,
  logTitle: string | null
): string {
  void projectTitle;
  void logTitle;
  throw new Error("not implemented (feat-int-time-api)");
}

/** A day's logs grouped into PMSPA events, in log order. */
export function groupDay(logs: Pm4LogForPush[]): PushGroup[] {
  void logs;
  throw new Error("not implemented (feat-int-time-api)");
}

/** Hours to minutes, rounded. */
export function hoursToMinutes(h: number): number {
  void h;
  throw new Error("not implemented (feat-int-time-api)");
}

/** True when `h` is a whole number of quarter hours. */
export function isQuarterHours(h: number): boolean {
  void h;
  throw new Error("not implemented (feat-int-time-api)");
}

/** A PMSPA start hour as minutes, rounded to the nearest 15. */
export function startToMinute(start: number | null): number | null {
  void start;
  throw new Error("not implemented (feat-int-time-api)");
}

/** A PM4 start minute as PMSPA's decimal hour. */
export function minuteToStart(minute: number): number {
  void minute;
  throw new Error("not implemented (feat-int-time-api)");
}

/** As web/lib/time: "3h 45m", "45m", "2h". */
export function formatDuration(minutes: number): string {
  void minutes;
  throw new Error("not implemented (feat-int-time-api)");
}

/** As web/lib/time: "16 Oct 2026". */
export function formatWorkDate(date: string): string {
  void date;
  throw new Error("not implemented (feat-int-time-api)");
}

/** "1 log", "3 logs". */
export function plural(n: number, one: string, many?: string): string {
  void n;
  void one;
  void many;
  throw new Error("not implemented (feat-int-time-api)");
}

/** D1: a PM4 log's fingerprint tuple, `group` its group key mapped to PMSPA. */
export function pm4LogTuple(
  l: Pm4LogForPush,
  group: string
): (string | number | boolean | null)[] {
  void l;
  void group;
  throw new Error("not implemented (feat-int-time-api)");
}

/** D1: a PMSPA log's fingerprint tuple. */
export function pmspaLogTuple(
  log: RemoteLog,
  e: RemoteEvent
): (string | number | boolean | null)[] {
  void log;
  void e;
  throw new Error("not implemented (feat-int-time-api)");
}
