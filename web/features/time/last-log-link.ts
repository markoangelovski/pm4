import type { ProjectRef, TaskRef } from "./types";

/** A new log's project and task. */
export interface LogLink {
  project: ProjectRef | null;
  task: TaskRef | null;
}

export const NO_LOG_LINK: LogLink = { project: null, task: null };

/**
 * The project and task of the last log created in this tab: a new log without a preset starts with them.
 * Module state, so it lasts until the page reloads, the user signs out or the session ends, or its project or task
 * is deleted.
 */
let lastLink: LogLink = NO_LOG_LINK;

export const getLastLogLink = (): LogLink => lastLink;

export function setLastLogLink(link: LogLink): void {
  lastLink = link;
}

/** Forgets the last link when it points at the deleted project or task `id` (a project's delete takes its tasks). */
export function forgetLogLinkTo(id: string): void {
  const { project, task } = lastLink;
  if (project?.id === id || task?.id === id || task?.project.id === id) {
    lastLink = NO_LOG_LINK;
  }
}
