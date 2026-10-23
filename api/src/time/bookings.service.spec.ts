import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { UsersRepository } from "../users/users.repository.js";
import { BookingsService } from "./bookings.service.js";
import { TimeRepository } from "./time.repository.js";

describe("BookingsService", () => {
  const repository = {
    listBookingRange: vi.fn(),
    setBookingDate: vi.fn()
  };
  const users = { findById: vi.fn() };
  let service: BookingsService;

  beforeEach(async () => {
    vi.resetAllMocks();
    users.findById.mockResolvedValue({ timeZone: "UTC" });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: TimeRepository, useValue: repository },
        { provide: UsersRepository, useValue: users }
      ]
    }).compile();
    service = module.get(BookingsService);
  });

  it("list rejects from > to and ranges over 366 days", async () => {
    await expect(
      service.list("u", { from: "2026-10-09", to: "2026-10-01" })
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.list("u", { from: "2025-01-01", to: "2026-10-01" })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.listBookingRange).not.toHaveBeenCalled();
  });
});
