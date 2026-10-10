import { ApiProperty } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsUUID,
  Matches,
  ValidateIf
} from "class-validator";

/** `PUT /bookings` body (API-BOOK-002). */
export class SetBookingDto {
  /** 1–100 time log ids; repeats are allowed. */
  @ApiProperty({ type: [String], format: "uuid", minItems: 1, maxItems: 100 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID(undefined, { each: true })
  logIds: string[];

  /** A date not after today in the caller's zone, or `null` to remove the booking. Absent → 400. */
  @ApiProperty({ type: String, format: "date", nullable: true })
  @ValidateIf((o: SetBookingDto) => o.bookingDate !== null)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  bookingDate: string | null;
}
