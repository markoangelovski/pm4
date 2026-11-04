import { describe, expect, it } from "vitest";
import { RECENT_LIMIT, recentProjects, recentTasks } from "./recent-links";
import type { TimeLog } from "./types";

let n = 0;
/** A log of the day; `null` ids are a deleted project or task (its name kept). */
function log(
  project: [string | null, string] | null,
  task: [string | null, string] | null = null
): TimeLog {
  n += 1;
  return {
    id: `l${n}`,
    workDate: "2026-10-07",
    durationMinutes: 15,
    text: "Work",
    title: null,
    project: project
      ? { id: project[0], title: project[1], deleted: project[0] === null }
      : null,
    task: task
      ? { id: task[0], title: task[1], deleted: task[0] === null }
      : null,
    excludeFromStats: false
  } as TimeLog;
}

const P1: [string, string] = ["p1", "Manhatan"];
const P2: [string, string] = ["p2", "Website"];

describe("recent links (feat-tlog-recent-links)", () => {
  it("AC-1 FR-TLOG-004: recentProjects: latest first, distinct, unsorted and deleted skipped, at most 5", () => {
    expect(RECENT_LIMIT).toBe(5);
    expect(
      recentProjects([
        log(P1),
        log(P2),
        log(null),
        log([null, "Old client"]),
        log(P1)
      ])
    ).toEqual([
      { id: "p1", title: "Manhatan" },
      { id: "p2", title: "Website" }
    ]);
    const seven = Array.from({ length: 7 }, (_, i) =>
      log([`p${i}`, `Project ${i}`])
    );
    expect(recentProjects(seven).map((p) => p.id)).toEqual([
      "p6",
      "p5",
      "p4",
      "p3",
      "p2"
    ]);
    expect(recentProjects([])).toEqual([]);
  });

  it("AC-2 FR-TLOG-004: recentTasks: latest first, distinct, with the log's project, narrowed by project, deleted and task-less logs skipped, at most 5", () => {
    const logs = [
      log(P1, ["t1", "Specifications 01"]),
      log(P2, ["t3", "Landing page"]),
      log(P1),
      log(P1, [null, "Removed task"]),
      log([null, "Old client"], ["t9", "Orphan"]),
      log(P1, ["t2", "Specifications 02"]),
      log(P1, ["t1", "Specifications 01"])
    ];
    expect(recentTasks(logs, null)).toEqual([
      {
        id: "t1",
        title: "Specifications 01",
        project: { id: "p1", title: "Manhatan" }
      },
      {
        id: "t2",
        title: "Specifications 02",
        project: { id: "p1", title: "Manhatan" }
      },
      {
        id: "t3",
        title: "Landing page",
        project: { id: "p2", title: "Website" }
      }
    ]);
    expect(recentTasks(logs, "p2").map((t) => t.id)).toEqual(["t3"]);
    expect(recentTasks(logs, "p1").map((t) => t.id)).toEqual(["t1", "t2"]);
    expect(recentTasks(logs, "p7")).toEqual([]);
    const seven = Array.from({ length: 7 }, (_, i) =>
      log(P1, [`t${i}`, `Task ${i}`])
    );
    expect(recentTasks(seven, "p1").map((t) => t.id)).toEqual([
      "t6",
      "t5",
      "t4",
      "t3",
      "t2"
    ]);
  });
});
