import { Test, TestingModule } from "@nestjs/testing";
import { ProjectsController } from "./projects.controller.js";
import { ProjectsService } from "./projects.service.js";

describe("ProjectsController", () => {
  let controller: ProjectsController;
  const service = {
    create: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    restore: vi.fn()
  };
  const user = { id: "user-1" };

  beforeEach(async () => {
    Object.values(service).forEach((fn) => fn.mockReset());
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [{ provide: ProjectsService, useValue: service }]
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
  });

  it("delegates every route to the service with the caller's id", async () => {
    const project = { id: "p-1" };
    service.create.mockResolvedValue(project);
    service.list.mockResolvedValue({ items: [] });
    service.get.mockResolvedValue(project);
    service.update.mockResolvedValue(project);
    service.remove.mockResolvedValue(undefined);
    service.restore.mockResolvedValue(undefined);

    const body = { title: "T" };
    const query = {
      page: 1,
      pageSize: 25,
      sort: "updatedAt:desc" as const
    };

    await expect(controller.create(user, body)).resolves.toBe(project);
    expect(service.create).toHaveBeenCalledWith("user-1", body);
    await expect(controller.list(user, query)).resolves.toEqual({
      items: []
    });
    expect(service.list).toHaveBeenCalledWith("user-1", query);
    await expect(controller.get(user, "p-1")).resolves.toBe(project);
    expect(service.get).toHaveBeenCalledWith("user-1", "p-1");
    await expect(controller.update(user, "p-1", body)).resolves.toBe(project);
    expect(service.update).toHaveBeenCalledWith("user-1", "p-1", body);
    await controller.remove(user, "p-1");
    expect(service.remove).toHaveBeenCalledWith("user-1", "p-1");
    await controller.restore(user, "p-1");
    expect(service.restore).toHaveBeenCalledWith("user-1", "p-1");
  });
});
