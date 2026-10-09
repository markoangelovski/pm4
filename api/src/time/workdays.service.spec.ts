import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { UsersRepository } from "../users/users.repository.js";
import { TimeRepository } from "./time.repository.js";
import { WorkdaysService } from "./workdays.service.js";

describe("WorkdaysService", () => {
  const repository = {
    getWorkday: vi.fn(),
    listDay: vi.fn(),
    listWorkdays: vi.fn(),
    upsertWorkday: vi.fn()
  };
  const users = { findById: vi.fn() };
  let service: WorkdaysService;

  beforeEach(async () => {
    vi.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkdaysService,
        { provide: TimeRepository, useValue: repository },
        { provide: UsersRepository, useValue: users }
      ]
    }).compile();
    service = module.get(WorkdaysService);
  });

  it("getDay of an empty date has no start and no logs", async () => {
    repository.getWorkday.mockResolvedValue(null);
    repository.listDay.mockResolvedValue([]);
    await expect(service.getDay("u", "2026-10-07")).resolves.toEqual({
      workDate: "2026-10-07",
      startMinute: null,
      totalMinutes: 0,
      logs: []
    });
  });

  it("getDay rejects a date that doesn't exist", async () => {
    await expect(service.getDay("u", "2026-02-30")).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it("list rejects a range over 366 days and from after to", async () => {
    await expect(
      service.list("u", { from: "2025-01-01", to: "2026-10-01" })
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.list("u", { from: "2026-10-02", to: "2026-10-01" })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("setStart rejects a future date", async () => {
    users.findById.mockResolvedValue({ timeZone: "UTC" });
    const tomorrow = new Date(Date.now() + 2 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    await expect(service.setStart("u", tomorrow, 480)).rejects.toBeInstanceOf(
      BadRequestException
    );
    expect(repository.upsertWorkday).not.toHaveBeenCalled();
  });
});
