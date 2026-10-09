import { Test, TestingModule } from "@nestjs/testing";
import { WorkdaysController } from "./workdays.controller.js";
import { WorkdaysService } from "./workdays.service.js";

describe("WorkdaysController", () => {
  const service = {
    getDay: vi.fn(),
    list: vi.fn(),
    setStart: vi.fn()
  };
  let controller: WorkdaysController;

  beforeEach(async () => {
    vi.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkdaysController],
      providers: [{ provide: WorkdaysService, useValue: service }]
    }).compile();
    controller = module.get(WorkdaysController);
  });

  it("delegates to the service with the caller's id", async () => {
    service.setStart.mockResolvedValue({
      workDate: "2026-10-07",
      startMinute: 480
    });
    await controller.setStart({ id: "u" }, "2026-10-07", {
      startMinute: 480
    });
    expect(service.setStart).toHaveBeenCalledWith("u", "2026-10-07", 480);

    service.getDay.mockResolvedValue({});
    await controller.getDay({ id: "u" }, "2026-10-07");
    expect(service.getDay).toHaveBeenCalledWith("u", "2026-10-07");
  });
});
