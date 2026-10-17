import { createHash } from "node:crypto";
import type { TaskStatus } from "../../database/schema/projects.js";

// The field mapping between PM4 and PMSPA projects and tasks (feat-int-sync-api
// *Fields*, req-integrations *Entity mapping*): pure functions, no I/O.

export type PmspaColumn = "Upcoming" | "In Progress" | "Completed";

export interface RemoteProject {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  pl: string | null;
  kanboard: string | null;
  done: boolean;
  taskCount: number;
}

export interface RemoteTask {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  column: PmspaColumn;
  pl: string | null;
  kanboard: string | null;
  /** Epoch ms. */
  dueAt: number;
}

export interface Pm4Project {
  id: string;
  title: string;
  description: string | null;
  externalLink: string | null;
  leadName: string | null;
}

export interface Pm4Task extends Pm4Project {
  projectId: string;
  status: TaskStatus;
  dueDate: string | null;
}

/** One shared field whose values differ (`SyncFieldDiff` in endpoints.md). */
export interface SyncFieldDiff {
  field: string;
  pm4: string | null;
  pmspa: string | null;
}

export const COLUMN: Record<TaskStatus, PmspaColumn> = {
  upcoming: "Upcoming",
  "in-progress": "In Progress",
  completed: "Completed"
};

export const STATUS: Record<PmspaColumn, TaskStatus> = {
  Upcoming: "upcoming",
  "In Progress": "in-progress",
  Completed: "completed"
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];

/** Over `max` → the first `max - 1` characters + "…". */
export function cut(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

/** Empty after trimming → null, else `s`. */
export function val(s: string | null | undefined): string | null {
  return s && s.trim() ? s : null;
}

/** An `http(s)` URL of at most 500 characters, else null (D8). */
export function linkVal(s: string | null | undefined): string | null {
  if (!s || s.length > 500) return null;
  try {
    const url = new URL(s);
    return url.protocol === "http:" || url.protocol === "https:" ? s : null;
  } catch {
    return null;
  }
}

/** PMSPA → PM4: the date of the instant in `timeZone`, `YYYY-MM-DD` (D7). */
export function dueDateOf(dueAt: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(dueAt));
  const part = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** PM4 → PMSPA: the epoch ms of 12:00 UTC that day, as digits (D7). */
export function dueAtOf(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return String(Date.UTC(year, month - 1, day, 12));
}

/** "2026-10-18" → "18 Oct 2026". */
export function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

const isPm4 = (side: object): side is Pm4Project => "leadName" in side;

const diff = (
  fields: [string, string | null, string | null][]
): SyncFieldDiff[] =>
  fields
    .filter(([, pm4, pmspa]) => pm4 !== pmspa)
    .map(([field, pm4, pmspa]) => ({ field, pm4, pmspa }));

/** PM4's text as PMSPA stores it: the title cut to 150, the description cut to 350. */
const pm4Title = (p: Pm4Project) => cut(p.title, 150);
const pm4Description = (p: Pm4Project) =>
  val(p.description) ? cut(p.description!, 350) : null;

/** The prototype's `projectDiff`: Title, Description, Lead, External link. */
export function projectDiff(p: Pm4Project, r: RemoteProject): SyncFieldDiff[] {
  return diff([
    ["Title", pm4Title(p), r.title],
    ["Description", pm4Description(p), val(r.description)],
    ["Lead", val(p.leadName), val(r.pl)],
    ["External link", linkVal(p.externalLink), linkVal(r.kanboard)]
  ]);
}

/** The prototype's `taskDiff`: + Status after Description, Due date last (only when the PM4 task has one). */
export function taskDiff(
  t: Pm4Task,
  r: RemoteTask,
  timeZone: string
): SyncFieldDiff[] {
  return diff([
    ["Title", pm4Title(t), r.title],
    ["Description", pm4Description(t), val(r.description)],
    ["Status", COLUMN[t.status], r.column],
    ["Lead", val(t.leadName), val(r.pl)],
    ["External link", linkVal(t.externalLink), linkVal(r.kanboard)],
    ...(t.dueDate
      ? [
          [
            "Due date",
            formatDate(t.dueDate),
            formatDate(dueDateOf(r.dueAt, timeZone))
          ] as [string, string, string]
        ]
      : [])
  ]);
}

const pm4Tuple = (p: Pm4Project): (string | null)[] => [
  pm4Title(p),
  pm4Description(p),
  val(p.leadName),
  linkVal(p.externalLink)
];

const remoteTuple = (
  r: Omit<RemoteProject, "id" | "userId" | "done" | "taskCount">
): (string | null)[] => [
  r.title,
  val(r.description),
  val(r.pl),
  linkVal(r.kanboard)
];

/** [title, description, lead, link] as `projectDiff` compares them. */
export function projectTuple(
  side: Pm4Project | RemoteProject
): (string | null)[] {
  return isPm4(side) ? pm4Tuple(side) : remoteTuple(side);
}

/** `projectTuple` + column, due date (PM4 none → null). */
export function taskTuple(
  side: Pm4Task | RemoteTask,
  timeZone: string
): (string | null)[] {
  if (isPm4(side)) {
    return [...pm4Tuple(side), COLUMN[side.status], side.dueDate];
  }
  return [...remoteTuple(side), side.column, dueDateOf(side.dueAt, timeZone)];
}

/** The first 8 bytes of SHA-256 over `JSON.stringify(tuple)` (D1). */
export function fingerprint(tuple: (string | null)[]): Buffer {
  return createHash("sha256")
    .update(JSON.stringify(tuple))
    .digest()
    .subarray(0, 8);
}

const KEPT_BY_PMSPA = new Set(["Description", "Lead", "External link"]);

/** D11: a Description / Lead / External link diff with PM4 null and PMSPA set. */
export function clearWarnings(diffs: SyncFieldDiff[]): string[] {
  return diffs
    .filter(
      (d) => KEPT_BY_PMSPA.has(d.field) && d.pm4 === null && d.pmspa !== null
    )
    .map((d) => `PMSPA can't clear the ${d.field}: it keeps its value.`);
}
