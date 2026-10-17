import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { UsersRepository } from "../../users/users.repository.js";
import { PmspaConnectionRepository } from "./pmspa-connection.repository.js";
import { PmspaLinksRepository } from "./pmspa-links.repository.js";
import { ProblemException } from "../../common/filters/problem-details/problem-exception.js";
import { pmspaProblems } from "./pmspa-problems.js";
import { PmspaRemote } from "./pmspa-remote.js";
import { PmspaSyncRepository } from "./pmspa-sync.repository.js";
import { PmspaSyncService } from "./pmspa-sync.service.js";
import { PmspaStore } from "./pmspa-store.js";
import { ProjectsService } from "../../projects/projects.service.js";
import { TasksService } from "../../tasks/tasks.service.js";

const PMSPA_USER = "a".repeat(24);

describe("PmspaSyncService", () => {
  let service: PmspaSyncService;
  const remote = {
    listProjects: vi.fn(),
    listTasks: vi.fn(),
    listAllTasks: vi.fn(),
    getProject: vi.fn(),
    getTask: vi.fn(),
    createProject: vi.fn(),
    createTask: vi.fn()
  };
  const connections = { find: vi.fn(), setLastSyncAt: vi.fn() };
  const store = { lock: vi.fn(), unlock: vi.fn() };
  const projectsService = { create: vi.fn(), update: vi.fn() };
  const tasksService = { create: vi.fn(), update: vi.fn() };
  const links = { active: vi.fn(), save: vi.fn() };
  const sync = {
    pm4Projects: vi.fn(),
    pm4Tasks: vi.fn(),
    pm4Project: vi.fn(),
    pm4Task: vi.fn()
  };
  const users = { findById: vi.fn() };

  beforeEach(async () => {
    [remote, connections, links, sync, users, store].forEach((o) =>
      Object.values(o).forEach((fn) => fn.mockReset())
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PmspaSyncService,
        { provide: PmspaRemote, useValue: remote },
        { provide: PmspaConnectionRepository, useValue: connections },
        { provide: PmspaLinksRepository, useValue: links },
        { provide: PmspaSyncRepository, useValue: sync },
        { provide: UsersRepository, useValue: users },
        { provide: PmspaStore, useValue: store },
        { provide: ProjectsService, useValue: projectsService },
        { provide: TasksService, useValue: tasksService }
      ]
    }).compile();
    service = module.get(PmspaSyncService);
    store.lock.mockResolvedValue(true);
    users.findById.mockResolvedValue({ timeZone: "Europe/Zagreb" });
    connections.find.mockResolvedValue({ pmspaUserId: PMSPA_USER });
    links.active.mockResolvedValue([]);
    sync.pm4Projects.mockResolvedValue([]);
    sync.pm4Tasks.mockResolvedValue([]);
    remote.listProjects.mockResolvedValue([]);
    remote.listAllTasks.mockResolvedValue([]);
  });

  it("load: lists the tasks of every selected project found in PMSPA, not the others", async () => {
    const p1 = "b".repeat(24);
    const p2 = "c".repeat(24);
    remote.listProjects.mockResolvedValue([{ id: p1 }]);
    remote.listTasks.mockResolvedValue([{ id: "t1" }]);
    const snapshot = await service.load("u", {
      projects: [
        { id: p1, taskIds: null },
        { id: p2, taskIds: null }
      ]
    });
    expect(remote.listTasks).toHaveBeenCalledTimes(1);
    expect(remote.listTasks).toHaveBeenCalledWith("u", p1);
    expect(remote.listAllTasks).not.toHaveBeenCalled();
    expect(snapshot.remoteTasks).toEqual([{ id: "t1" }]);
    expect(snapshot.timeZone).toBe("Europe/Zagreb");
  });

  it("load: without a selection lists every PMSPA task", async () => {
    await service.load("u", null);
    expect(remote.listAllTasks).toHaveBeenCalledWith("u");
  });

  it("load: no connection → no links, and PMSPA is asked first", async () => {
    connections.find.mockResolvedValue(null);
    const snapshot = await service.load("u", null);
    expect(snapshot.links).toEqual([]);
    expect(links.active).not.toHaveBeenCalled();
    expect(remote.listProjects).toHaveBeenCalledWith("u");
  });

  it("load: a missing connection surfaces PMSPA's error from listProjects", async () => {
    remote.listProjects.mockRejectedValue(new Error("not connected"));
    await expect(service.load("u", null)).rejects.toThrow("not connected");
    expect(sync.pm4Projects).not.toHaveBeenCalled();
  });

  it("syncPreview: an unknown PM4 project → 404", async () => {
    await expect(
      service.syncPreview("u", {
        type: "project",
        id: "00000000-0000-4000-8000-000000000000"
      })
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("importPreview: returns { items } of the snapshot's rows", async () => {
    const res = await service.importPreview("u", { projects: [] });
    expect(res).toEqual({ items: [] });
  });

  it("syncRun: a locked user → 409, and the lock isn't released", async () => {
    store.lock.mockResolvedValue(false);
    await expect(
      service.syncRun("u", {
        target: { type: "project", id: "p" },
        choices: []
      })
    ).rejects.toMatchObject({ status: 409 });
    expect(store.unlock).not.toHaveBeenCalled();
  });

  it("syncRun: an unknown project → 404 and the lock is released", async () => {
    await expect(
      service.syncRun("u", {
        target: { type: "project", id: "p" },
        choices: []
      })
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(store.unlock).toHaveBeenCalledWith("u");
    expect(connections.setLastSyncAt).not.toHaveBeenCalled();
  });

  it("importRun: an empty selection sets last_sync_at and unlocks", async () => {
    const res = await service.importRun("u", {
      selection: { projects: [] },
      choices: []
    });
    expect(res.items).toEqual([]);
    expect(connections.setLastSyncAt).toHaveBeenCalledWith(
      "u",
      new Date(res.syncedAt)
    );
    expect(store.unlock).toHaveBeenCalledWith("u");
  });

  describe("row failures", () => {
    const P1 = "11111111-1111-4111-8111-111111111111";
    const T1 = "33333333-3333-4333-8333-333333333333";
    const R1 = "b".repeat(24);
    const R2 = "c".repeat(24);
    const pm4P = (id: string, title: string) => ({
      id,
      title,
      description: null,
      externalLink: null,
      leadName: null
    });
    const remP = (id: string, title: string) => ({
      id,
      userId: "u",
      title,
      description: null,
      pl: null,
      kanboard: null,
      done: false,
      taskCount: 0
    });
    const resultOf = (res: { items: { key: string }[] }, key: string) =>
      res.items.find((i) => i.key === key);

    it("a chosen record that isn't a candidate can't be linked", async () => {
      sync.pm4Projects.mockResolvedValue([pm4P(P1, "A")]);
      remote.listProjects.mockResolvedValue([remP(R1, "A")]);
      const res = await service.syncRun("u", {
        target: { type: "project", id: P1 },
        choices: [{ key: `project:${P1}`, kind: "link", id: R2 }]
      });
      expect(resultOf(res, `project:${P1}`)).toMatchObject({
        outcome: "failed",
        reason: "The chosen record can't be linked."
      });
      expect(links.save).not.toHaveBeenCalled();
    });

    it("a chosen PMSPA record that is gone on re-read can't be linked", async () => {
      sync.pm4Projects.mockResolvedValue([pm4P(P1, "A")]);
      remote.listProjects.mockResolvedValue([remP(R1, "A")]);
      remote.getProject.mockResolvedValue(null);
      const res = await service.syncRun("u", {
        target: { type: "project", id: P1 },
        choices: [{ key: `project:${P1}`, kind: "link", id: R1 }]
      });
      expect(resultOf(res, `project:${P1}`)).toMatchObject({
        outcome: "failed",
        reason: "The chosen record can't be linked."
      });
      expect(links.save).not.toHaveBeenCalled();
    });

    it("an imported task whose project was left out fails: its project wasn't imported", async () => {
      remote.listProjects.mockResolvedValue([remP(R1, "A")]);
      remote.listTasks.mockResolvedValue([
        {
          id: R2,
          projectId: R1,
          title: "T",
          description: null,
          column: "Upcoming",
          pl: null,
          kanboard: null,
          dueAt: Date.UTC(2026, 9, 20, 12)
        }
      ]);
      const res = await service.importRun("u", {
        selection: { projects: [{ id: R1, taskIds: null }] },
        choices: [{ key: `project:${R1}`, kind: "skip" }]
      });
      expect(resultOf(res, `task:${R2}`)).toMatchObject({
        outcome: "failed",
        reason: "Its project wasn't imported."
      });
      expect(tasksService.create).not.toHaveBeenCalled();
    });

    it("a pushed task whose project was left out fails, even with a stale project link", async () => {
      sync.pm4Projects.mockResolvedValue([pm4P(P1, "A")]);
      sync.pm4Tasks.mockResolvedValue([
        { ...pm4P(T1, "T"), projectId: P1, status: "upcoming", dueDate: null }
      ]);
      sync.pm4Task.mockResolvedValue({
        ...pm4P(T1, "T"),
        projectId: P1,
        status: "upcoming",
        dueDate: null
      });
      // The project's PMSPA side was deleted: the link is stale and counts as no link (D9).
      links.active.mockImplementation((_u: string, _p: string, type: string) =>
        Promise.resolve(
          type === "project"
            ? [
                {
                  type: "project",
                  pm4Id: P1,
                  pmspaId: R1,
                  pmspaUserId: PMSPA_USER,
                  origin: "linked",
                  syncedAt: new Date(),
                  pm4Hash: Buffer.alloc(16),
                  pmspaHash: Buffer.alloc(16)
                }
              ]
            : []
        )
      );
      const res = await service.syncRun("u", {
        target: { type: "task", id: T1 },
        choices: [{ key: `project:${P1}`, kind: "skip" }]
      });
      expect(resultOf(res, `task:${T1}`)).toMatchObject({
        outcome: "failed",
        reason: "Its project isn't in PMSPA (it was left out)."
      });
      expect(remote.createTask).not.toHaveBeenCalled();
    });

    it.each([
      ["unreachable", () => pmspaProblems.unreachable()],
      ["rate limited", () => pmspaProblems.rateLimited(30)]
    ])(
      "a %s PMSPA aborts the run, and the links saved stay",
      async (_n, err) => {
        const task = {
          ...pm4P(T1, "T"),
          projectId: P1,
          status: "upcoming",
          dueDate: null
        };
        sync.pm4Projects.mockResolvedValue([pm4P(P1, "A")]);
        sync.pm4Tasks.mockResolvedValue([task]);
        sync.pm4Project.mockResolvedValue(pm4P(P1, "A"));
        sync.pm4Task.mockResolvedValue(task);
        remote.createProject.mockResolvedValue(remP(R1, "A"));
        remote.createTask.mockRejectedValue(err());
        await expect(
          service.syncRun("u", {
            target: { type: "project", id: P1 },
            choices: []
          })
        ).rejects.toBeInstanceOf(ProblemException);
        expect(links.save).toHaveBeenCalledTimes(1);
        expect(store.unlock).toHaveBeenCalledWith("u");
      }
    );
  });
});
