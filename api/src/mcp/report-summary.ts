import type {
  DashboardReportResponseDto,
  ReportProjectDto
} from "../time/dto/dashboard-report-response.dto.js";

const DAY_MS = 86_400_000;

/** Monday–Friday dates in [from, to] (UTC calendar arithmetic on YYYY-MM-DD); 0 when to < from. */
export function weekdaysBetween(from: string, to: string): number {
  const start = Date.parse(from);
  const end = Date.parse(to);
  let count = 0;
  for (let t = start; t <= end; t += DAY_MS) {
    const weekday = new Date(t).getUTCDay();
    if (weekday >= 1 && weekday <= 5) count += 1;
  }
  return count;
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
  const sum = (pick: (day: (typeof report.days)[number]) => number): number =>
    report.days.reduce((total, day) => total + pick(day), 0);
  const weekdays = weekdaysBetween(from, to);
  return {
    from,
    to,
    workedMinutes: sum((day) => day.workedMinutes),
    bookedMinutes: sum((day) => day.bookedMinutes),
    nonprodMinutes: sum((day) => day.nonprodMinutes),
    weekdays,
    dailyTargetMinutes,
    targetMinutes: weekdays * dailyTargetMinutes,
    projects: report.projects
  };
}
