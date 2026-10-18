import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PmspaConnectionRepository } from "./pmspa-connection.repository.js";
import { PmspaLinksRepository } from "./pmspa-links.repository.js";
import { PmspaLinksService } from "./pmspa-links.service.js";
import { PmspaRemote } from "./pmspa-remote.js";
import { PmspaSyncRepository } from "./pmspa-sync.repository.js";

const PMSPA_USER = "a".repeat(24);
const SYNCED = new Date("2026-10-01T00:00:00.000Z");

describe("PmspaLinksService", () => {
  let service: PmspaLinksService;
  const links = {
    active: vi.fn(),
    byPm4: vi.fn(),
    delete: vi.fn()
  };
  const connections = { find: vi.fn() };
  const remote = {
    getProject: vi.fn(),
    getTask: vi.fn(),
    getDay: vi.fn()
  };
  const sync = { pm4LogWorkDate: vi.fn() };

  beforeEach(async () => {
    [links, connections, remote, sync].forEach((o) =>
      Object.values(o).forEach((fn) => fn.mockReset())
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PmspaLinksService,
        { provide: PmspaLinksRepository, useValue: links },
        { provide: PmspaConnectionRepository, useValue: connections },
        { provide: PmspaRemote, useValue: remote },
        { provide: PmspaSyncRepository, useValue: sync }
      ]
    }).compile();
    service = module.get(PmspaLinksService);
  });

  it("list: no connection or no account → []", async () => {
    connections.find.mockResolvedValue(null);
    expect(await service.list("u", "project")).toEqual([]);
    expect(links.active).not.toHaveBeenCalled();
  });

  it("list: maps the active links to pm4Id, origin and syncedAt", async () => {
    connections.find.mockResolvedValue({ pmspaUserId: PMSPA_USER });
    links.active.mockResolvedValue([
      {
        pm4Id: "p1",
        origin: "imported",
        syncedAt: SYNCED,
        pmspaId: "651fffb0".padEnd(24, "0")
      }
    ]);
    expect(await service.list("u", "project")).toEqual([
      {
        pm4Id: "p1",
        origin: "imported",
        syncedAt: SYNCED.toISOString(),
        pmspaCreatedAt: "2023-10-06T12:38:08.000Z"
      }
    ]);
  });

  it("unlink: no such link → 404", async () => {
    links.delete.mockResolvedValue(false);
    await expect(service.unlink("u", "task", "t1")).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  describe("detail: a time log", () => {
    const PMSPA_LOG = "d".repeat(24);
    const logLink = {
      pm4Id: "l1",
      pmspaId: PMSPA_LOG,
      pmspaUserId: PMSPA_USER,
      origin: "pushed",
      syncedAt: SYNCED
    };
    const day = {
      id: "e".repeat(24),
      date: "2026-10-16",
      start: 9,
      events: [
        {
          id: "f".repeat(24),
          dayId: "e".repeat(24),
          date: "2026-10-16",
          title: "Other",
          taskId: null,
          booked: false,
          logs: [{ id: "0".repeat(24), title: "Lunch", duration: 1 }]
        },
        {
          id: "1".repeat(24),
          dayId: "e".repeat(24),
          date: "2026-10-16",
          title: "Anthropic",
          taskId: null,
          booked: false,
          logs: [{ id: PMSPA_LOG, title: "Sprint planning", duration: 1 }]
        }
      ]
    };

    it("reads the log's event on its work date", async () => {
      connections.find.mockResolvedValue({ pmspaUserId: PMSPA_USER });
      links.byPm4.mockResolvedValue(logLink);
      sync.pm4LogWorkDate.mockResolvedValue("2026-10-16");
      remote.getDay.mockResolvedValue(day);

      expect(await service.detail("u", "time-log", "l1")).toEqual({
        origin: "pushed",
        syncedAt: SYNCED.toISOString(),
        pmspa: {
          type: "time-log",
          title: "Sprint planning",
          eventTitle: "Anthropic"
        }
      });
      expect(sync.pm4LogWorkDate).toHaveBeenCalledWith("u", "l1");
      expect(remote.getDay).toHaveBeenCalledWith("u", "2026-10-16");
    });

    it("gone from its day in PMSPA → pmspa null", async () => {
      connections.find.mockResolvedValue({ pmspaUserId: PMSPA_USER });
      links.byPm4.mockResolvedValue(logLink);
      sync.pm4LogWorkDate.mockResolvedValue("2026-10-16");
      remote.getDay.mockResolvedValue({ ...day, events: [day.events[0]] });

      expect((await service.detail("u", "time-log", "l1")).pmspa).toBeNull();
    });

    it("no PMSPA day on the work date → pmspa null", async () => {
      connections.find.mockResolvedValue({ pmspaUserId: PMSPA_USER });
      links.byPm4.mockResolvedValue(logLink);
      sync.pm4LogWorkDate.mockResolvedValue("2026-10-16");
      remote.getDay.mockResolvedValue(null);

      expect((await service.detail("u", "time-log", "l1")).pmspa).toBeNull();
    });

    it("a log that isn't the caller's → no PMSPA read, pmspa null", async () => {
      connections.find.mockResolvedValue({ pmspaUserId: PMSPA_USER });
      links.byPm4.mockResolvedValue(logLink);
      sync.pm4LogWorkDate.mockResolvedValue(null);

      expect((await service.detail("u", "time-log", "l1")).pmspa).toBeNull();
      expect(remote.getDay).not.toHaveBeenCalled();
    });
  });

  it("detail: a project gone in PMSPA → pmspa null", async () => {
    connections.find.mockResolvedValue({ pmspaUserId: PMSPA_USER });
    links.byPm4.mockResolvedValue({
      pm4Id: "p1",
      pmspaId: "b".repeat(24),
      pmspaUserId: PMSPA_USER,
      origin: "linked",
      syncedAt: SYNCED
    });
    remote.getProject.mockResolvedValue(null);

    expect(await service.detail("u", "project", "p1")).toEqual({
      origin: "linked",
      syncedAt: SYNCED.toISOString(),
      pmspa: null
    });
  });

  it("detail: a task reads its project's title", async () => {
    connections.find.mockResolvedValue({ pmspaUserId: PMSPA_USER });
    links.byPm4.mockResolvedValue({
      pm4Id: "t1",
      pmspaId: "b".repeat(24),
      pmspaUserId: PMSPA_USER,
      origin: "pushed",
      syncedAt: SYNCED
    });
    remote.getTask.mockResolvedValue({
      id: "b".repeat(24),
      projectId: "c".repeat(24),
      title: "PM",
      column: "In Progress"
    });
    remote.getProject.mockResolvedValue({ title: "Anthropic" });

    expect(await service.detail("u", "task", "t1")).toEqual({
      origin: "pushed",
      syncedAt: SYNCED.toISOString(),
      pmspa: {
        type: "task",
        title: "PM",
        projectTitle: "Anthropic",
        column: "In Progress"
      }
    });
  });

  it("detail: a link of another account → 404", async () => {
    connections.find.mockResolvedValue({ pmspaUserId: PMSPA_USER });
    links.byPm4.mockResolvedValue({
      pm4Id: "p1",
      pmspaId: "b".repeat(24),
      pmspaUserId: "c".repeat(24),
      origin: "linked",
      syncedAt: SYNCED
    });
    await expect(service.detail("u", "project", "p1")).rejects.toBeInstanceOf(
      NotFoundException
    );
  });
});
