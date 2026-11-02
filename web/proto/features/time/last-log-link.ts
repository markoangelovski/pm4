import type { ProjectRef, TaskRef } from "./types";

/** A new log's project and task. */
export interface LogLink {
  project: ProjectRef | null;
  task: TaskRef | null;
}

export const NO_LOG_LINK: LogLink = { project: null, task: null };

/**
 * The project and task of the last log created in this tab: a new log without a preset starts with them.
 * Module state, so it lasts until the page reloads.
 */
let lastLink: LogLink = NO_LOG_LINK;

export const getLastLogLink = (): LogLink => lastLink;

export function setLastLogLink(link: LogLink): void {
  lastLink = link;
}
