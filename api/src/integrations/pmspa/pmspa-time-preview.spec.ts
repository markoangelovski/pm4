import { describe, expect, it } from "vitest";
import { fingerprint } from "./pmspa-fields.js";
import type { LinkRow } from "./pmspa-links.repository.js";
import type { RemoteDay, RemoteEvent } from "./pmspa-remote.js";
import { groupDay, pm4LogTuple, pmspaLogTuple } from "./pmspa-time-fields.js";
import {
  importTimeRows,
  mappedGroup,
  pushDayRows,
  usableLogLinks,
  type Pm4DayLog,
  type TimeSnapshot
} from "./pmspa-time-preview.js";

const DATE = "2026-10-16";

const log = (id: string, over: Partial<Pm4DayLog> = {}): Pm4DayLog => ({
  id,
  workDate: DATE,
  text: `text ${id}`,
  title: null,
  durationMinutes: 60,
  excludeFromStats: false,
  bookedMinutes: 0,
  task: null,
  project: null,
  ...over
});

const event = (
  id: string,
  title: string,
  logs: { id: string; title: string; duration: number }[],
  over: Partial<RemoteEvent> = {}
): RemoteEvent => ({
  id,
  dayId: "d1",
  date: DATE,
  title,
  taskId: null,
  logs,
  ...over
});

const day = (events: RemoteEvent[], start: number | null = 9): RemoteDay => ({
  id: "d1",
  date: DATE,
  start,
  events
});

const snapshot = (over: Partial<TimeSnapshot> = {}): TimeSnapshot => ({
  timeZone: "Europe/Zagreb",
  pm4Projects: [],
  pm4Tasks: [],
  remoteProjects: [],
  remoteTasks: [],
  links: [],
  today: "2026-10-17",
  remoteDays: [],
  pm4Logs: [],
  pm4Starts: {},
  logLinks: [],
  ...over
});

const logLink = (
  pm4Id: string,
  pmspaId: string,
  over: Partial<LinkRow> = {}
): LinkRow => ({
  type: "time-log",
  pm4Id,
  pmspaId,
  pmspaUserId: "u",
  origin: "imported",
  syncedAt: new Date(0),
  pm4Hash: Buffer.alloc(0),
  pmspaHash: Buffer.alloc(0),
  ...over
});

/** A link whose hashes match both sides as they are now. */
function syncedLink(s: TimeSnapshot, pm4Id: string, pmspaId: string) {
  const l = s.pm4Logs.find((x) => x.id === pm4Id)!;
  const e = s.remoteDays
    .flatMap((d) => d.events)
    .find((x) => x.logs.some((y) => y.id === pmspaId))!;
  const r = e.logs.find((y) => y.id === pmspaId)!;
  return logLink(pm4Id, pmspaId, {
    pm4Hash: fingerprint(pm4LogTuple(l, mappedGroup(groupDay([l])[0], s))),
    pmspaHash: fingerprint(pmspaLogTuple(r, e))
  });
}

describe("importTimeRows", () => {
  it("a future date is one skipped day row", () => {
    const rows = importTimeRows(snapshot(), {
      projects: [],
      dates: ["2026-10-18"]
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      key: "day:2026-10-18",
      type: "day",
      title: "18 Oct 2026",
      action: "skip",
      reason: "In the future: PM4 doesn't log future time."
    });
  });

  it("an unlinked day: parents first, the day row, one row per event", () => {
    const s = snapshot({
      remoteProjects: [
        {
          id: "p1",
          userId: "u",
          title: "Nvidia",
          description: null,
          pl: null,
          kanboard: null,
          done: false,
          taskCount: 1
        }
      ],
      remoteTasks: [
        {
          id: "t1",
          projectId: "p1",
          title: "Release",
          description: null,
          column: "In progress",
          pl: null,
          kanboard: null,
          dueAt: 0
        } as never
      ],
      remoteDays: [
        day([
          event(
            "e1",
            "Release",
            [
              { id: "l1", title: "a", duration: 1 },
              { id: "l2", title: "b", duration: 1.25 }
            ],
            { taskId: "t1" }
          ),
          event("e2", "nonprod", [{ id: "l3", title: "c", duration: 0.5 }])
        ])
      ]
    });
    const rows = importTimeRows(s, { projects: [], dates: [DATE] });
    expect(rows.map((r) => r.key)).toEqual([
      "project:p1",
      "task:t1",
      `day:${DATE}`,
      "event:e1",
      "event:e2"
    ]);
    expect(rows[1]).toMatchObject({
      parent: true,
      reason: "Parent of an imported event from 16 Oct 2026"
    });
    expect(rows[2]).toMatchObject({
      title: "16 Oct 2026",
      detail: "3 logs · 2h 45m",
      action: "create",
      reason: null
    });
    expect(rows[3]).toMatchObject({
      parentKey: `day:${DATE}`,
      taskPath: { projectTitle: "Nvidia", taskTitle: "Release" },
      detail: "2 logs · 2h 15m",
      action: "create",
      warnings: []
    });
    expect(rows[4].detail).toBe(
      "No task → Unsorted, excluded from statistics · 1 log · 30m"
    );
  });

  it("a day and an event without logs are skipped as 'No logs'", () => {
    const s = snapshot({
      remoteDays: [
        day([
          event("e1", "Empty", []),
          event("e2", "Misc", [{ id: "l1", title: "a", duration: 1 }])
        ])
      ]
    });
    const rows = importTimeRows(s, { projects: [], dates: [DATE] });
    expect(rows[1]).toMatchObject({
      key: "event:e1",
      action: "skip",
      reason: "No logs"
    });
    expect(rows[0]).toMatchObject({
      key: `day:${DATE}`,
      action: "create",
      reason: null
    });
    expect(rows[2]).toMatchObject({ key: "event:e2", action: "create" });

    const none = importTimeRows(snapshot({ remoteDays: [day([])] }), {
      projects: [],
      dates: [DATE]
    });
    expect(none).toHaveLength(1);
    expect(none[0]).toMatchObject({
      type: "day",
      action: "skip",
      reason: "No logs"
    });
  });

  it("warns about off-step logs", () => {
    const s = snapshot({
      remoteDays: [
        day([event("e1", "Misc", [{ id: "l1", title: "a", duration: 0.3 }])])
      ]
    });
    const rows = importTimeRows(s, { projects: [], dates: [DATE] });
    expect(rows[1].warnings).toEqual([
      "1 log of 0.3 h isn't in 0.25 h steps and will fail."
    ]);
  });

  it("a fully linked, unchanged day is skipped as already imported; a changed one updates and warns on both-sides changes", () => {
    const s = snapshot({
      pm4Logs: [log("a")],
      remoteDays: [
        day([event("e1", "Misc", [{ id: "r1", title: "text a", duration: 1 }])])
      ]
    });
    s.logLinks = [syncedLink(s, "a", "r1")];
    let rows = importTimeRows(s, { projects: [], dates: [DATE] });
    expect(rows[0]).toMatchObject({
      action: "skip",
      reason: "Already imported"
    });
    expect(rows[1]).toMatchObject({
      action: "skip",
      reason: "Already imported"
    });

    s.remoteDays[0].events[0].logs[0].title = "changed";
    s.pm4Logs[0].text = "changed in pm4";
    rows = importTimeRows(s, { projects: [], dates: [DATE] });
    expect(rows[0]).toMatchObject({ action: "update", reason: null });
    expect(rows[1]).toMatchObject({
      action: "update",
      warnings: [
        "1 log also changed in PM4 since the last sync: PM4's version is overwritten."
      ]
    });
  });

  it("a partly linked day updates", () => {
    const s = snapshot({
      pm4Logs: [log("a")],
      remoteDays: [
        day([
          event("e1", "Misc", [
            { id: "r1", title: "text a", duration: 1 },
            { id: "r2", title: "new", duration: 1 }
          ])
        ])
      ]
    });
    s.logLinks = [syncedLink(s, "a", "r1")];
    const rows = importTimeRows(s, { projects: [], dates: [DATE] });
    expect(rows[0]).toMatchObject({ action: "update", reason: null });
  });
});

describe("usableLogLinks and mappedGroup", () => {
  it("import needs the PMSPA log in the snapshot, push doesn't", () => {
    const s = snapshot({
      pm4Logs: [log("a")],
      remoteDays: [
        day([event("e1", "x", [{ id: "r1", title: "t", duration: 1 }])])
      ],
      logLinks: [logLink("a", "r1"), logLink("a", "gone"), logLink("zz", "r1")]
    });
    expect(usableLogLinks(s, "import").map((l) => l.pmspaId)).toEqual(["r1"]);
    expect(usableLogLinks(s, "push").map((l) => l.pmspaId)).toEqual([
      "r1",
      "gone"
    ]);
  });

  it("maps a task group to its PMSPA task id, else to the title", () => {
    const g = {
      key: "task:t",
      title: "T",
      taskId: "t",
      projectId: null,
      logs: [],
      note: null
    };
    expect(mappedGroup(g, snapshot())).toBe("title:T");
  });
});

describe("pushDayRows", () => {
  const task = { id: "t1", title: "Meetings", deleted: false };
  const project = { id: "p1", title: "Anthropic", deleted: false };

  it("no logs, no rows", () => {
    expect(pushDayRows(snapshot(), DATE)).toEqual([]);
  });

  it("an unpushed day: the day row then one row per group", () => {
    const s = snapshot({
      pm4Logs: [
        log("a", { task, project }),
        log("b", { excludeFromStats: true, durationMinutes: 30 }),
        log("c", { title: "AI", text: "x".repeat(400), durationMinutes: 15 })
      ]
    });
    const rows = pushDayRows(s, DATE);
    expect(rows.map((r) => r.key)).toEqual([
      `day:${DATE}`,
      "event:task:t1",
      "event:unsorted:nonprod",
      "event:unsorted:AI · Time"
    ]);
    expect(rows[0]).toMatchObject({
      detail: "3 events · 3 logs · 1h 45m",
      action: "create",
      reason: null
    });
    expect(rows[1].taskPath).toEqual({
      projectTitle: "Anthropic",
      taskTitle: "Meetings"
    });
    expect(rows[1].detail).toBe("1 log · 1h");
    expect(rows[2].taskPath).toBeUndefined();
    expect(rows[2].detail).toBe(
      "No task · Excluded from statistics · 1 log · 30m"
    );
    expect(rows[3].warnings).toEqual([
      "1 log text over 350 characters: cut to 349 + “…”."
    ]);
  });

  it("an unchanged pushed day is skipped; a changed log updates; a PMSPA start mismatch warns", () => {
    const s = snapshot({
      pm4Logs: [log("a")],
      pm4Starts: { [DATE]: 540 },
      remoteDays: [
        day(
          [
            event("e1", "Unsorted", [
              { id: "r1", title: "text a", duration: 1 }
            ])
          ],
          10.5
        )
      ]
    });
    s.logLinks = [syncedLink(s, "a", "r1")];
    let rows = pushDayRows(s, DATE);
    expect(rows[0]).toMatchObject({
      action: "skip",
      reason: "No changes since the last sync",
      warnings: [
        "PMSPA keeps 10:30: a day's start changes only when an event is added."
      ]
    });
    expect(rows[1]).toMatchObject({
      action: "skip",
      reason: "No changes since the last sync"
    });

    s.pm4Logs[0].text = "edited";
    s.remoteDays[0].events[0].logs[0].title = "edited remotely";
    rows = pushDayRows(s, DATE);
    expect(rows[1]).toMatchObject({
      action: "update",
      reason: null,
      warnings: [
        "1 log also changed in PMSPA since the last sync: PMSPA's version is overwritten."
      ]
    });
  });

  it("a linked log whose PMSPA log is on another day updates and warns (D10)", () => {
    const s = snapshot({
      pm4Logs: [log("a")],
      remoteDays: [day([])],
      logLinks: [logLink("a", "elsewhere")]
    });
    const rows = pushDayRows(s, DATE);
    expect(rows[1]).toMatchObject({
      action: "update",
      warnings: [
        "1 log moves here in PMSPA from another day; an event left empty there stays."
      ]
    });
  });

  it("a linked log in another event of the day warns about the move", () => {
    const s = snapshot({
      pm4Logs: [log("a", { title: "Solo" })],
      remoteDays: [
        day([event("e1", "Other", [{ id: "r1", title: "t", duration: 1 }])])
      ]
    });
    s.logLinks = [syncedLink(s, "a", "r1")];
    const rows = pushDayRows(s, DATE);
    expect(rows[1].warnings).toEqual([
      "1 log moves here in PMSPA from another event; an event left empty is deleted."
    ]);
  });
});
