import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsUUID,
  ValidateNested
} from "class-validator";
import { BookingDto } from "./booking.dto.js";

/** One log's new bookings in `PUT /bookings` (API-BOOK-002). */
export class SetLogBookingsDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  logId: string;

  /** The log's whole new list ([] = unbooked). */
  @ApiProperty({ type: [BookingDto], maxItems: 96 })
  @IsArray()
  @ArrayMaxSize(96)
  @ValidateNested({ each: true })
  @Type(() => BookingDto)
  bookings: BookingDto[];
}

/** `PUT /bookings` body (API-BOOK-002). */
export class SetBookingsDto {
  @ApiProperty({ type: [SetLogBookingsDto], minItems: 1, maxItems: 100 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SetLogBookingsDto)
  logs: SetLogBookingsDto[];
}
