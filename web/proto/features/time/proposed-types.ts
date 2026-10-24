import type { components } from "@/lib/api/schema";

/** One date the project's or task's logs were worked on: their minutes, and how many of those are booked. */
export interface LoggedDayDto {
  workDate: string;
  workedMinutes: number;
  bookedMinutes: number;
}

/** API-TLOG-001 + `days`: every date with a matching log (all of them, not just the page's), oldest first. */
export type TimeLogListResponseDto =
  components["schemas"]["TimeLogListResponseDto"] & { days: LoggedDayDto[] };
