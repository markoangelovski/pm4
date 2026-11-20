import type { operations } from "@/lib/api/schema";

/**
 * API-TLOG-001's query with the work-date range the Logged time section needs. `from` and `to` are required
 * `YYYY-MM-DD` work dates, from ≤ to, to − from ≤ 366 days (as the dashboard report); the page, `total`,
 * `totalMinutes`, `bookedMinutes` and `days` then cover only the logs whose work date is in the range.
 */
export type TimeLogListQuery = NonNullable<
  operations["TimeLogsController_list"]["parameters"]["query"]
> & {
  from: string;
  to: string;
};
