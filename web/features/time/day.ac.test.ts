import { describe, expect, it } from "vitest";
import { formatClock, roundToQuarter } from "@/lib/time/clock";
import { barBars, dayFigures, groupLogs, pieSlices, rowFields } from "./day";
import type { Ref, TimeLog } from "./types";

const ref = (id: string | null, title: string, deleted = false): Ref => ({
  id,
  title,
  deleted
});
const manhatan = ref("p1", "Manhatan");
const spec01 = ref("t1", "Specifications 01");
const spec02 = ref("t2", "Specifications 02");

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

/** The owner's logs (spec, Acceptance criteria). */
const ownerLogs: TimeLog[] = [
  log({
    id: "l1",
    durationMinutes: 30,
    text: "Specs review",
    project: manhatan,
    task: spec01
  }),
  log({
    id: "l2",
    durationMinutes: 105,
    text: "Specs audit",
    project: manhatan,
    task: spec02
  }),
  log({ id: "l3", durationMinutes: 15, text: "Chat with coworker" }),
  log({
    id: "l4",
    durationMinutes: 60,
    text: "Commute",
    project: manhatan,
    excludeFromStats: true
  })
];

const summary = (logs: TimeLog[], by: "project" | "task") =>
  groupLogs(logs, by).map((g) => ({
    key: g.key,
    project: g.project,
    task: g.task,
    totalMinutes: g.totalMinutes,
    ids: g.logs.map((l) => l.id)
  }));

describe("time pure logic (feat-tlog-web)", () => {
  it("AC-3 FR-TLOG-009: formatClock and roundToQuarter", () => {
    expect(formatClock(540)).toBe("09:00");
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(1530)).toBe("01:30 (+1 day)");
    expect(roundToQuarter(538)).toBe(540);
    expect(roundToQuarter(1438)).toBe(1425);
    expect(roundToQuarter(547)).toBe(540);
    expect(roundToQuarter(548)).toBe(555);
  });

  it("AC-4 FR-TLOG-009: dayFigures: start, logged, start + logged, unlogged, % billable and overtime", () => {
    const oneHour = [log({ id: "a", durationMinutes: 60 })];
    expect(dayFigures(480, oneHour, 557, 420)).toMatchObject({
      start: "08:00",
      logged: 60,
      startPlusLogged: "09:00",
      unlogged: 17
    });
    // Not today → no unlogged.
    expect(dayFigures(480, oneHour, null, 420).unlogged).toBeNull();
    // No start → no start, no start + logged, no unlogged.
    expect(dayFigures(null, oneHour, 557, 420)).toMatchObject({
      start: null,
      logged: 60,
      startPlusLogged: null,
      unlogged: null
    });
    // Now before start + logged → nothing unlogged.
    expect(dayFigures(480, oneHour, 530, 420).unlogged).toBeNull();

    expect(dayFigures(480, ownerLogs, null, 420)).toMatchObject({
      logged: 210,
      billable: 150,
      percentBillable: 36,
      overtime: 0
    });

    // 8 h 15 min, 1 h of it excluded → 7 h 15 min billable.
    const long = [
      log({ id: "a", durationMinutes: 435 }),
      log({ id: "b", durationMinutes: 60, excludeFromStats: true })
    ];
    expect(dayFigures(480, long, null, 420)).toMatchObject({
      logged: 495,
      billable: 435,
      percentBillable: 104,
      overtime: 15
    });
    // A zero target doesn't divide by zero.
    expect(dayFigures(480, long, null, 0).percentBillable).toBe(0);
  });

  it("AC-5 FR-TLOG-003 FR-TLOG-015: groupLogs by project and by task, Unsorted and Non-prod last, first-appearance order, purged refs by title", () => {
    expect(summary(ownerLogs, "project")).toEqual([
      {
        key: "p1",
        project: "Manhatan",
        task: null,
        totalMinutes: 135,
        ids: ["l1", "l2"]
      },
      {
        key: "unsorted",
        project: null,
        task: null,
        totalMinutes: 15,
        ids: ["l3"]
      },
      {
        key: "nonprod",
        project: null,
        task: null,
        totalMinutes: 60,
        ids: ["l4"]
      }
    ]);
    expect(summary(ownerLogs, "task")).toEqual([
      {
        key: "t1",
        project: "Manhatan",
        task: "Specifications 01",
        totalMinutes: 30,
        ids: ["l1"]
      },
      {
        key: "t2",
        project: "Manhatan",
        task: "Specifications 02",
        totalMinutes: 105,
        ids: ["l2"]
      },
      {
        key: "unsorted",
        project: null,
        task: null,
        totalMinutes: 15,
        ids: ["l3"]
      },
      {
        key: "nonprod",
        project: null,
        task: null,
        totalMinutes: 60,
        ids: ["l4"]
      }
    ]);

    // A project-only log is unsorted by task.
    const projectOnly = log({ id: "p", project: manhatan });
    expect(groupLogs([projectOnly], "task").map((g) => g.key)).toEqual([
      "unsorted"
    ]);

    // First appearance decides the order, not the title; Unsorted before Non-prod whatever the input order.
    const zeta = ref("p9", "Zeta");
    const order = [
      log({ id: "n", excludeFromStats: true }),
      log({ id: "u" }),
      log({ id: "z1", project: zeta }),
      log({ id: "m", project: manhatan }),
      log({ id: "z2", project: zeta })
    ];
    expect(summary(order, "project").map((g) => [g.key, g.ids])).toEqual([
      ["p9", ["z1", "z2"]],
      ["p1", ["m"]],
      ["unsorted", ["u"]],
      ["nonprod", ["n"]]
    ]);

    // Purged refs (id null) group by their title.
    const gone = (id: string) =>
      log({ id, project: ref(null, "Old site", true) });
    expect(summary([gone("g1"), gone("g2")], "project")).toEqual([
      {
        key: "deleted:Old site",
        project: "Old site",
        task: null,
        totalMinutes: 120,
        ids: ["g1", "g2"]
      }
    ]);
  });

  it("AC-6 FR-TLOG-003 FR-TLOG-015: rowFields per view and group", () => {
    const [review, , chat, commute] = ownerLogs;
    const all = { title: true, project: true, task: true };
    expect(rowFields(review, "sequential", null)).toEqual(all);
    expect(rowFields(chat, "sequential", null)).toEqual(all);

    expect(rowFields(review, "project", "p1")).toEqual({
      title: false,
      project: false,
      task: true
    });
    expect(rowFields(chat, "project", "unsorted")).toMatchObject({
      title: true,
      project: true
    });
    expect(rowFields(commute, "project", "nonprod")).toEqual({
      title: false,
      project: true,
      task: true
    });

    expect(rowFields(review, "task", "t1")).toEqual({
      title: false,
      project: false,
      task: false
    });
    const projectOnly = log({ id: "p", project: manhatan });
    expect(rowFields(projectOnly, "task", "unsorted")).toEqual({
      title: true,
      project: true,
      task: false
    });
  });

  it("AC-7 FR-TLOG-016: pieSlices per log plus Remaining; barBars by project and by task", () => {
    expect(pieSlices(ownerLogs, 420)).toEqual([
      {
        key: "l1",
        label: "Manhatan - Specifications 01 - Specs review",
        minutes: 30,
        kind: "log"
      },
      {
        key: "l2",
        label: "Manhatan - Specifications 02 - Specs audit",
        minutes: 105,
        kind: "log"
      },
      { key: "l3", label: "Chat with coworker", minutes: 15, kind: "log" },
      { key: "l4", label: "Manhatan - Commute", minutes: 60, kind: "log" },
      { key: "remaining", label: "Remaining", minutes: 210, kind: "remaining" }
    ]);
    const full = [log({ id: "f", durationMinutes: 480 })];
    expect(pieSlices(full, 420).map((s) => s.kind)).toEqual(["log"]);

    expect(barBars(ownerLogs, "project")).toEqual([
      { key: "p1", label: "Manhatan", minutes: 135 },
      { key: "unsorted", label: "Unsorted", minutes: 15 },
      { key: "nonprod", label: "Non-prod", minutes: 60 }
    ]);
    expect(barBars(ownerLogs, "task")).toEqual([
      { key: "t1", label: "Manhatan · Specifications 01", minutes: 30 },
      { key: "t2", label: "Manhatan · Specifications 02", minutes: 105 },
      { key: "unsorted", label: "Unsorted", minutes: 15 },
      { key: "nonprod", label: "Non-prod", minutes: 60 }
    ]);
  });
});
