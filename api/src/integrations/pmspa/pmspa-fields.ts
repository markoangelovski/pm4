/* eslint-disable @typescript-eslint/no-unused-vars -- typed stub from the test step; T1 implements the bodies */
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

const NOT_IMPLEMENTED = "not implemented (feat-int-sync-api)";

/** Over `max` → the first `max - 1` characters + "…". */
export function cut(_s: string, _max: number): string {
  throw new Error(NOT_IMPLEMENTED);
}

/** Empty after trimming → null, else `s`. */
export function val(_s: string | null | undefined): string | null {
  throw new Error(NOT_IMPLEMENTED);
}

/** An `http(s)` URL of at most 500 characters, else null (D8). */
export function linkVal(_s: string | null | undefined): string | null {
  throw new Error(NOT_IMPLEMENTED);
}

/** PMSPA → PM4: the date of the instant in `timeZone`, `YYYY-MM-DD` (D7). */
export function dueDateOf(_dueAt: number, _timeZone: string): string {
  throw new Error(NOT_IMPLEMENTED);
}

/** PM4 → PMSPA: the epoch ms of 12:00 UTC that day, as digits (D7). */
export function dueAtOf(_date: string): string {
  throw new Error(NOT_IMPLEMENTED);
}

/** "2026-10-18" → "18 Oct 2026". */
export function formatDate(_date: string): string {
  throw new Error(NOT_IMPLEMENTED);
}

/** The prototype's `projectDiff`: Title, Description, Lead, External link. */
export function projectDiff(
  _p: Pm4Project,
  _r: RemoteProject
): SyncFieldDiff[] {
  throw new Error(NOT_IMPLEMENTED);
}

/** The prototype's `taskDiff`: + Status after Description, Due date last (only when the PM4 task has one). */
export function taskDiff(
  _t: Pm4Task,
  _r: RemoteTask,
  _timeZone: string
): SyncFieldDiff[] {
  throw new Error(NOT_IMPLEMENTED);
}

/** [title, description, lead, link] as `projectDiff` compares them. */
export function projectTuple(
  _side: Pm4Project | RemoteProject
): (string | null)[] {
  throw new Error(NOT_IMPLEMENTED);
}

/** `projectTuple` + column, due date (PM4 none → null). */
export function taskTuple(
  _side: Pm4Task | RemoteTask,
  _timeZone: string
): (string | null)[] {
  throw new Error(NOT_IMPLEMENTED);
}

/** The first 8 bytes of SHA-256 over `JSON.stringify(tuple)` (D1). */
export function fingerprint(_tuple: (string | null)[]): Buffer {
  throw new Error(NOT_IMPLEMENTED);
}

/** D11: a Description / Lead / External link diff with PM4 null and PMSPA set. */
export function clearWarnings(_diffs: SyncFieldDiff[]): string[] {
  throw new Error(NOT_IMPLEMENTED);
}
