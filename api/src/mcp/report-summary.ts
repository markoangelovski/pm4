import type {
  DashboardReportResponseDto,
  ReportProjectDto
} from "../time/dto/dashboard-report-response.dto.js";

/** Monday–Friday dates in [from, to] (UTC calendar arithmetic on YYYY-MM-DD); 0 when to < from. */
export function weekdaysBetween(from: string, to: string): number {
  void from;
  void to;
  throw new Error("not implemented (feat-mcp-tools-api)");
}

export interface ReportSummary {
  from: string;
  to: string;
  workedMinutes: number;
  bookedMinutes: number;
  nonprodMinutes: number;
  weekdays: number;
  dailyTargetMinutes: number;
  targetMinutes: number;
  projects: ReportProjectDto[];
}

/** Sums report.days' worked/booked/nonprod; targetMinutes = weekdays × dailyTargetMinutes (FR-RPT-004); projects as given. */
export function summarizeReport(
  report: DashboardReportResponseDto,
  from: string,
  to: string,
  dailyTargetMinutes: number
): ReportSummary {
  void report;
  void from;
  void to;
  void dailyTargetMinutes;
  throw new Error("not implemented (feat-mcp-tools-api)");
}
