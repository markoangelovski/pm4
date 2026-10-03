import { Test, TestingModule } from "@nestjs/testing";
import { VersionController } from "./version.controller.js";

describe("VersionController", () => {
  let controller: VersionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VersionController]
    }).compile();

    controller = module.get<VersionController>(VersionController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
