import { Test, TestingModule } from "@nestjs/testing";
import { PmspaBrowseController } from "./pmspa-browse.controller.js";
import { PmspaConnectionRepository } from "./pmspa-connection.repository.js";
import { PmspaLinksRepository } from "./pmspa-links.repository.js";
import { PmspaRemote } from "./pmspa-remote.js";
import { PmspaSyncRepository } from "./pmspa-sync.repository.js";

const PMSPA_USER = "a".repeat(24);
const SYNCED = new Date("2026-10-01T00:00:00.000Z");

describe("PmspaBrowseController", () => {
  let controller: PmspaBrowseController;
  const remote = {
    listProjects: vi.fn(),
    listTasks: vi.fn()
  };
  const connections = { find: vi.fn() };
  const links = { active: vi.fn() };
  const sync = { titles: vi.fn() };
  const user = { id: "user-1" };

  beforeEach(async () => {
    [remote, connections, links, sync].forEach((o) =>
      Object.values(o).forEach((fn) => fn.mockReset())
    );
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PmspaBrowseController],
      providers: [
        { provide: PmspaRemote, useValue: remote },
        { provide: PmspaConnectionRepository, useValue: connections },
        { provide: PmspaLinksRepository, useValue: links },
        { provide: PmspaSyncRepository, useValue: sync }
      ]
    }).compile();

    controller = module.get(PmspaBrowseController);
    connections.find.mockResolvedValue({ pmspaUserId: PMSPA_USER });
    sync.titles.mockResolvedValue(new Map([["pm4-p", "Tesla PM4"]]));
  });

  it("projects: attaches the active link by PMSPA id, with the PM4 title", async () => {
    remote.listProjects.mockResolvedValue([
      { id: "p1", title: "Tesla", done: false, taskCount: 3 },
      { id: "p2", title: "Other", done: true, taskCount: 0 }
    ]);
    links.active.mockResolvedValue([
      {
        type: "project",
        pm4Id: "pm4-p",
        pmspaId: "p1",
        pmspaUserId: PMSPA_USER,
        origin: "linked",
        syncedAt: SYNCED
      }
    ]);

    const res = await controller.projects(user);

    expect(links.active).toHaveBeenCalledWith("user-1", PMSPA_USER, "project");
    expect(res.items[0]).toEqual({
      id: "p1",
      title: "Tesla",
      done: false,
      taskCount: 3,
      link: {
        pm4Id: "pm4-p",
        pm4Title: "Tesla PM4",
        origin: "linked",
        syncedAt: SYNCED.toISOString()
      }
    });
    expect(res.items[1].link).toBeNull();
  });

  it("projects: no connected account → no links", async () => {
    connections.find.mockResolvedValue(null);
    remote.listProjects.mockResolvedValue([
      { id: "p1", title: "Tesla", done: false, taskCount: 0 }
    ]);

    const res = await controller.projects(user);

    expect(links.active).not.toHaveBeenCalled();
    expect(res.items[0].link).toBeNull();
  });

  it("tasks: a project of another account → empty list, no projects call", async () => {
    remote.listTasks.mockResolvedValue([]);
    links.active.mockResolvedValue([]);

    await expect(
      controller.tasks(user, { id: "b".repeat(24) })
    ).resolves.toEqual({ items: [] });
    expect(remote.listProjects).not.toHaveBeenCalled();
  });

  it("tasks: lists the project's tasks with their links", async () => {
    remote.listTasks.mockResolvedValue([
      { id: "t1", projectId: "p1", title: "PM", column: "Upcoming" }
    ]);
    links.active.mockResolvedValue([]);

    const res = await controller.tasks(user, { id: "p1" });

    expect(remote.listTasks).toHaveBeenCalledWith("user-1", "p1");
    expect(res).toEqual({
      items: [
        {
          id: "t1",
          projectId: "p1",
          title: "PM",
          column: "Upcoming",
          link: null
        }
      ]
    });
  });
});
