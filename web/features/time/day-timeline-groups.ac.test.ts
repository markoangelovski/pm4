import { describe, expect, it } from "vitest";
import { groupLogs, timeline, timelineGroups } from "./day";
import type { Ref, TimeLog } from "./types";

const ref = (id: string | null, title: string, deleted = false): Ref => ({
  id,
  title,
  deleted
});
const manhatan = ref("p1", "Manhatan");

const log = (over: Partial<TimeLog> & { id: string }): TimeLog => ({
  workDate: "2026-10-07",
  durationMinutes: 60,
  text: "Work",
  title: null,
  project: null,
  task: null,
  excludeFromStats: false,
  ...over
});

/** The owner's logs (feat-tlog-web), in API order. */
const ownerLogs: TimeLog[] = [
  log({
    id: "l1",
    durationMinutes: 30,
    project: manhatan,
    task: ref("t1", "Specifications 01")
  }),
  log({
    id: "l2",
    durationMinutes: 105,
    project: manhatan,
    task: ref("t2", "Specifications 02")
  }),
  log({ id: "l3", durationMinutes: 15 }),
  log({
    id: "l4",
    durationMinutes: 60,
    project: manhatan,
    excludeFromStats: true
  })
];

const groupsOf = (startMinute: number | null, logs: TimeLog[]) =>
  timelineGroups(timeline(startMinute, logs, null), groupLogs(logs, "project"));

const shape = (gs: ReturnType<typeof timelineGroups>) =>
  gs.map((g) => [g.group.key, g.rows.map((r) => [r.log.id, r.from, r.to])]);

describe("timelineGroups (feat-tlog-timeline-groups)", () => {
  it("AC-1 FR-TLOG-023: the By Project groups, each with its logs' rows on the day's axis", () => {
    const gs = groupsOf(480, ownerLogs);
    expect(shape(gs)).toEqual([
      [
        "p1",
        [
          ["l1", 480, 510],
          ["l2", 510, 615]
        ]
      ],
      ["unsorted", [["l3", 615, 630]]],
      ["nonprod", [["l4", 630, 690]]]
    ]);
    expect(gs[0].group.totalMinutes).toBe(135);
    expect(gs[0].rows[0].log).toBe(ownerLogs[0]);
  });

  it("AC-2 FR-TLOG-023: a project's logs keep their places, with gaps where other projects' logs were; no logs → no groups", () => {
    const a = ref("pA", "Alpha");
    const b = ref("pB", "Beta");
    const logs = [
      log({ id: "a1", durationMinutes: 60, project: a }),
      log({ id: "b1", durationMinutes: 30, project: b }),
      log({ id: "a2", durationMinutes: 15, project: a })
    ];
    expect(shape(groupsOf(480, logs))).toEqual([
      [
        "pA",
        [
          ["a1", 480, 540],
          ["a2", 570, 585]
        ]
      ],
      ["pB", [["b1", 540, 570]]]
    ]);
    expect(groupsOf(480, [])).toEqual([]);
  });
});
