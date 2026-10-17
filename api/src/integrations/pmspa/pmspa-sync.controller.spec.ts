import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Test, TestingModule } from "@nestjs/testing";
import {
  PmspaImportDto,
  PmspaImportProjectDto,
  PmspaSyncDto
} from "./dto/sync.dto.js";
import { PmspaSyncController } from "./pmspa-sync.controller.js";
import { PmspaSyncService } from "./pmspa-sync.service.js";

describe("PmspaSyncController", () => {
  let controller: PmspaSyncController;
  const service = {
    importPreview: vi.fn(),
    syncPreview: vi.fn(),
    importRun: vi.fn(),
    syncRun: vi.fn()
  };

  beforeEach(async () => {
    service.importPreview.mockReset();
    service.syncPreview.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PmspaSyncController],
      providers: [{ provide: PmspaSyncService, useValue: service }]
    }).compile();
    controller = module.get(PmspaSyncController);
  });

  it("importPreview delegates with the caller's id", async () => {
    service.importPreview.mockResolvedValue({ items: [] });
    const selection = { projects: [] };
    expect(await controller.importPreview({ id: "u" }, selection)).toEqual({
      items: []
    });
    expect(service.importPreview).toHaveBeenCalledWith("u", selection);
  });

  it("syncPreview delegates with the caller's id", async () => {
    service.syncPreview.mockResolvedValue({ items: [] });
    const target = { type: "task" as const, id: "t" };
    await controller.syncPreview({ id: "u" }, target);
    expect(service.syncPreview).toHaveBeenCalledWith("u", target);
  });

  it("importRun and syncRun delegate with the caller's id", async () => {
    service.importRun.mockResolvedValue({ items: [] });
    service.syncRun.mockResolvedValue({ items: [] });
    const imp = { selection: { projects: [] }, choices: [] };
    const syn = { target: { type: "task" as const, id: "t" }, choices: [] };
    await controller.importRun({ id: "u" }, imp);
    await controller.syncRun({ id: "u" }, syn);
    expect(service.importRun).toHaveBeenCalledWith("u", imp);
    expect(service.syncRun).toHaveBeenCalledWith("u", syn);
  });

  it("the commit bodies reject a missing selection or target", async () => {
    const errors = async (cls: new () => object, body: object) =>
      (await validate(plainToInstance(cls, body))).map((e) => e.property);
    expect(await errors(PmspaImportDto, { choices: [] })).toContain(
      "selection"
    );
    expect(await errors(PmspaSyncDto, { choices: [] })).toContain("target");
  });

  it("caps an import project's taskIds at 500 (OQ-190)", async () => {
    const taskErrors = async (count: number) =>
      (
        await validate(
          plainToInstance(PmspaImportProjectDto, {
            id: "a".repeat(24),
            taskIds: Array.from({ length: count }, () => "b".repeat(24))
          })
        )
      ).map((e) => e.property);
    expect(await taskErrors(501)).toContain("taskIds");
    expect(await taskErrors(500)).not.toContain("taskIds");
  });
});
