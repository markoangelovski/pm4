import { ApiProperty } from "@nestjs/swagger";
import { RefDto } from "../../common/dto/ref.dto.js";

/** The kinds of a `ReportProject` row (endpoints.md API-RPT-001). */
export const REPORT_PROJECT_KINDS = ["project", "unsorted", "nonprod"] as const;
export type ReportProjectKind = (typeof REPORT_PROJECT_KINDS)[number];

/** `ReportDay`: one date with a workday or a log. */
export class ReportDayDto {
  @ApiProperty({ type: String, format: "date", example: "2026-10-06" })
  workDate: string;

  /** Minutes after midnight, or `null` for a date with logs but no workday. */
  @ApiProperty({ type: Number, nullable: true, example: 540 })
  startMinute: number | null;

  @ApiProperty({ example: 315 })
  workedMinutes: number;

  @ApiProperty({ example: 120 })
  bookedMinutes: number;
}

/** `ReportProject`: the worked and booked minutes of one project, or of `unsorted` / `nonprod`. */
export class ReportProjectDto {
  @ApiProperty({ enum: REPORT_PROJECT_KINDS, enumName: "ReportProjectKind" })
  kind: ReportProjectKind;

  /** The project `Ref` (a deleted project → its retained name, `deleted: true`); `null` for `unsorted` and `nonprod`. */
  @ApiProperty({ type: RefDto, nullable: true })
  project: RefDto | null;

  @ApiProperty()
  workedMinutes: number;

  @ApiProperty()
  bookedMinutes: number;
}

/** `GET /reports/dashboard` (API-RPT-001). */
export class DashboardReportResponseDto {
  @ApiProperty({ type: [ReportDayDto] })
  days: ReportDayDto[];

  @ApiProperty({ type: [ReportProjectDto] })
  projects: ReportProjectDto[];
}
