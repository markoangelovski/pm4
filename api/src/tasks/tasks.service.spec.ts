import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ProjectsService } from "../projects/projects.service.js";
import { ProjectLeadService } from "../users/project-lead.service.js";
import { UsersRepository } from "../users/users.repository.js";
import { type TaskRow, TasksRepository } from "./tasks.repository.js";
import { TasksService } from "./tasks.service.js";

const ID = "0190a000-0000-7000-8000-000000000001";
const PROJECT_ID = "0190a000-0000-7000-8000-0000000000a1";
const OTHER_PROJECT_ID = "0190a000-0000-7000-8000-0000000000a2";

function row(overrides: Partial<TaskRow> = {}): TaskRow {
  return {
    id: ID,
    projectId: PROJECT_ID,
    projectTitle: "Web",
    title: "Fix",
    description: null,
    externalLink: null,
    projectLeadUserId: null,
    projectLead: null,
    leadDisplayName: null,
    leadAvatarUrl: null,
    status: "upcoming",
    dueDate: null,
    createdAt: new Date("2026-10-01T08:00:00.000Z"),
    updatedAt: new Date("2026-10-02T08:00:00.000Z"),
    loggedMinutes: 0,
    ...overrides
  };
}

describe("TasksService", () => {
  let service: TasksService;
  const repository = {
    insert: vi.fn(),
    findById: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  };
  const projectsService = { findOwned: vi.fn() };

  beforeEach(async () => {
    Object.values(repository).forEach((fn) => fn.mockReset());
    projectsService.findOwned.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        ProjectLeadService,
        { provide: TasksRepository, useValue: repository },
        { provide: ProjectsService, useValue: projectsService },
        { provide: UsersRepository, useValue: { findLeadUser: vi.fn() } }
      ]
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it("get maps the row with the project ref and ISO instants", async () => {
    repository.findById.mockResolvedValue(row());
    await expect(service.get("user-1", ID)).resolves.toEqual({
      id: ID,
      project: { id: PROJECT_ID, title: "Web", deleted: false },
      title: "Fix",
      description: null,
      externalLink: null,
      projectLead: null,
      status: "upcoming",
      dueDate: null,
      loggedMinutes: 0,
      createdAt: "2026-10-01T08:00:00.000Z",
      updatedAt: "2026-10-02T08:00:00.000Z"
    });
    expect(repository.findById).toHaveBeenCalledWith("user-1", ID);
  });

  it("findOwned: a non-UUID id → not found, without a query", async () => {
    await expect(service.findOwned("user-1", "abc")).rejects.toBeInstanceOf(
      NotFoundException
    );
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it("findOwned: missing → not found", async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.findOwned("user-1", ID)).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it("create: a missing project → 404 'Project not found.', nothing inserted", async () => {
    projectsService.findOwned.mockRejectedValueOnce(
      new NotFoundException("Project not found.")
    );
    await expect(
      service.create("user-1", { projectId: PROJECT_ID, title: "Fix" })
    ).rejects.toThrow("Project not found.");
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it("create stores defaults and the lead columns", async () => {
    projectsService.findOwned.mockResolvedValue({});
    repository.insert.mockResolvedValue(ID);
    repository.findById.mockResolvedValue(row());

    await service.create("user-1", {
      projectId: PROJECT_ID,
      title: "Fix",
      projectLeadName: "Ana"
    });

    expect(repository.insert).toHaveBeenCalledWith("user-1", {
      projectId: PROJECT_ID,
      title: "Fix",
      description: null,
      externalLink: null,
      status: "upcoming",
      dueDate: null,
      projectLeadUserId: null,
      projectLead: "Ana"
    });
  });

  it("list passes an empty q as no filter", async () => {
    repository.list.mockResolvedValue({ rows: [row()], total: 1 });

    const result = await service.list("user-1", {
      q: "",
      sort: "title:asc",
      page: 2,
      pageSize: 10
    });

    expect(repository.list).toHaveBeenCalledWith(
      "user-1",
      { projectId: undefined, status: undefined, q: null },
      "title:asc",
      2,
      10
    );
    expect(result).toMatchObject({ page: 2, pageSize: 10, total: 1 });
  });

  it("update sends only the given fields and checks a new project", async () => {
    repository.findById.mockResolvedValue(row());

    await service.update("user-1", ID, { status: "completed" });
    expect(repository.update).toHaveBeenCalledWith("user-1", ID, {
      status: "completed"
    });
    expect(projectsService.findOwned).not.toHaveBeenCalled();

    projectsService.findOwned.mockResolvedValue({});
    await service.update("user-1", ID, { projectId: OTHER_PROJECT_ID });
    expect(projectsService.findOwned).toHaveBeenCalledWith(
      "user-1",
      OTHER_PROJECT_ID
    );
  });

  it("update: a move into a missing project → 404, nothing written", async () => {
    repository.findById.mockResolvedValue(row());
    projectsService.findOwned.mockRejectedValue(
      new NotFoundException("Project not found.")
    );
    await expect(
      service.update("user-1", ID, { projectId: OTHER_PROJECT_ID })
    ).rejects.toThrow("Project not found.");
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("remove deletes the task; not the caller's → not found", async () => {
    repository.delete.mockResolvedValue(true);
    await service.remove("user-1", ID);
    expect(repository.delete).toHaveBeenCalledWith("user-1", ID);

    repository.delete.mockResolvedValue(false);
    await expect(service.remove("user-1", ID)).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it("remove: a non-UUID id → not found, without a query", async () => {
    await expect(service.remove("user-1", "abc")).rejects.toBeInstanceOf(
      NotFoundException
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
