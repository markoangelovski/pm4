import type { PmspaDayDto } from "./dto/pmspa-browse.dto.js";
import type { RemoteProject, RemoteTask } from "./pmspa-fields.js";
import type { RemoteDay } from "./pmspa-remote.js";

/** `PmspaDay`s, newest first; a day without events left out. `linked` = PMSPA log ids with an active time-log link. */
export function dayItems(
  days: RemoteDay[],
  tasks: RemoteTask[],
  projects: RemoteProject[],
  linked: ReadonlySet<string>
): PmspaDayDto[] {
  void days;
  void tasks;
  void projects;
  void linked;
  throw new Error("not implemented (feat-int-budget)");
}
