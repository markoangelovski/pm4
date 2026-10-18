import { PmspaConnectionRepository } from "./pmspa-connection.repository.js";
import {
  PmspaLinksRepository,
  type LinkRow
} from "./pmspa-links.repository.js";
import {
  PmspaRemote,
  type RemoteDay,
  type RemoteEvent
} from "./pmspa-remote.js";
import { PmspaSyncRepository } from "./pmspa-sync.repository.js";
import { RowFailure, RunLinks, type Run } from "./pmspa-run.js";
import { PmspaTimeSyncService } from "./pmspa-time-sync.service.js";
import type { SyncPreviewItemDto } from "./dto/sync.dto.js";
import {
  mappedGroup,
  type TimeSnapshot,
  type Pm4DayLog
} from "./pmspa-time-preview.js";
import { fingerprint } from "./pmspa-fields.js";
import { groupDay, pm4LogTuple } from "./pmspa-time-fields.js";
import { TimeLogsService } from "../../time/time-logs.service.js";
import { WorkdaysService } from "../../time/workdays.service.js";

const USER = "u";
const PMSPA_USER = "a".repeat(24);
const DATE = "2026-10-14";

const event = (over: Partial<RemoteEvent> = {}): RemoteEvent => ({
  id: "ev1",
  dayId: "d1",
  date: DATE,
  title: "Meetings",
  taskId: "rt1",
  booked: false,
  logs: [{ id: "l1", title: "Standup", duration: 2 }],
  ...over
});

const day = (events: RemoteEvent[], start: number | null = 8): RemoteDay => ({
  id: "d1",
  date: DATE,
  start,
  events
});

const row = (over: Partial<SyncPreviewItemDto>): SyncPreviewItemDto =>
  ({
    key: "event:ev1",
    parentKey: "day:2026-10-14",
    type: "event",
    title: "Meetings",
    action: "create",
    reason: null,
    warnings: [],
    candidates: [],
    linkedId: null,
    detail: null,
    ...over
  }) as unknown as SyncPreviewItemDto;

const pm4Log = (over: Partial<Pm4DayLog> = {}): Pm4DayLog => ({
  id: "pm4-1",
  workDate: DATE,
  text: "Standup",
  title: "Standup",
  durationMinutes: 120,
  excludeFromStats: false,
  booked: false,
  task: null,
  project: null,
  ...over
});

describe("PmspaTimeSyncService", () => {
  let service: PmspaTimeSyncService;
  const remote = {
    getDay: vi.fn(),
    listProjects: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
    createLog: vi.fn(),
    updateLog: vi.fn(),
    deleteLog: vi.fn()
  };
  const connections = { find: vi.fn() };
  const links = { logLinks: vi.fn(), save: vi.fn() };
  const sync = {
    pm4Starts: vi.fn(),
    pm4Logs: vi.fn(),
    pm4Task: vi.fn()
  };
  const timeLogs = { create: vi.fn(), update: vi.fn() };
  const workdays = { setStart: vi.fn() };

  /** A run over `s` with the task link rt1 → t1 and the given day. */
  function runOf(
    events: RemoteEvent[],
    start: number | null = 8,
    logLinks = new Map<string, LinkRow>()
  ): Run {
    const s: TimeSnapshot = {
      timeZone: "Europe/Berlin",
      today: "2026-10-17",
      pm4Projects: [],
      pm4Tasks: [],
      remoteProjects: [],
      remoteTasks: [],
      links: [],
      remoteDays: [day(events, start)],
      pm4Logs: [],
      pm4Starts: { [DATE]: null },
      logLinks: []
    };
    const links = new RunLinks(s);
    links.set("task", "t1", "rt1");
    return {
      userId: USER,
      now: new Date("2026-10-17T10:00:00Z"),
      from: "pmspa",
      snapshot: s,
      pmspaUserId: PMSPA_USER,
      links,
      logLinks
    };
  }

  beforeEach(() => {
    [remote, connections, links, sync, timeLogs, workdays].forEach((o) =>
      Object.values(o).forEach((fn) => fn.mockReset())
    );
    service = new PmspaTimeSyncService(
      remote as unknown as PmspaRemote,
      connections as unknown as PmspaConnectionRepository,
      links as unknown as PmspaLinksRepository,
      sync as unknown as PmspaSyncRepository,
      timeLogs as unknown as TimeLogsService,
      workdays as unknown as WorkdaysService
    );
    sync.pm4Task.mockResolvedValue({ id: "t1", projectId: "p1" });
    sync.pm4Logs.mockResolvedValue([pm4Log()]);
    timeLogs.create.mockResolvedValue({ id: "pm4-1" });
    timeLogs.update.mockResolvedValue({ id: "pm4-1" });
    links.save.mockResolvedValue(undefined);
  });

  describe("importDayRow", () => {
    it("sets the PM4 start from PMSPA's when PM4 has none", async () => {
      const run = runOf([event()], 8.5);
      const res = await service.importDayRow(
        run,
        row({ key: `day:${DATE}`, type: "day", action: "create" })
      );
      expect(workdays.setStart).toHaveBeenCalledWith(USER, DATE, 510);
      expect(res).toMatchObject({ outcome: "created" });
    });

    it("keeps PM4's start and reports updated", async () => {
      const run = runOf([event()], 8.5);
      (run.snapshot as TimeSnapshot).pm4Starts = { [DATE]: 540 };
      const res = await service.importDayRow(
        run,
        row({ key: `day:${DATE}`, type: "day", action: "update" })
      );
      expect(workdays.setStart).not.toHaveBeenCalled();
      expect(res).toMatchObject({ outcome: "updated" });
    });

    it("writes nothing when PMSPA has no start", async () => {
      const run = runOf([event()], null);
      await service.importDayRow(run, row({ key: `day:${DATE}`, type: "day" }));
      expect(workdays.setStart).not.toHaveBeenCalled();
    });
  });

  describe("importEventRow", () => {
    it("creates an unlinked log on the mapped task, titled by the event, and links it as imported", async () => {
      const run = runOf([event()]);
      const res = await service.importEventRow(run, row({ action: "create" }));

      expect(timeLogs.create).toHaveBeenCalledWith(USER, {
        workDate: DATE,
        durationMinutes: 120,
        text: "Standup",
        excludeFromStats: false,
        dayStartMinute: 480,
        taskId: "t1",
        projectId: "p1",
        title: "Meetings"
      });
      expect(links.save).toHaveBeenCalledWith(
        USER,
        expect.objectContaining({
          type: "time-log",
          pm4Id: "pm4-1",
          pmspaId: "l1",
          pmspaUserId: PMSPA_USER,
          origin: "imported",
          syncedAt: run.now
        })
      );
      expect(run.logLinks.get("l1")).toMatchObject({ pm4Id: "pm4-1" });
      expect(res).toMatchObject({ outcome: "created", reason: null });
    });

    it("imports to Unsorted when the event has no task link", async () => {
      const run = runOf([event({ taskId: null })]);
      await service.importEventRow(run, row({ action: "create" }));
      expect(timeLogs.create).toHaveBeenCalledWith(
        USER,
        expect.objectContaining({ taskId: null, projectId: null })
      );
    });

    it("cuts a long event title to 100 characters for the created log", async () => {
      const run = runOf([event({ title: "x".repeat(150), taskId: null })]);
      await service.importEventRow(run, row({ action: "create" }));
      expect(timeLogs.create).toHaveBeenCalledWith(
        USER,
        expect.objectContaining({ title: `${"x".repeat(99)}…` })
      );
    });

    it("marks the logs of a nonprod event excluded from statistics", async () => {
      const run = runOf([event({ title: " NonProd ", taskId: null })]);
      await service.importEventRow(run, row({ action: "create" }));
      expect(timeLogs.create).toHaveBeenCalledWith(
        USER,
        expect.objectContaining({ excludeFromStats: true, taskId: null })
      );
    });

    it("updates a linked log without its title, and keeps task and project of an excluded nonprod log", async () => {
      const link = {
        type: "time-log",
        pm4Id: "pm4-1",
        pmspaId: "l1",
        pmspaUserId: PMSPA_USER,
        origin: "imported",
        syncedAt: new Date(),
        pm4Hash: Buffer.alloc(8),
        pmspaHash: Buffer.alloc(8)
      } as const;
      const run = runOf(
        [event({ title: "nonprod", taskId: null })],
        8,
        new Map([["l1", link]])
      );
      (run.snapshot as TimeSnapshot).pm4Logs = [
        pm4Log({ excludeFromStats: true })
      ];
      await service.importEventRow(run, row({ action: "update" }));
      const fields = timeLogs.update.mock.calls[0][2] as Record<
        string,
        unknown
      >;
      expect(timeLogs.update).toHaveBeenCalledWith(
        USER,
        "pm4-1",
        expect.any(Object)
      );
      expect(fields).not.toHaveProperty("title");
      expect(fields).not.toHaveProperty("taskId");
      expect(fields).not.toHaveProperty("projectId");
      expect(fields).toMatchObject({
        excludeFromStats: true,
        durationMinutes: 120
      });
    });

    it("sends the task and project of a linked log that isn't excluded", async () => {
      const link = {
        type: "time-log",
        pm4Id: "pm4-1",
        pmspaId: "l1",
        pmspaUserId: PMSPA_USER,
        origin: "imported",
        syncedAt: new Date(),
        pm4Hash: Buffer.alloc(8),
        pmspaHash: Buffer.alloc(8)
      } as const;
      const run = runOf([event()], 8, new Map([["l1", link]]));
      (run.snapshot as TimeSnapshot).pm4Logs = [pm4Log()];
      await service.importEventRow(run, row({ action: "update" }));
      expect(timeLogs.update).toHaveBeenCalledWith(
        USER,
        "pm4-1",
        expect.objectContaining({ taskId: "t1", projectId: "p1" })
      );
    });

    it("skips off-step logs, reports them as failed, and imports the others", async () => {
      const run = runOf([
        event({
          logs: [
            { id: "l1", title: "Development", duration: 0.3 },
            { id: "l2", title: "Standup", duration: 2 }
          ],
          title: "Development",
          taskId: null
        })
      ]);
      sync.pm4Logs.mockResolvedValue([
        pm4Log({ id: "pm4-2", durationMinutes: 120 })
      ]);
      timeLogs.create.mockResolvedValue({ id: "pm4-2" });
      const res = await service.importEventRow(run, row({ action: "create" }));
      expect(timeLogs.create).toHaveBeenCalledTimes(1);
      expect(res).toEqual(
        expect.objectContaining({
          outcome: "failed",
          reason:
            "A log of 0.3 h isn't in 0.25 h steps (1 other log was imported)."
        })
      );
    });

    it("takes the event's title as the text of a log with an empty title (OQ-194)", async () => {
      const run = runOf([
        event({ logs: [{ id: "l1", title: "   ", duration: 2 }] })
      ]);
      const res = await service.importEventRow(run, row({ action: "create" }));
      expect(timeLogs.create).toHaveBeenCalledWith(
        USER,
        expect.objectContaining({ text: "Meetings" })
      );
      expect(res).toMatchObject({ outcome: "created", reason: null });
    });

    it("trims the log's title for the text and the event's title for the PM4 title", async () => {
      const run = runOf([
        event({
          title: "  Meetings  ",
          logs: [{ id: "l1", title: `  ${"y".repeat(1000)}  `, duration: 2 }]
        })
      ]);
      await service.importEventRow(run, row({ action: "create" }));
      expect(timeLogs.create).toHaveBeenCalledWith(
        USER,
        expect.objectContaining({ text: "y".repeat(1000), title: "Meetings" })
      );
    });

    it("sends a null title when the event's title is blank", async () => {
      const run = runOf([event({ title: "   ", taskId: null })]);
      await service.importEventRow(run, row({ action: "create" }));
      expect(timeLogs.create).toHaveBeenCalledWith(
        USER,
        expect.objectContaining({ title: null })
      );
    });

    it("fails a 0 h log alone and imports the others", async () => {
      const run = runOf([
        event({
          logs: [
            { id: "l1", title: "Zero", duration: 0 },
            { id: "l2", title: "Standup", duration: 2 }
          ]
        })
      ]);
      const res = await service.importEventRow(run, row({ action: "create" }));
      expect(timeLogs.create).toHaveBeenCalledTimes(1);
      expect(timeLogs.create).toHaveBeenCalledWith(
        USER,
        expect.objectContaining({ text: "Standup", durationMinutes: 120 })
      );
      expect(res).toEqual(
        expect.objectContaining({
          outcome: "failed",
          reason:
            "A log of 0 h isn't between 0.25 h and 24 h (1 other log was imported)."
        })
      );
    });

    it("fails a log over 24 h alone and imports the others", async () => {
      const run = runOf([
        event({
          logs: [
            { id: "l1", title: "Long", duration: 25 },
            { id: "l2", title: "Standup", duration: 2 }
          ]
        })
      ]);
      const res = await service.importEventRow(run, row({ action: "create" }));
      expect(timeLogs.create).toHaveBeenCalledTimes(1);
      expect(res).toEqual(
        expect.objectContaining({
          outcome: "failed",
          reason:
            "A log of 25 h isn't between 0.25 h and 24 h (1 other log was imported)."
        })
      );
    });

    it("fails a log whose title is over 1000 characters alone and imports the others", async () => {
      const run = runOf([
        event({
          logs: [
            { id: "l1", title: "x".repeat(1001), duration: 2 },
            { id: "l2", title: "Standup", duration: 2 }
          ]
        })
      ]);
      const res = await service.importEventRow(run, row({ action: "create" }));
      expect(timeLogs.create).toHaveBeenCalledTimes(1);
      expect(res).toEqual(
        expect.objectContaining({
          outcome: "failed",
          reason:
            "A log's text is over 1000 characters (1 other log was imported)."
        })
      );
    });

    it("fails a log with no text in either its title or the event's, alone, and imports the others", async () => {
      const run = runOf([
        event({
          title: "  ",
          taskId: null,
          logs: [
            { id: "l1", title: " ", duration: 2 },
            { id: "l2", title: "Standup", duration: 2 }
          ]
        })
      ]);
      const res = await service.importEventRow(run, row({ action: "create" }));
      expect(timeLogs.create).toHaveBeenCalledTimes(1);
      expect(timeLogs.create).toHaveBeenCalledWith(
        USER,
        expect.objectContaining({ text: "Standup" })
      );
      expect(res).toEqual(
        expect.objectContaining({
          outcome: "failed",
          reason: "A log has no text (1 other log was imported)."
        })
      );
    });

    it("counts the imported logs in the reason when two of three fail (OQ-196)", async () => {
      const run = runOf([
        event({
          logs: [
            { id: "l1", title: "Development", duration: 0.3 },
            { id: "l2", title: "Zero", duration: 0 },
            { id: "l3", title: "Standup", duration: 2 }
          ]
        })
      ]);
      const res = await service.importEventRow(run, row({ action: "create" }));
      expect(timeLogs.create).toHaveBeenCalledTimes(1);
      expect(res).toEqual(
        expect.objectContaining({
          outcome: "failed",
          reason:
            "A log of 0.3 h isn't in 0.25 h steps (1 other log was imported)."
        })
      );
    });

    it("counts the imported logs in the reason when one of three fails (OQ-196)", async () => {
      const run = runOf([
        event({
          logs: [
            { id: "l1", title: "Development", duration: 0.3 },
            { id: "l2", title: "Standup", duration: 2 },
            { id: "l3", title: "Review", duration: 1 }
          ]
        })
      ]);
      const res = await service.importEventRow(run, row({ action: "create" }));
      expect(timeLogs.create).toHaveBeenCalledTimes(2);
      expect(res).toEqual(
        expect.objectContaining({
          outcome: "failed",
          reason:
            "A log of 0.3 h isn't in 0.25 h steps (2 other logs were imported)."
        })
      );
    });

    it("says no other logs were imported when every log fails (OQ-196)", async () => {
      const run = runOf([
        event({
          logs: [
            { id: "l1", title: "Development", duration: 0.3 },
            { id: "l2", title: "Zero", duration: 0 },
            { id: "l3", title: "Long", duration: 25 }
          ]
        })
      ]);
      const res = await service.importEventRow(run, row({ action: "create" }));
      expect(timeLogs.create).not.toHaveBeenCalled();
      expect(res).toEqual(
        expect.objectContaining({
          outcome: "failed",
          reason:
            "A log of 0.3 h isn't in 0.25 h steps (no other logs were imported)."
        })
      );
    });

    it("sends the day's start with a create when the day row didn't run", async () => {
      const run = runOf([event()], 8.5);
      (run.snapshot as TimeSnapshot).pm4Starts = { [DATE]: null };
      await service.importEventRow(run, row({ action: "create" }));
      expect(workdays.setStart).not.toHaveBeenCalled();
      expect(timeLogs.create).toHaveBeenCalledWith(
        USER,
        expect.objectContaining({ dayStartMinute: 510 })
      );
    });

    it("sends 0 as the day's start when PMSPA has no start", async () => {
      const run = runOf([event()], null);
      await service.importEventRow(run, row({ action: "create" }));
      expect(timeLogs.create).toHaveBeenCalledWith(
        USER,
        expect.objectContaining({ dayStartMinute: 0 })
      );
    });

    it("fails with RowFailure when the event isn't in the snapshot", async () => {
      const run = runOf([event()]);
      await expect(
        service.importEventRow(run, row({ key: "event:missing" }))
      ).rejects.toBeInstanceOf(RowFailure);
      expect(timeLogs.create).not.toHaveBeenCalled();
    });
  });

  describe("push (pushDayRow, pushEventRow)", () => {
    const pushRun = (events: RemoteEvent[], logs: Pm4DayLog[]): Run => {
      const run = runOf(events, 8);
      run.from = "pm4";
      (run.snapshot as TimeSnapshot).pm4Logs = logs;
      (run.snapshot as TimeSnapshot).pm4Starts = { [DATE]: 480 };
      return run;
    };
    const eventRow = (key: string, action = "create") =>
      row({ key: `event:${key}`, action: action as "create" });

    it("the day row writes nothing", async () => {
      const run = pushRun([], []);
      const res = await service.pushDayRow(
        run,
        row({ key: `day:${DATE}`, type: "day", action: "create" })
      );
      expect(res.outcome).toBe("created");
      expect(remote.createEvent).not.toHaveBeenCalled();
    });

    it("creates the event, renames its first log and links each log as pushed", async () => {
      const run = pushRun(
        [],
        [
          pm4Log({ id: "a", text: "First", title: "Dev" }),
          pm4Log({ id: "b", text: "Second", title: "Dev" })
        ]
      );
      const created = day([
        event({
          id: "e9",
          title: "Dev",
          taskId: null,
          logs: [
            { id: "x1", title: "Dev", duration: 2 },
            { id: "x2", title: "Second", duration: 2 }
          ]
        })
      ]);
      remote.getDay.mockResolvedValue(created);
      const res = await service.pushEventRow(
        run,
        eventRow("unsorted:Dev"),
        DATE
      );
      expect(remote.createEvent).toHaveBeenCalledWith(USER, {
        day: DATE,
        start: 8,
        title: "Dev",
        task: null,
        duration: 2
      });
      expect(remote.createLog).toHaveBeenCalledWith(USER, "e9", {
        title: "Second",
        duration: 2
      });
      expect(remote.updateLog).toHaveBeenCalledWith(USER, "x1", {
        title: "First",
        duration: 2
      });
      expect(links.save).toHaveBeenCalledTimes(2);
      expect(links.save.mock.calls[0]?.[1]).toMatchObject({
        type: "time-log",
        pm4Id: "a",
        pmspaId: "x1",
        origin: "pushed"
      });
      expect(res.outcome).toBe("created");
    });

    it("moves a log to another event and deletes the event left empty", async () => {
      const old = event({
        id: "old",
        title: "PM",
        taskId: null,
        logs: [{ id: "ol", title: "Text", duration: 2 }]
      });
      const target = event({
        id: "tgt",
        title: "Meetings",
        taskId: null,
        logs: []
      });
      const run = pushRun(
        [old, target],
        [pm4Log({ id: "a", text: "Text", title: "Meetings" })]
      );
      run.logLinks.set("a", {
        type: "time-log",
        pm4Id: "a",
        pmspaId: "ol",
        pmspaUserId: PMSPA_USER,
        origin: "pushed",
        syncedAt: new Date(),
        pm4Hash: Buffer.alloc(0),
        pmspaHash: Buffer.alloc(0)
      } as unknown as LinkRow);
      remote.getDay.mockResolvedValue(
        day([
          { ...old, logs: [] },
          { ...target, logs: [{ id: "nl", title: "Text", duration: 2 }] }
        ])
      );
      await service.pushEventRow(
        run,
        eventRow("unsorted:Meetings", "update"),
        DATE
      );
      expect(remote.deleteLog).toHaveBeenCalledWith(USER, "ol");
      expect(remote.createLog).toHaveBeenCalledWith(USER, "tgt", {
        title: "Text",
        duration: 2
      });
      expect(remote.deleteEvent).toHaveBeenCalledWith(USER, "d1", "old");
      expect(links.save.mock.calls[0]?.[1]).toMatchObject({ pmspaId: "nl" });
    });

    it("fails when the group's task isn't in PMSPA", async () => {
      const run = pushRun(
        [],
        [
          pm4Log({
            task: { id: "t9", title: "T", deleted: false },
            project: { id: "p9", title: "P", deleted: false }
          })
        ]
      );
      await expect(
        service.pushEventRow(run, eventRow("task:t9"), DATE)
      ).rejects.toThrow("Its task isn't in PMSPA (it was left out).");
    });

    it("fails with RowFailure when the group isn't in the day", async () => {
      const run = pushRun([], [pm4Log()]);
      await expect(
        service.pushEventRow(run, eventRow("task:none"), DATE)
      ).rejects.toBeInstanceOf(RowFailure);
    });
  });

  describe("time-log hash key", () => {
    it("a saved link's pm4Hash matches mappedGroup when the task's link wasn't read", async () => {
      const run = runOf([event()]);
      const snap = run.snapshot as TimeSnapshot;
      // A task link in the snapshot that the run doesn't know (not usable): mappedGroup finds it, RunLinks doesn't.
      snap.links = [
        {
          type: "task",
          pm4Id: "t2",
          pmspaId: "rt2",
          pmspaUserId: PMSPA_USER,
          origin: "imported",
          syncedAt: new Date(0),
          pm4Hash: Buffer.alloc(0),
          pmspaHash: Buffer.alloc(0)
        }
      ];
      expect(run.links.pmspaOf("task", "t2")).toBeUndefined();
      const logged = pm4Log({ task: { id: "t2", title: "T", deleted: false } });
      sync.pm4Logs.mockResolvedValue([logged]);
      const remoteEvent = event();

      await (
        service as unknown as {
          saveTimeLink: (
            r: Run,
            id: string,
            l: RemoteEvent["logs"][number],
            e: RemoteEvent
          ) => Promise<void>;
        }
      ).saveTimeLink(run, "pm4-1", remoteEvent.logs[0], remoteEvent);

      const saved = links.save.mock.calls[0][1] as LinkRow;
      const expected = fingerprint(
        pm4LogTuple(logged, mappedGroup(groupDay([logged])[0], snap))
      );
      expect(saved.pm4Hash.equals(expected)).toBe(true);
      expect(mappedGroup(groupDay([logged])[0], snap)).toBe("rt2");
    });
  });
});
