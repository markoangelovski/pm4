import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import type { User } from "../database/schema/index.js";
import { UsersRepository } from "./users.repository.js";
import { UsersService } from "./users.service.js";

describe("UsersService", () => {
  let service: UsersService;
  const findById = vi.fn<(id: string) => Promise<User | null>>();

  const search = vi.fn();
  const updateSettings = vi.fn();

  beforeEach(async () => {
    findById.mockReset();
    updateSettings.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: { findById, search, updateSettings }
        }
      ]
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it("getMe maps the user to exactly the Me fields", async () => {
    const createdAt = new Date("2026-10-01T08:30:00.000Z");
    findById.mockResolvedValue({
      id: "user-1",
      email: "ada@example.com",
      displayName: "Ada",
      avatarUrl: null,
      timeZone: "Europe/Zagreb",
      dailyTargetMinutes: 420,
      createdAt,
      updatedAt: new Date()
    });

    await expect(service.getMe("user-1")).resolves.toEqual({
      id: "user-1",
      email: "ada@example.com",
      displayName: "Ada",
      avatarUrl: null,
      timeZone: "Europe/Zagreb",
      dailyTargetMinutes: 420,
      createdAt: "2026-10-01T08:30:00.000Z"
    });
  });

  it("updateMe saves only the given settings and returns Me", async () => {
    const row = {
      id: "user-1",
      email: "ada@example.com",
      displayName: "Ada",
      avatarUrl: null,
      timeZone: "Europe/London",
      dailyTargetMinutes: 480,
      createdAt: new Date("2026-10-01T08:30:00.000Z"),
      updatedAt: new Date()
    };
    updateSettings.mockResolvedValue(row);

    const me = await service.updateMe("user-1", {
      dailyTargetMinutes: 480,
      timeZone: "Europe/London"
    });

    expect(updateSettings).toHaveBeenCalledWith("user-1", {
      timeZone: "Europe/London",
      dailyTargetMinutes: 480
    });
    expect(me.dailyTargetMinutes).toBe(480);
  });

  it("updateMe stores the canonical time zone name, as sign-in does", async () => {
    updateSettings.mockResolvedValue({
      id: "user-1",
      email: "ada@example.com",
      displayName: "Ada",
      avatarUrl: null,
      timeZone: "Europe/Zagreb",
      dailyTargetMinutes: 420,
      createdAt: new Date("2026-10-01T08:30:00.000Z"),
      updatedAt: new Date()
    });

    await service.updateMe("user-1", { timeZone: "europe/zagreb" });

    expect(updateSettings).toHaveBeenCalledWith("user-1", {
      timeZone: "Europe/Zagreb"
    });
  });

  it("updateMe → 400 for a time zone sign-in would reject", async () => {
    await expect(
      service.updateMe("user-1", { timeZone: "+01:00" })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it("updateMe with no fields changes nothing", async () => {
    findById.mockResolvedValue({
      id: "user-1",
      email: "ada@example.com",
      displayName: "Ada",
      avatarUrl: null,
      timeZone: "Europe/Zagreb",
      dailyTargetMinutes: 420,
      createdAt: new Date("2026-10-01T08:30:00.000Z"),
      updatedAt: new Date()
    });

    await service.updateMe("user-1", {});

    expect(updateSettings).not.toHaveBeenCalled();
  });

  it("updateMe → 401 when the user no longer exists", async () => {
    updateSettings.mockResolvedValue(null);
    await expect(
      service.updateMe("gone", { dailyTargetMinutes: 480 })
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("getMe → 401 when the user no longer exists", async () => {
    findById.mockResolvedValue(null);
    await expect(service.getMe("gone")).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });

  it("search asks for at most 10 users, the caller first", async () => {
    search.mockResolvedValue([{ id: "u2" }]);
    await expect(service.search("u1", "an")).resolves.toEqual({
      items: [{ id: "u2" }]
    });
    expect(search).toHaveBeenCalledWith("an", "u1", 10);
  });
});
