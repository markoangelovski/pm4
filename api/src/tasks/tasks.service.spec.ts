import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { InTrashException } from "../common/exceptions/in-trash.exception.js";
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
    projectDeletedAt: null,
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
    deletedAt: null,
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
    setDeletedAt: vi.fn()
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

  it("findOwned: missing → not found, not in-trash", async () => {
    repository.findById.mockResolvedValue(null);
    const error = await service
      .findOwned("user-1", ID)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NotFoundException);
    expect(error).not.toBeInstanceOf(InTrashException);
  });

  it("findOwned: a trashed task → in-trash unless allowed", async () => {
    const trashed = row({ deletedAt: new Date() });
    repository.findById.mockResolvedValue(trashed);
    await expect(service.findOwned("user-1", ID)).rejects.toBeInstanceOf(
      InTrashException
    );
    await expect(
      service.findOwned("user-1", ID, { allowTrashed: true })
    ).resolves.toBe(trashed);
  });

  it("findOwned: a trashed project → in-trash with projectInTrash", async () => {
    const inTrashProject = row({ projectDeletedAt: new Date() });
    repository.findById.mockResolvedValue(inTrashProject);
    const error = await service
      .findOwned("user-1", ID)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(InTrashException);
    expect(JSON.stringify((error as InTrashException).getResponse())).toContain(
      PROJECT_ID
    );
    await expect(
      service.findOwned("user-1", ID, { allowTrashed: true })
    ).resolves.toBe(inTrashProject);
  });

  it("create: a missing or trashed project → 404 'Project not found.', nothing inserted", async () => {
    projectsService.findOwned.mockRejectedValueOnce(
      new NotFoundException("Project not found.")
    );
    await expect(
      service.create("user-1", { projectId: PROJECT_ID, title: "Fix" })
    ).rejects.toThrow("Project not found.");

    projectsService.findOwned.mockRejectedValueOnce(
      new InTrashException("Project is in the trash.")
    );
    const error = await service
      .create("user-1", { projectId: PROJECT_ID, title: "Fix" })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NotFoundException);
    expect(error).not.toBeInstanceOf(InTrashException);
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

  it("update: a move into a trashed project → 404, nothing written", async () => {
    repository.findById.mockResolvedValue(row());
    projectsService.findOwned.mockRejectedValue(
      new InTrashException("Project is in the trash.")
    );
    const error = await service
      .update("user-1", ID, { projectId: OTHER_PROJECT_ID })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NotFoundException);
    expect(error).not.toBeInstanceOf(InTrashException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("remove sets deletedAt; a trashed task → in-trash", async () => {
    repository.findById.mockResolvedValue(row());
    await service.remove("user-1", ID);
    expect(repository.setDeletedAt).toHaveBeenCalledWith(
      "user-1",
      ID,
      expect.any(Date)
    );

    repository.findById.mockResolvedValue(row({ deletedAt: new Date() }));
    await expect(service.remove("user-1", ID)).rejects.toBeInstanceOf(
      InTrashException
    );
  });

  it("restore clears deletedAt only for a trashed task", async () => {
    repository.findById.mockResolvedValue(row({ deletedAt: new Date() }));
    await service.restore("user-1", ID);
    expect(repository.setDeletedAt).toHaveBeenCalledWith("user-1", ID, null);

    repository.setDeletedAt.mockReset();
    repository.findById.mockResolvedValue(row());
    await service.restore("user-1", ID);
    expect(repository.setDeletedAt).not.toHaveBeenCalled();
  });

  it("restore: a task in a trashed project → 409, nothing written", async () => {
    repository.findById.mockResolvedValue(
      row({ deletedAt: new Date(), projectDeletedAt: new Date() })
    );
    await expect(service.restore("user-1", ID)).rejects.toBeInstanceOf(
      ConflictException
    );
    expect(repository.setDeletedAt).not.toHaveBeenCalled();
  });
});
