import type { PmspaDayDto, PmspaEventDto } from "./dto/pmspa-browse.dto.js";
import type { RemoteProject, RemoteTask } from "./pmspa-fields.js";
import type { RemoteDay } from "./pmspa-remote.js";
import { hoursToMinutes, startToMinute } from "./pmspa-time-fields.js";

/** `PmspaDay`s, newest first; a day without events left out. `linked` = PMSPA log ids with an active time-log link. */
export function dayItems(
  days: RemoteDay[],
  tasks: RemoteTask[],
  projects: RemoteProject[],
  linked: ReadonlySet<string>
): PmspaDayDto[] {
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const titles = new Map(projects.map((p) => [p.id, p.title]));
  return days
    .filter((day) => day.events.length > 0)
    .map((day): PmspaDayDto => {
      const events = day.events.map((e): PmspaEventDto => {
        const task = e.taskId ? taskById.get(e.taskId) : undefined;
        return {
          id: e.id,
          title: e.title,
          task: task
            ? {
                id: task.id,
                title: task.title,
                projectTitle: titles.get(task.projectId) ?? ""
              }
            : null,
          logs: e.logs.map((l) => ({
            id: l.id,
            title: l.title,
            durationMinutes: hoursToMinutes(l.duration),
            linked: linked.has(l.id)
          }))
        };
      });
      const logs = day.events.flatMap((e) => e.logs);
      const linkedCount = logs.filter((l) => linked.has(l.id)).length;
      return {
        date: day.date,
        startMinute: startToMinute(day.start),
        totalMinutes: logs.reduce(
          (sum, l) => sum + hoursToMinutes(l.duration),
          0
        ),
        linkState:
          linkedCount === 0
            ? "not-linked"
            : linkedCount === logs.length
              ? "linked"
              : "partly-linked",
        events
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}
