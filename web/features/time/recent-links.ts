import type { ProjectRef, TaskRef, TimeLog } from "./types";

/** At most this many recent projects and recent tasks are suggested. */
export const RECENT_LIMIT = 5;

export function recentProjects(_logs: readonly TimeLog[]): ProjectRef[] {
  throw new Error("not implemented (feat-tlog-recent-links)");
}

export function recentTasks(
  _logs: readonly TimeLog[],
  _projectId: string | null
): TaskRef[] {
  throw new Error("not implemented (feat-tlog-recent-links)");
}
