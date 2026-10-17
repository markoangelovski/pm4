import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PmspaConnectionRepository } from "./pmspa-connection.repository.js";
import { PmspaLinksRepository } from "./pmspa-links.repository.js";
import { PmspaLinksService } from "./pmspa-links.service.js";
import { PmspaRemote } from "./pmspa-remote.js";

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
    getTask: vi.fn()
  };

  beforeEach(async () => {
    [links, connections, remote].forEach((o) =>
      Object.values(o).forEach((fn) => fn.mockReset())
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PmspaLinksService,
        { provide: PmspaLinksRepository, useValue: links },
        { provide: PmspaConnectionRepository, useValue: connections },
        { provide: PmspaRemote, useValue: remote }
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
      { pm4Id: "p1", origin: "imported", syncedAt: SYNCED, pmspaId: "x" }
    ]);
    expect(await service.list("u", "project")).toEqual([
      { pm4Id: "p1", origin: "imported", syncedAt: SYNCED.toISOString() }
    ]);
  });

  it("unlink: no such link → 404", async () => {
    links.delete.mockResolvedValue(false);
    await expect(service.unlink("u", "task", "t1")).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it("detail: time-log links have no detail yet → 404", async () => {
    await expect(service.detail("u", "time-log", "l1")).rejects.toBeInstanceOf(
      NotFoundException
    );
    expect(links.byPm4).not.toHaveBeenCalled();
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
