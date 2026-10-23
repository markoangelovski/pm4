import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { UsersRepository } from "../users/users.repository.js";
import {
  BookingListResponseDto,
  BookingLogResponseDto
} from "./dto/booking-log-response.dto.js";
import { SetBookingsDto } from "./dto/set-bookings.dto.js";
import { WorkdaysQueryDto } from "./dto/workdays-query.dto.js";
import { TimeRepository, type BookingLogRow } from "./time.repository.js";
import {
  assertDate,
  daysBetween,
  todayIn,
  toTimeLogDto
} from "./time-logs.service.js";

const MAX_RANGE_DAYS = 366;

/** The `BookingLog` read model: a `TimeLog` plus its bookings. */
export function toBookingLogDto(row: BookingLogRow): BookingLogResponseDto {
  return { ...toTimeLogDto(row), bookings: row.bookings };
}

function invalid(field: string, message: string): never {
  throw new BadRequestException({ errors: [{ field, message }] });
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
  async set(
    userId: string,
    dto: SetBookingsDto
  ): Promise<BookingListResponseDto> {
    const seen = new Set<string>();
    dto.logs.forEach((entry, i) => {
      if (seen.has(entry.logId))
        invalid(`logs.${i}.logId`, "lists a log twice");
      seen.add(entry.logId);
    });
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException("Missing or invalid access token.");
    }
    const today = todayIn(user.timeZone);
    dto.logs.forEach((entry, i) =>
      entry.bookings.forEach((b, j) => {
        if (b.date > today) {
          invalid(`logs.${i}.bookings.${j}.date`, "must not be after today");
        }
      })
    );
    dto.logs.forEach((entry, i) => {
      const dates = new Set(entry.bookings.map((b) => b.date));
      if (dates.size < entry.bookings.length) {
        invalid(`logs.${i}.bookings`, "has two bookings on one date");
      }
    });
    const result = await this.timeRepository.setBookings(
      userId,
      dto.logs.map((e) => ({
        logId: e.logId,
        bookings: e.bookings.map((b) => ({ date: b.date, minutes: b.minutes }))
      }))
    );
    if (result.status === "not-found") {
      throw new NotFoundException("Time log not found.");
    }
    if (result.status === "invalid") {
      invalid(`logs.${result.index}.bookings`, result.message);
    }
    return { items: result.rows.map(toBookingLogDto) };
  }
}
