import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsISO8601, Matches, Max, Min, Validate } from "class-validator";
import { MultipleOf15 } from "../../common/validation/minutes.js";

/** `Booking`: part of a log's time booked to a date (endpoints.md *Shared booking shapes*). */
export class BookingDto {
  /** `YYYY-MM-DD`; not after today in the caller's zone (checked by the service). */
  @ApiProperty({ type: String, format: "date", example: "2026-10-07" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  date: string;

  /** 15–1440, a multiple of 15. */
  @ApiProperty({ type: Number, minimum: 15, maximum: 1440 })
  @IsInt()
  @Min(15)
  @Max(1440)
  @Validate(MultipleOf15)
  minutes: number;
}
