import { Test, TestingModule } from "@nestjs/testing";
import { ChangelogController } from "./changelog.controller.js";

describe("ChangelogController", () => {
  let controller: ChangelogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChangelogController]
    }).compile();

    controller = module.get<ChangelogController>(ChangelogController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
