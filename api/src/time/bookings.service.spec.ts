import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { UsersRepository } from "../users/users.repository.js";
import { BookingsService, toBookingLogDto } from "./bookings.service.js";
import { TimeRepository, type BookingLogRow } from "./time.repository.js";

const A = "0190a000-0000-7000-8000-000000000001";
const B = "0190a000-0000-7000-8000-000000000002";

const row: BookingLogRow = {
  id: A,
  workDate: "2026-10-07",
  durationMinutes: 240,
  excludeFromStats: false,
  text: "x",
  title: null,
  taskId: null,
  projectId: "p",
  deletedTaskTitle: null,
  deletedProjectTitle: null,
  taskTitle: null,
  projectTitle: "P",
  bookings: [{ date: "2026-10-07", minutes: 120 }]
};

describe("BookingsService", () => {
  const repository = {
    listBookingRange: vi.fn(),
    setBookings: vi.fn()
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

  const fieldOf = async (promise: Promise<unknown>) => {
    const e = (await promise.catch((x: unknown) => x)) as BadRequestException;
    expect(e).toBeInstanceOf(BadRequestException);
    return e.getResponse() as { errors: { field: string; message: string }[] };
  };

  it("toBookingLogDto adds the bookings to the TimeLog", () => {
    const dto = toBookingLogDto(row);
    expect(dto.id).toBe(A);
    expect(dto.bookings).toEqual([{ date: "2026-10-07", minutes: 120 }]);
    expect(dto).not.toHaveProperty("bookingDate");
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

  it("list maps the rows", async () => {
    repository.listBookingRange.mockResolvedValue([row]);
    const res = await service.list("u", {
      from: "2026-10-01",
      to: "2026-10-09"
    });
    expect(res.items).toHaveLength(1);
    expect(res.items[0].bookings).toHaveLength(1);
  });

  it("set rejects a log listed twice", async () => {
    const r = await fieldOf(
      service.set("u", {
        logs: [
          { logId: A, bookings: [] },
          { logId: A, bookings: [] }
        ]
      })
    );
    expect(r.errors[0]).toEqual({
      field: "logs.1.logId",
      message: "lists a log twice"
    });
    expect(repository.setBookings).not.toHaveBeenCalled();
  });

  it("set rejects a date after today", async () => {
    const r = await fieldOf(
      service.set("u", {
        logs: [{ logId: A, bookings: [{ date: "2999-01-01", minutes: 15 }] }]
      })
    );
    expect(r.errors[0].field).toBe("logs.0.bookings.0.date");
    expect(r.errors[0].message).toBe("must not be after today");
  });

  it("set rejects two bookings on one date", async () => {
    const r = await fieldOf(
      service.set("u", {
        logs: [
          {
            logId: A,
            bookings: [
              { date: "2026-10-07", minutes: 15 },
              { date: "2026-10-07", minutes: 30 }
            ]
          }
        ]
      })
    );
    expect(r.errors[0]).toEqual({
      field: "logs.0.bookings",
      message: "has two bookings on one date"
    });
  });

  it("set rejects an unknown user", async () => {
    users.findById.mockResolvedValue(null);
    await expect(
      service.set("u", { logs: [{ logId: A, bookings: [] }] })
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("set maps not-found to 404 and invalid to a field error", async () => {
    const dto = { logs: [{ logId: A, bookings: [] }] };
    repository.setBookings.mockResolvedValueOnce({ status: "not-found" });
    await expect(service.set("u", dto)).rejects.toBeInstanceOf(
      NotFoundException
    );
    repository.setBookings.mockResolvedValueOnce({
      status: "invalid",
      index: 1,
      message: "can't be booked"
    });
    const r = await fieldOf(
      service.set("u", {
        logs: [dto.logs[0], { logId: B, bookings: [] }]
      })
    );
    expect(r.errors[0]).toEqual({
      field: "logs.1.bookings",
      message: "can't be booked"
    });
  });

  it("set returns the rows from the repository", async () => {
    repository.setBookings.mockResolvedValue({ status: "ok", rows: [row] });
    const res = await service.set("u", {
      logs: [{ logId: A, bookings: [{ date: "2026-10-07", minutes: 120 }] }]
    });
    expect(res.items[0].bookings).toEqual([
      { date: "2026-10-07", minutes: 120 }
    ]);
  });
});
