import { Test, TestingModule } from "@nestjs/testing";
import { TimeLogsController } from "./time-logs.controller.js";
import { TimeLogsService } from "./time-logs.service.js";

describe("TimeLogsController", () => {
  const service = { create: vi.fn(), update: vi.fn(), remove: vi.fn() };
  let controller: TimeLogsController;

  beforeEach(async () => {
    vi.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TimeLogsController],
      providers: [{ provide: TimeLogsService, useValue: service }]
    }).compile();
    controller = module.get(TimeLogsController);
  });

  it("delegates to the service with the caller's id", async () => {
    await controller.update({ id: "u" }, "l-1", { text: "x" });
    expect(service.update).toHaveBeenCalledWith("u", "l-1", { text: "x" });

    await controller.remove({ id: "u" }, "l-1");
    expect(service.remove).toHaveBeenCalledWith("u", "l-1");
  });
});
