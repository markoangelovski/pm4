import type { UseQueryResult } from "@tanstack/react-query";
import { timeKeys } from "@/features/time/api";
import type { DashboardReport } from "./stats";

export type { DashboardReport } from "./stats";

/** Under timeKeys.all, so every time-log mutation also refreshes the dashboard (D4). */
export const reportKeys = {
  all: [...timeKeys.all, "reports"] as const,
  dashboard: (from: string, to: string) =>
    [...reportKeys.all, "dashboard", from, to] as const
};

export interface TaskCounts {
  upcoming: number;
  "in-progress": number;
  completed: number;
}

/** API-RPT-001: GET /reports/dashboard?from=&to=. */
export function useDashboardReport(
  from: string,
  to: string
): UseQueryResult<DashboardReport, Error> {
  void from;
  void to;
  throw new Error("not implemented (feat-rpt-web)");
}

/** The user's project count: the total of a one-row project list. */
export function useProjectCount(): {
  count: number | undefined;
  isError: boolean;
} {
  throw new Error("not implemented (feat-rpt-web)");
}

/** The user's task count per status: the total of a one-row task list per status. */
export function useTaskCounts(): {
  counts: TaskCounts | undefined;
  isError: boolean;
} {
  throw new Error("not implemented (feat-rpt-web)");
}
