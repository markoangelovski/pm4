import { ApiProperty } from "@nestjs/swagger";
import { BookingLogResponseDto } from "./booking-log-response.dto.js";

/** `LoggedDay`: one date with a matching log (API-TLOG-001 `days`). */
export class LoggedDayDto {
  @ApiProperty({ type: String, format: "date", example: "2026-10-06" })
  workDate: string;
  /** Minutes of that date's matching logs (excluded ones too). */
  @ApiProperty({ type: "integer", example: 315 })
  workedMinutes: number;
  /** Booked minutes of those logs, whatever the bookings' dates. */
  @ApiProperty({ type: "integer", example: 120 })
  bookedMinutes: number;
}

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
  /** Booked minutes of the matching logs (the sum of their bookings). */
  @ApiProperty({ type: "integer" })
  bookedMinutes: number;
  /** Every date with a matching log (not only this page's), oldest first. */
  @ApiProperty({ type: [LoggedDayDto] })
  days: LoggedDayDto[];
}
