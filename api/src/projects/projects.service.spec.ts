import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { InTrashException } from "../common/exceptions/in-trash.exception.js";
import { ProjectLeadService } from "../users/project-lead.service.js";
import { UsersRepository } from "../users/users.repository.js";
import { type ProjectRow, ProjectsRepository } from "./projects.repository.js";
import { ProjectsService } from "./projects.service.js";

const ID = "0190a000-0000-7000-8000-000000000001";

function row(overrides: Partial<ProjectRow> = {}): ProjectRow {
  return {
    id: ID,
    title: "Web",
    description: null,
    externalLink: null,
    projectLeadUserId: null,
    projectLead: null,
    leadDisplayName: null,
    leadAvatarUrl: null,
    createdAt: new Date("2026-10-01T08:00:00.000Z"),
    updatedAt: new Date("2026-10-02T08:00:00.000Z"),
    deletedAt: null,
    counts: { upcoming: 2, inProgress: 1, completed: 1 },
    ...overrides
  };
}

describe("ProjectsService", () => {
  let service: ProjectsService;
  const repository = {
    insert: vi.fn(),
    findById: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    setDeletedAt: vi.fn()
  };
  const findLeadUser = vi.fn();

  beforeEach(async () => {
    Object.values(repository).forEach((fn) => fn.mockReset());
    findLeadUser.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        ProjectLeadService,
        { provide: ProjectsRepository, useValue: repository },
        { provide: UsersRepository, useValue: { findLeadUser } }
      ]
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it("get maps the row, with ISO instants and a total count", async () => {
    repository.findById.mockResolvedValue(row());
    await expect(service.get("user-1", ID)).resolves.toEqual({
      id: ID,
      title: "Web",
      description: null,
      externalLink: null,
      projectLead: null,
      taskCounts: { upcoming: 2, inProgress: 1, completed: 1, total: 4 },
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

  it("findOwned: missing → not found; trashed → in-trash unless allowed", async () => {
    repository.findById.mockResolvedValue(null);
    const missing = await service
      .findOwned("user-1", ID)
      .catch((e: unknown) => e);
    expect(missing).toBeInstanceOf(NotFoundException);
    expect(missing).not.toBeInstanceOf(InTrashException);

    const trashed = row({ deletedAt: new Date() });
    repository.findById.mockResolvedValue(trashed);
    await expect(service.findOwned("user-1", ID)).rejects.toBeInstanceOf(
      InTrashException
    );
    await expect(
      service.findOwned("user-1", ID, { allowTrashed: true })
    ).resolves.toBe(trashed);
  });

  it("create stores the lead columns and missing optional fields as null", async () => {
    repository.insert.mockResolvedValue(ID);
    repository.findById.mockResolvedValue(row());

    await service.create("user-1", { title: "Web", projectLeadName: "Ana" });

    expect(repository.insert).toHaveBeenCalledWith("user-1", {
      title: "Web",
      description: null,
      externalLink: null,
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
      null,
      "title:asc",
      2,
      10
    );
    expect(result).toMatchObject({ page: 2, pageSize: 10, total: 1 });
    expect(result.items).toHaveLength(1);
  });

  it("update sends only the given fields and leaves the lead alone when absent", async () => {
    repository.findById.mockResolvedValue(row());

    await service.update("user-1", ID, { description: null });
    expect(repository.update).toHaveBeenCalledWith("user-1", ID, {
      description: null
    });

    await service.update("user-1", ID, {});
    expect(repository.update).toHaveBeenLastCalledWith("user-1", ID, {});
  });

  it("update on a trashed project → in-trash, nothing written", async () => {
    repository.findById.mockResolvedValue(row({ deletedAt: new Date() }));
    await expect(
      service.update("user-1", ID, { title: "X" })
    ).rejects.toBeInstanceOf(InTrashException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("remove sets deletedAt; a trashed project → in-trash", async () => {
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

  it("restore clears deletedAt only for a trashed project", async () => {
    repository.findById.mockResolvedValue(row({ deletedAt: new Date() }));
    await service.restore("user-1", ID);
    expect(repository.setDeletedAt).toHaveBeenCalledWith("user-1", ID, null);

    repository.setDeletedAt.mockReset();
    repository.findById.mockResolvedValue(row());
    await service.restore("user-1", ID);
    expect(repository.setDeletedAt).not.toHaveBeenCalled();
  });
});
