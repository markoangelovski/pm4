import { BadRequestException, Injectable } from "@nestjs/common";
import { UsersRepository } from "../users/users.repository.js";
import {
  BookingListResponseDto,
  BookingLogResponseDto
} from "./dto/booking-log-response.dto.js";
import { SetBookingsDto } from "./dto/set-bookings.dto.js";
import { WorkdaysQueryDto } from "./dto/workdays-query.dto.js";
import { TimeRepository, type TimeLogRow } from "./time.repository.js";
import { assertDate, daysBetween } from "./time-logs.service.js";

const MAX_RANGE_DAYS = 366;

/** The `BookingLog` read model: a `TimeLog` plus its bookings. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- stub (feat-book-partial)
export function toBookingLogDto(row: TimeLogRow): BookingLogResponseDto {
  throw new Error("not implemented (feat-book-partial)");
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

  /** API-BOOK-002. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- stub (feat-book-partial)
  set(userId: string, dto: SetBookingsDto): Promise<BookingListResponseDto> {
    throw new Error("not implemented (feat-book-partial)");
  }
}
