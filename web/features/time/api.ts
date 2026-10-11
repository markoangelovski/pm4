import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { projectKeys } from "@/features/projects/api";
import { taskKeys } from "@/features/tasks/api";
import { apiClient } from "@/lib/api/client";
import { unwrap, unwrapVoid } from "@/lib/api/problem";
import type { components } from "@/lib/api/schema";
import { nowMinute } from "@/lib/time/clock";
import type { Day, TimeLog, TimeLogInput } from "./types";

export type {
  Day,
  DayView,
  ProjectRef,
  Ref,
  TaskRef,
  TimeLog,
  TimeLogInput
} from "./types";

export interface WorkdayList {
  items: { workDate: string; startMinute: number; totalMinutes: number }[];
}

/** API-TLOG-001: one page of a project's or task's logs, with their booking dates and the totals. */
export type TimeLogList = components["schemas"]["TimeLogListResponseDto"];
export type TimeLogFilter = { projectId: string } | { taskId: string };

/** The Logged time section's page size (SCR-044). */
export const TIME_LOG_PAGE_SIZE = 25;

export const timeKeys = {
  all: ["time"] as const,
  days: () => [...timeKeys.all, "day"] as const,
  day: (date: string) => [...timeKeys.days(), date] as const,
  workdays: () => [...timeKeys.all, "workdays"] as const,
  workdayRange: (from: string, to: string) =>
    [...timeKeys.workdays(), from, to] as const,
  logs: () => [...timeKeys.all, "logs"] as const,
  logList: (filter: TimeLogFilter, page: number) =>
    [...timeKeys.logs(), filter, page] as const
};

/** API-TLOG-001, TIME_LOG_PAGE_SIZE per page, keepPreviousData. Under timeKeys.all, so every log mutation refreshes it. */
export function useTimeLogs(
  filter: TimeLogFilter,
  page: number
): UseQueryResult<TimeLogList, Error> {
  return useQuery({
    queryKey: timeKeys.logList(filter, page),
    queryFn: async ({ signal }) =>
      unwrap(
        await apiClient.GET("/api/v1/time-logs", {
          params: { query: { ...filter, page, pageSize: TIME_LOG_PAGE_SIZE } },
          signal
        })
      ),
    placeholderData: keepPreviousData
  });
}

/** API-WD-003. */
export function useDay(date: string): UseQueryResult<Day, Error> {
  return useQuery({
    queryKey: timeKeys.day(date),
    queryFn: async ({ signal }) =>
      unwrap(
        await apiClient.GET("/api/v1/workdays/{date}", {
          params: { path: { date } },
          signal
        })
      ) as Day
  });
}

/** API-WD-001, keepPreviousData. */
export function useWorkdays(
  from: string,
  to: string
): UseQueryResult<WorkdayList, Error> {
  return useQuery({
    queryKey: timeKeys.workdayRange(from, to),
    queryFn: async ({ signal }) =>
      unwrap(
        await apiClient.GET("/api/v1/workdays", {
          params: { query: { from, to } },
          signal
        })
      ) as WorkdayList,
    placeholderData: keepPreviousData
  });
}

/** D3: a log change refreshes the time, project and task queries (the logged totals live on the projects and tasks). */
function refreshAfterLogChange(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: timeKeys.all }),
    queryClient.invalidateQueries({ queryKey: projectKeys.all }),
    queryClient.invalidateQueries({ queryKey: taskKeys.all })
  ]);
}

/** API-TLOG-002; invalidates timeKeys.all, projectKeys.all and taskKeys.all (D3). */
export function useCreateLog(): UseMutationResult<
  TimeLog,
  Error,
  TimeLogInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TimeLogInput) =>
      unwrap(
        await apiClient.POST("/api/v1/time-logs", { body: input })
      ) as TimeLog,
    onSuccess: () => refreshAfterLogChange(queryClient)
  });
}

/** API-TLOG-004; invalidates timeKeys.all, projectKeys.all and taskKeys.all (D3); sends projectId/taskId only when present in the input (D9). */
export function useUpdateLog(
  id: string
): UseMutationResult<TimeLog, Error, TimeLogInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TimeLogInput) =>
      unwrap(
        await apiClient.PATCH("/api/v1/time-logs/{id}", {
          params: { path: { id } },
          body: input
        })
      ) as TimeLog,
    onSuccess: () => refreshAfterLogChange(queryClient)
  });
}

/** API-TLOG-006; invalidates timeKeys.all, projectKeys.all and taskKeys.all (D3). */
export function useDeleteLog(): UseMutationResult<void, Error, TimeLog> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (log: TimeLog) =>
      unwrapVoid(
        await apiClient.DELETE("/api/v1/time-logs/{id}", {
          params: { path: { id: log.id } }
        })
      ),
    onSuccess: () => refreshAfterLogChange(queryClient)
  });
}

/** API-WD-002, then invalidates timeKeys.day(date) and timeKeys.workdays(). */
export function useSetDayStart(
  date: string
): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (startMinute: number) =>
      unwrapVoid(
        await apiClient.PUT("/api/v1/workdays/{date}", {
          params: { path: { date } },
          body: { startMinute }
        })
      ),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: timeKeys.day(date) }),
        queryClient.invalidateQueries({ queryKey: timeKeys.workdays() })
      ])
  });
}

/** D4: nowMinute(tz), re-read every 15 s and once right after enabling; null when !enabled. */
export function useNowMinute(tz: string, enabled: boolean): number | null {
  const [now, setNow] = useState(() => nowMinute(tz));
  useEffect(() => {
    if (!enabled) return;
    // Deferred (not synchronous) so the lint rule react-hooks/set-state-in-effect stays quiet.
    const t = setTimeout(() => setNow(nowMinute(tz)), 0);
    const id = setInterval(() => setNow(nowMinute(tz)), 15_000);
    return () => {
      clearTimeout(t);
      clearInterval(id);
    };
  }, [tz, enabled]);
  return enabled ? now : null;
}
