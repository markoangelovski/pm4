import { Test, TestingModule } from "@nestjs/testing";
import { TasksController } from "./tasks.controller.js";
import { TasksService } from "./tasks.service.js";

describe("TasksController", () => {
  let controller: TasksController;
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
      controllers: [TasksController],
      providers: [{ provide: TasksService, useValue: service }]
    }).compile();

    controller = module.get<TasksController>(TasksController);
  });

  it("delegates every route to the service with the caller's id", async () => {
    const task = { id: "t-1" };
    service.create.mockResolvedValue(task);
    service.list.mockResolvedValue({ items: [] });
    service.get.mockResolvedValue(task);
    service.update.mockResolvedValue(task);
    service.remove.mockResolvedValue(undefined);
    service.restore.mockResolvedValue(undefined);

    const body = { projectId: "p-1", title: "T" };
    const query = {
      page: 1,
      pageSize: 25,
      sort: "updatedAt:desc" as const
    };

    await expect(controller.create(user, body)).resolves.toBe(task);
    expect(service.create).toHaveBeenCalledWith("user-1", body);
    await expect(controller.list(user, query)).resolves.toEqual({ items: [] });
    expect(service.list).toHaveBeenCalledWith("user-1", query);
    await expect(controller.get(user, "t-1")).resolves.toBe(task);
    expect(service.get).toHaveBeenCalledWith("user-1", "t-1");
    await expect(controller.update(user, "t-1", body)).resolves.toBe(task);
    expect(service.update).toHaveBeenCalledWith("user-1", "t-1", body);
    await controller.remove(user, "t-1");
    expect(service.remove).toHaveBeenCalledWith("user-1", "t-1");
    await controller.restore(user, "t-1");
    expect(service.restore).toHaveBeenCalledWith("user-1", "t-1");
  });
});
