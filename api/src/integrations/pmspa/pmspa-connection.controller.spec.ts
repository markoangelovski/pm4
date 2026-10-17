import { Test, TestingModule } from "@nestjs/testing";
import { PmspaConnectionController } from "./pmspa-connection.controller.js";
import { PmspaConnectionService } from "./pmspa-connection.service.js";

describe("PmspaConnectionController", () => {
  let controller: PmspaConnectionController;
  const service = {
    get: vi.fn(),
    save: vi.fn(),
    test: vi.fn(),
    disconnect: vi.fn()
  };
  const user = { id: "user-1" };

  beforeEach(async () => {
    Object.values(service).forEach((fn) => fn.mockReset());
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PmspaConnectionController],
      providers: [{ provide: PmspaConnectionService, useValue: service }]
    }).compile();

    controller = module.get(PmspaConnectionController);
  });

  it("delegates every route to the service with the caller's id", async () => {
    const connection = { status: "not-configured" };
    service.get.mockResolvedValue(connection);
    service.save.mockResolvedValue(connection);
    service.test.mockResolvedValue(connection);
    service.disconnect.mockResolvedValue(undefined);
    const dto = { url: "https://pmspa.example", email: "a@example.com" };

    expect(await controller.get(user)).toBe(connection);
    expect(await controller.save(user, dto)).toBe(connection);
    expect(await controller.test(user)).toBe(connection);
    await controller.disconnect(user);

    expect(service.get).toHaveBeenCalledWith("user-1");
    expect(service.save).toHaveBeenCalledWith("user-1", dto);
    expect(service.test).toHaveBeenCalledWith("user-1");
    expect(service.disconnect).toHaveBeenCalledWith("user-1");
  });
});
