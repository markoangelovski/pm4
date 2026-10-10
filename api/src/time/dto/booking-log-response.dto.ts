import { ApiProperty } from "@nestjs/swagger";
import { TimeLogResponseDto } from "./time-log-response.dto.js";

/** `BookingLog`: a `TimeLog` plus its booking date (endpoints.md *Shared booking shapes*). */
export class BookingLogResponseDto extends TimeLogResponseDto {
  @ApiProperty({
    type: String,
    format: "date",
    nullable: true,
    example: "2026-10-07"
  })
  bookingDate: string | null;
}

/** `GET /bookings` and `PUT /bookings` (API-BOOK-001/002). */
export class BookingListResponseDto {
  @ApiProperty({ type: [BookingLogResponseDto] })
  items: BookingLogResponseDto[];
}
