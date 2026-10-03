import { Test, TestingModule } from "@nestjs/testing";
import { UsersController } from "./users.controller.js";
import { UsersService } from "./users.service.js";

describe("UsersController", () => {
  let controller: UsersController;
  const getMe = vi.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: { getMe } }]
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it("GET /me returns the current user's profile", async () => {
    const me = { id: "user-1" };
    getMe.mockResolvedValue(me);
    await expect(controller.get({ id: "user-1" })).resolves.toBe(me);
    expect(getMe).toHaveBeenCalledWith("user-1");
  });
});
