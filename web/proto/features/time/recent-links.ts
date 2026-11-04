import type { ProjectRef, TaskRef, TimeLog } from "./types";

/** At most this many recent projects and recent tasks are suggested. */
export const RECENT_LIMIT = 5;

/** The day's logs, last one first (logs come ordered by position). */
function latestFirst(logs: readonly TimeLog[]): TimeLog[] {
  return [...logs].reverse();
}

/** The distinct projects of the day's logs, most recently logged first; deleted ones are skipped. */
export function recentProjects(logs: readonly TimeLog[]): ProjectRef[] {
  const seen = new Set<string>();
  const out: ProjectRef[] = [];
  for (const log of latestFirst(logs)) {
    const p = log.project;
    if (!p?.id || seen.has(p.id)) continue;
    seen.add(p.id);
    out.push({ id: p.id, title: p.title });
    if (out.length === RECENT_LIMIT) break;
  }
  return out;
}

/**
 * The distinct tasks of the day's logs, most recently logged first: only `projectId`'s tasks when a project is
 * picked, else every project's.
 */
export function recentTasks(
  logs: readonly TimeLog[],
  projectId: string | null
): TaskRef[] {
  const seen = new Set<string>();
  const out: TaskRef[] = [];
  for (const log of latestFirst(logs)) {
    const t = log.task;
    const p = log.project;
    if (!t?.id || !p?.id || seen.has(t.id)) continue;
    if (projectId && p.id !== projectId) continue;
    seen.add(t.id);
    out.push({
      id: t.id,
      title: t.title,
      project: { id: p.id, title: p.title }
    });
    if (out.length === RECENT_LIMIT) break;
  }
  return out;
}
