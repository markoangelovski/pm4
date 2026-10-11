import { ApiProperty } from "@nestjs/swagger";
import { BookingLogResponseDto } from "./booking-log-response.dto.js";

/** A page of a project's or task's logs, with totals over all of them (API-TLOG-001). */
export class TimeLogListResponseDto {
  @ApiProperty({ type: [BookingLogResponseDto] })
  items: BookingLogResponseDto[];
  @ApiProperty({ type: "integer" })
  page: number;
  @ApiProperty({ type: "integer" })
  pageSize: number;
  @ApiProperty({ type: "integer" })
  total: number;
  /** Minutes of all the matching logs, not only this page. */
  @ApiProperty({ type: "integer" })
  totalMinutes: number;
  /** Minutes of the matching logs that have a booking date. */
  @ApiProperty({ type: "integer" })
  bookedMinutes: number;
}
