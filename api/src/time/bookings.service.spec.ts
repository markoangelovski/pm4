import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { UsersRepository } from "../users/users.repository.js";
import { BookingsService } from "./bookings.service.js";
import { TimeRepository } from "./time.repository.js";

const ID = "0190a000-0000-7000-8000-000000000001";

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

  it("list maps rows to BookingLog with bookingDate", async () => {
    repository.listBookingRange.mockResolvedValue([
      {
        id: ID,
        workDate: "2026-10-01",
        bookingDate: "2026-10-07",
        durationMinutes: 60,
        excludeFromStats: false,
        text: "x",
        title: null,
        taskId: null,
        projectId: null,
        deletedTaskTitle: null,
        deletedProjectTitle: "Old",
        taskTitle: null,
        taskDeletedAt: null,
        taskProjectDeletedAt: null,
        projectTitle: null,
        projectDeletedAt: null
      }
    ]);
    const result = await service.list("u", {
      from: "2026-10-01",
      to: "2026-10-09"
    });
    expect(result.items[0]).toMatchObject({
      id: ID,
      bookingDate: "2026-10-07",
      project: { id: null, title: "Old", deleted: true }
    });
  });

  it("set rejects a booking date after today in the caller's zone", async () => {
    await expect(
      service.set("u", { logIds: [ID], bookingDate: "2999-01-01" })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.setBookingDate).not.toHaveBeenCalled();
  });

  it("set maps not-found and not-bookable to 404 and 400", async () => {
    repository.setBookingDate.mockResolvedValueOnce({ status: "not-found" });
    await expect(
      service.set("u", { logIds: [ID], bookingDate: null })
    ).rejects.toBeInstanceOf(NotFoundException);
    repository.setBookingDate.mockResolvedValueOnce({ status: "not-bookable" });
    await expect(
      service.set("u", { logIds: [ID], bookingDate: "2026-10-01" })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("set with null passes the unbooking through", async () => {
    repository.setBookingDate.mockResolvedValueOnce({ status: "ok", rows: [] });
    await expect(
      service.set("u", { logIds: [ID], bookingDate: null })
    ).resolves.toEqual({ items: [] });
    expect(repository.setBookingDate).toHaveBeenCalledWith("u", [ID], null);
  });
});
