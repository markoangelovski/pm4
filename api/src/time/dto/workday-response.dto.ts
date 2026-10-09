import { ApiProperty } from "@nestjs/swagger";
import { TimeLogResponseDto } from "./time-log-response.dto.js";

/** `GET /workdays/{date}`: a whole day (API-WD-003). */
export class DayResponseDto {
  @ApiProperty({ type: String, format: "date" })
  workDate: string;

  @ApiProperty({ type: Number, nullable: true })
  startMinute: number | null;

  /** The sum of all the day's logs, excluded ones too. */
  totalMinutes: number;

  @ApiProperty({ type: [TimeLogResponseDto] })
  logs: TimeLogResponseDto[];
}

/** `PUT /workdays/{date}` (API-WD-002). */
export class WorkdayResponseDto {
  @ApiProperty({ type: String, format: "date" })
  workDate: string;

  startMinute: number;
}

export class WorkdaySummaryDto {
  @ApiProperty({ type: String, format: "date" })
  workDate: string;

  startMinute: number;

  totalMinutes: number;
}

/** `GET /workdays` (API-WD-001). */
export class WorkdayListResponseDto {
  @ApiProperty({ type: [WorkdaySummaryDto] })
  items: WorkdaySummaryDto[];
}
