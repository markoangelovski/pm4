import { ApiProperty } from "@nestjs/swagger";
import { BookingDto } from "./booking.dto.js";
import { TimeLogResponseDto } from "./time-log-response.dto.js";

/** `BookingLog`: a `TimeLog` plus its bookings (endpoints.md *Shared booking shapes*). */
export class BookingLogResponseDto extends TimeLogResponseDto {
  /** By date ascending; [] = not booked. */
  @ApiProperty({ type: [BookingDto] })
  bookings: BookingDto[];
}

/** `GET /bookings` and `PUT /bookings` (API-BOOK-001/002). */
export class BookingListResponseDto {
  @ApiProperty({ type: [BookingLogResponseDto] })
  items: BookingLogResponseDto[];
}
