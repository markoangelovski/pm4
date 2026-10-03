import { Test, TestingModule } from "@nestjs/testing";
import { UserSearchController } from "./user-search.controller.js";
import { UsersService } from "./users.service.js";

describe("UserSearchController", () => {
  let controller: UserSearchController;
  const search = vi.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserSearchController],
      providers: [{ provide: UsersService, useValue: { search } }]
    }).compile();
    controller = module.get(UserSearchController);
  });

  it("GET /users searches as the caller", async () => {
    const result = { items: [] };
    search.mockResolvedValue(result);
    await expect(controller.search({ id: "u1" }, { q: "an" })).resolves.toBe(
      result
    );
    expect(search).toHaveBeenCalledWith("u1", "an");
  });
});
