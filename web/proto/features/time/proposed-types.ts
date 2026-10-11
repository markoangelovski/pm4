// API shapes the prototype needs that `lib/api/schema` doesn't have yet. `npm run api:types` replaces
// them once the API serves them.
import type { components } from "@/lib/api/schema";

/** API-TLOG-001 item: a log with its booking date (the shape of API-BOOK-001's items). */
export type TimeLogListItemDto = components["schemas"]["BookingLogResponseDto"];

/**
 * API-TLOG-001 response: one page of a project's or task's logs, newest date first. `totalMinutes` and
 * `bookedMinutes` sum every matching log (booked = has a booking date), not only the page.
 */
export interface TimeLogListResponseDto {
  items: TimeLogListItemDto[];
  page: number;
  pageSize: number;
  total: number;
  totalMinutes: number;
  bookedMinutes: number;
}

/** API-TLOG-001 query: exactly one of `projectId`, `taskId`. */
export type TimeLogListQuery = (
  { projectId: string; taskId?: never } | { taskId: string; projectId?: never }
) & { page: number; pageSize: number };

/** `apiClient.GET` for API-TLOG-001 until `lib/api/schema` has it (the hook casts to this). */
export type GetTimeLogs = (
  path: "/api/v1/time-logs",
  init: { params: { query: TimeLogListQuery }; signal?: AbortSignal }
) => Promise<{
  data?: TimeLogListResponseDto;
  error?: unknown;
  response: Response;
}>;
