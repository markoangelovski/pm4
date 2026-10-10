import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { UsersRepository } from "../users/users.repository.js";
import {
  BookingListResponseDto,
  BookingLogResponseDto
} from "./dto/booking-log-response.dto.js";
import { SetBookingDto } from "./dto/set-booking.dto.js";
import { WorkdaysQueryDto } from "./dto/workdays-query.dto.js";
import { TimeRepository, type TimeLogRow } from "./time.repository.js";
import {
  assertDate,
  assertNotFuture,
  daysBetween,
  toTimeLogDto
} from "./time-logs.service.js";

const MAX_RANGE_DAYS = 366;

/** The `BookingLog` read model: a `TimeLog` plus its booking date. */
export function toBookingLogDto(row: TimeLogRow): BookingLogResponseDto {
  return { ...toTimeLogDto(row), bookingDate: row.bookingDate };
}

/** Bookings (API-BOOK-001/002), always the caller's own. */
@Injectable()
export class BookingsService {
  constructor(
    private readonly timeRepository: TimeRepository,
    private readonly usersRepository: UsersRepository
  ) {}

  async list(
    userId: string,
    query: WorkdaysQueryDto
  ): Promise<BookingListResponseDto> {
    assertDate(query.from, "from");
    assertDate(query.to, "to");
    const days = daysBetween(query.from, query.to);
    if (days < 0 || days > MAX_RANGE_DAYS) {
      throw new BadRequestException({
        errors: [
          {
            field: "to",
            message: `must not be before from and at most ${MAX_RANGE_DAYS} days after it`
          }
        ]
      });
    }
    const rows = await this.timeRepository.listBookingRange(
      userId,
      query.from,
      query.to
    );
    return { items: rows.map(toBookingLogDto) };
  }

  async set(
    userId: string,
    dto: SetBookingDto
  ): Promise<BookingListResponseDto> {
    if (dto.bookingDate !== null) {
      assertDate(dto.bookingDate, "bookingDate");
      await assertNotFuture(
        this.usersRepository,
        userId,
        dto.bookingDate,
        "bookingDate"
      );
    }
    const result = await this.timeRepository.setBookingDate(
      userId,
      dto.logIds,
      dto.bookingDate
    );
    if (result.status === "not-found") {
      throw new NotFoundException("Time log not found.");
    }
    if (result.status === "not-bookable") {
      throw new BadRequestException({
        errors: [
          { field: "logIds", message: "contains a log that can't be booked" }
        ]
      });
    }
    return { items: result.rows.map(toBookingLogDto) };
  }
}
