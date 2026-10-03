import { UnauthorizedException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import type { User } from "../database/schema/index.js";
import { UsersRepository } from "./users.repository.js";
import { UsersService } from "./users.service.js";

describe("UsersService", () => {
  let service: UsersService;
  const findById = vi.fn<(id: string) => Promise<User | null>>();

  const search = vi.fn();

  beforeEach(async () => {
    findById.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: { findById, search } }
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
      createdAt,
      updatedAt: new Date()
    });

    await expect(service.getMe("user-1")).resolves.toEqual({
      id: "user-1",
      email: "ada@example.com",
      displayName: "Ada",
      avatarUrl: null,
      timeZone: "Europe/Zagreb",
      createdAt: "2026-10-01T08:30:00.000Z"
    });
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
