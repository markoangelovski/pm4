import {
  keepPreviousData,
  useQuery,
  type UseQueryResult
} from "@tanstack/react-query";
import { useProjects } from "@/proto/features/projects/api";
import { useTasks } from "@/proto/features/tasks/api";
import { timeKeys } from "@/proto/features/time/api";
import { apiClient } from "@/proto/mock/client";
import { unwrap } from "@/lib/api/problem";
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

/** API-RPT-001: GET /reports/dashboard?from=&to=. staleTime 0; keepPreviousData. */
export function useDashboardReport(
  from: string,
  to: string
): UseQueryResult<DashboardReport, Error> {
  return useQuery({
    queryKey: reportKeys.dashboard(from, to),
    queryFn: async ({ signal }) =>
      unwrap(
        await apiClient.GET("/api/v1/reports/dashboard", {
          params: { query: { from, to } },
          signal
        })
      ) as DashboardReport,
    staleTime: 0,
    placeholderData: keepPreviousData
  });
}

/** The user's project count: the total of a one-row project list. */
export function useProjectCount(): {
  count: number | undefined;
  isError: boolean;
} {
  const projects = useProjects({
    q: "",
    sort: "updatedAt:desc",
    page: 1,
    pageSize: 1
  });
  return { count: projects.data?.total, isError: projects.isError };
}

/** The user's task count per status: the total of a one-row task list per status. */
export function useTaskCounts(): {
  counts: TaskCounts | undefined;
  isError: boolean;
} {
  const common = {
    q: "",
    sort: "updatedAt:desc",
    page: 1,
    pageSize: 1
  } as const;
  const upcoming = useTasks({ ...common, statuses: ["upcoming"] });
  const inProgress = useTasks({ ...common, statuses: ["in-progress"] });
  const completed = useTasks({ ...common, statuses: ["completed"] });
  const all = [upcoming, inProgress, completed];
  const counts =
    upcoming.data && inProgress.data && completed.data
      ? {
          upcoming: upcoming.data.total,
          "in-progress": inProgress.data.total,
          completed: completed.data.total
        }
      : undefined;
  return { counts, isError: all.some((q) => q.isError) };
}
