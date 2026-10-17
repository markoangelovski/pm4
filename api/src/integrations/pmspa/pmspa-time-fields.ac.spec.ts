import type { RemoteEvent } from "./pmspa-remote.js";
import {
  NONPROD,
  eventTitle,
  formatDuration,
  formatWorkDate,
  groupDay,
  hoursToMinutes,
  isNonprod,
  isQuarterHours,
  minuteToStart,
  plural,
  pm4LogTuple,
  pmspaLogTuple,
  startToMinute,
  type Pm4LogForPush
} from "./pmspa-time-fields.js";

const ANTHROPIC = { id: "p-anthropic", title: "Anthropic", deleted: false };
const PM = { id: "t-pm", title: "PM", deleted: false };
const MEETINGS = { id: "t-meetings", title: "Meetings", deleted: false };

let seq = 0;
const log = (fields: Partial<Pm4LogForPush> = {}): Pm4LogForPush => ({
  id: `log-${++seq}`,
  text: "Sprint planning",
  title: null,
  durationMinutes: 60,
  excludeFromStats: false,
  booked: false,
  task: null,
  project: null,
  ...fields
});

const LONG = "x".repeat(200);

describe("PMSPA time mapping (feat-int-time-api)", () => {
  it("AC-17 FR-INT-012: eventTitle is the project's title, else the log's, else Unsorted; under 3 characters gets ' · Time', over 150 is cut", () => {
    expect(eventTitle("Anthropic", "Daily")).toBe("Anthropic");
    expect(eventTitle(null, "Release notes")).toBe("Release notes");
    expect(eventTitle(null, "AI")).toBe("AI · Time");
    expect(eventTitle("QA", null)).toBe("QA · Time");
    expect(eventTitle(null, null)).toBe("Unsorted");
    expect(eventTitle(null, "   ")).toBe("Unsorted");
    const cut = eventTitle(LONG, null);
    expect(cut).toHaveLength(150);
    expect(cut).toBe("x".repeat(149) + "…");
  });

  it("AC-17 FR-INT-011: isNonprod ignores case and surrounding spaces", () => {
    expect(NONPROD).toBe("nonprod");
    expect(isNonprod("nonprod")).toBe(true);
    expect(isNonprod(" NonProd ")).toBe(true);
    expect(isNonprod("nonprod work")).toBe(false);
    expect(isNonprod("Internal")).toBe(false);
  });

  it("AC-17 FR-INT-012: groupDay makes one event per task, per project without a task, per Unsorted title, and one nonprod", () => {
    const logs = [
      log({ task: PM, project: ANTHROPIC }),
      log({ task: MEETINGS, project: ANTHROPIC, durationMinutes: 30 }),
      log({ task: PM, project: ANTHROPIC, durationMinutes: 15 }),
      log({ project: ANTHROPIC, durationMinutes: 45 }),
      log({ title: "AI", durationMinutes: 15 }),
      log({ title: null, durationMinutes: 15 }),
      log({ title: "Email", durationMinutes: 15 }),
      log({ title: "Email", durationMinutes: 30 }),
      log({ excludeFromStats: true, task: PM, project: ANTHROPIC }),
      log({ excludeFromStats: true, title: "Sick leave" })
    ];

    const groups = groupDay(logs);

    expect(groups.map((g) => [g.key, g.title, g.taskId, g.projectId])).toEqual([
      ["task:t-pm", "Anthropic", "t-pm", "p-anthropic"],
      ["task:t-meetings", "Anthropic", "t-meetings", "p-anthropic"],
      ["project:p-anthropic", "Anthropic", null, "p-anthropic"],
      ["unsorted:AI · Time", "AI · Time", null, null],
      ["unsorted:Unsorted", "Unsorted", null, null],
      ["unsorted:Email", "Email", null, null],
      ["unsorted:nonprod", "nonprod", null, null]
    ]);
    expect(groups.map((g) => g.logs.map((l) => l.id))).toEqual([
      [logs[0].id, logs[2].id],
      [logs[1].id],
      [logs[3].id],
      [logs[4].id],
      [logs[5].id],
      [logs[6].id, logs[7].id],
      [logs[8].id, logs[9].id]
    ]);
    expect(groups.every((g) => g.note === null)).toBe(true);
    expect(groupDay([])).toEqual([]);
  });

  it("AC-17 FR-INT-012: an Unsorted title over 150 characters is cut; a 2-character project title gets ' · Time'", () => {
    const [long] = groupDay([log({ title: LONG.slice(0, 100) + LONG })]);
    expect(long.title).toBe("x".repeat(149) + "…");
    expect(long.key).toBe(`unsorted:${"x".repeat(149)}…`);

    const [short] = groupDay([
      log({ project: { id: "p-qa", title: "QA", deleted: false } })
    ]);
    expect(short).toMatchObject({ key: "project:p-qa", title: "QA · Time" });
  });

  it("AC-17 FR-INT-012: a deleted task pushes under its project, a deleted project as Unsorted, with a note", () => {
    const [underProject] = groupDay([
      log({
        task: { id: null, title: "Old task", deleted: true },
        project: ANTHROPIC
      })
    ]);
    expect(underProject).toMatchObject({
      key: "project:p-anthropic",
      title: "Anthropic",
      taskId: null,
      projectId: "p-anthropic",
      note: "Deleted task “Old task”: pushed under Anthropic."
    });

    const [unsorted] = groupDay([
      log({
        title: "Kickoff",
        project: { id: null, title: "Gone", deleted: true }
      })
    ]);
    expect(unsorted).toMatchObject({
      key: "unsorted:Kickoff",
      title: "Kickoff",
      taskId: null,
      projectId: null,
      note: "Deleted project “Gone”: pushed as Unsorted."
    });

    const [nonprod] = groupDay([
      log({
        excludeFromStats: true,
        task: { id: null, title: "Old task", deleted: true },
        project: ANTHROPIC
      })
    ]);
    expect(nonprod).toMatchObject({ key: "unsorted:nonprod", note: null });
  });

  it("AC-17 FR-INT-011: hours, quarter hours and day starts", () => {
    expect(hoursToMinutes(1.5)).toBe(90);
    expect(hoursToMinutes(0.3)).toBe(18);
    expect(isQuarterHours(0.75)).toBe(true);
    expect(isQuarterHours(2)).toBe(true);
    expect(isQuarterHours(0.3)).toBe(false);
    expect(startToMinute(9.25)).toBe(555);
    expect(startToMinute(9)).toBe(540);
    expect(startToMinute(8.2)).toBe(495);
    expect(startToMinute(0)).toBe(0);
    expect(startToMinute(null)).toBeNull();
    expect(minuteToStart(480)).toBe(8);
    expect(minuteToStart(555)).toBe(9.25);
  });

  it("AC-17 FR-INT-011: durations, work dates and counts read as the web app shows them", () => {
    expect(formatDuration(225)).toBe("3h 45m");
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(120)).toBe("2h");
    expect(formatWorkDate("2026-10-16")).toBe("16 Oct 2026");
    expect(formatWorkDate("2026-03-05")).toBe("5 Mar 2026");
    expect(plural(1, "log")).toBe("1 log");
    expect(plural(3, "log")).toBe("3 logs");
    expect(plural(2, "log text")).toBe("2 log texts");
    expect(plural(2, "entry", "entries")).toBe("2 entries");
  });

  it("AC-17 FR-INT-010: the fingerprint tuples (D1)", () => {
    expect(
      pm4LogTuple(
        log({ text: "Sprint planning", durationMinutes: 60, booked: true }),
        "66f1a0c0e4b0000000000011"
      )
    ).toEqual(["Sprint planning", 60, "66f1a0c0e4b0000000000011", true]);
    const [long] = pm4LogTuple(log({ text: "y".repeat(400) }), "title:AI");
    expect(long).toBe("y".repeat(349) + "…");

    const event: RemoteEvent = {
      id: "66f1a0c0e4b00000000000e1",
      dayId: "66f1a0c0e4b00000000000d1",
      date: "2026-10-16",
      title: "Anthropic",
      taskId: "66f1a0c0e4b0000000000011",
      booked: false,
      logs: []
    };
    const remoteLog = {
      id: "66f1a0c0e4b00000000000f1",
      title: "Review",
      duration: 1.25
    };
    expect(pmspaLogTuple(remoteLog, event)).toEqual([
      "Review",
      75,
      "66f1a0c0e4b0000000000011",
      "Anthropic",
      false
    ]);
    expect(
      pmspaLogTuple(remoteLog, {
        ...event,
        taskId: null,
        title: "Internal",
        booked: true
      })
    ).toEqual(["Review", 75, null, "Internal", true]);
  });
});
