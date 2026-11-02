import type { components } from "@/lib/api/schema";

/**
 * API-RPT-001's day, proposed: `workedMinutes` leaves out the logs excluded from statistics, which `nonprodMinutes`
 * adds up instead. Replaced by `components["schemas"]["ReportDayDto"]` after `npm run api:types`.
 */
export type ReportDayDto = components["schemas"]["ReportDayDto"] & {
  /** Minutes of the day's logs excluded from statistics (Non-prod). @example 60 */
  nonprodMinutes: number;
};

export type DashboardReportResponseDto = Omit<
  components["schemas"]["DashboardReportResponseDto"],
  "days"
> & { days: ReportDayDto[] };
