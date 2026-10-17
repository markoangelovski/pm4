import { Test, TestingModule } from "@nestjs/testing";
import { PmspaLinksController } from "./pmspa-links.controller.js";
import { PmspaLinksService } from "./pmspa-links.service.js";

describe("PmspaLinksController", () => {
  let controller: PmspaLinksController;
  const service = {
    list: vi.fn(),
    unlink: vi.fn(),
    detail: vi.fn()
  };
  const user = { id: "user-1" };

  beforeEach(async () => {
    Object.values(service).forEach((fn) => fn.mockReset());
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PmspaLinksController],
      providers: [{ provide: PmspaLinksService, useValue: service }]
    }).compile();

    controller = module.get(PmspaLinksController);
  });

  it("wraps the active links in items and delegates with the caller's id", async () => {
    const link = {
      pm4Id: "p1",
      origin: "linked",
      syncedAt: "2026-10-01T00:00:00.000Z"
    };
    service.list.mockResolvedValue([link]);

    expect(await controller.list(user, { type: "project" })).toEqual({
      items: [link]
    });
    expect(service.list).toHaveBeenCalledWith("user-1", "project");
  });

  it("delegates unlink and detail with the caller's id", async () => {
    const detail = { origin: "linked", syncedAt: "x", pmspa: null };
    service.unlink.mockResolvedValue(undefined);
    service.detail.mockResolvedValue(detail);

    await controller.unlink(user, { type: "task", id: "t1" });
    expect(await controller.detail(user, { type: "task", id: "t1" })).toBe(
      detail
    );

    expect(service.unlink).toHaveBeenCalledWith("user-1", "task", "t1");
    expect(service.detail).toHaveBeenCalledWith("user-1", "task", "t1");
  });
});
