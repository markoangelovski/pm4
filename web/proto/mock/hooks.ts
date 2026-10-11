"use client";

// Store-backed hooks for prototype screens whose API doesn't exist in this shape yet (Dashboard, Bookings,
// logged time of a project or task). They read the store directly instead of going through a mock
// `api.ts`; the feature spec decides the real hooks. Never promoted.
import { useMemo } from "react";
import type { TimeLog } from "@/proto/features/time/types";
import { mock, useMockState } from "./store";

export function useMeSettings(): {
  timeZone: string;
  dailyTargetMinutes: number;
} {
  const { me } = useMockState();
  return { timeZone: me.timeZone, dailyTargetMinutes: me.dailyTargetMinutes };
}

export const LOGGED_TIME_PAGE_SIZE = 25;

/** A project's or task's logs, newest date first (SCR-044). */
export function useEntityLogs(
  filter: { projectId?: string; taskId?: string },
  page: number
) {
  const s = useMockState();
  return useMemo(() => {
    const all = s.logs
      .filter((l) =>
        filter.taskId
          ? l.task?.id === filter.taskId
          : l.project?.id === filter.projectId
      )
      .sort((a, b) =>
        a.workDate === b.workDate ? 0 : a.workDate < b.workDate ? 1 : -1
      );
    const start = (page - 1) * LOGGED_TIME_PAGE_SIZE;
    return {
      items: all
        .slice(start, start + LOGGED_TIME_PAGE_SIZE)
        .map((l) => ({ ...l, bookingDate: s.bookings[l.id] ?? null })),
      total: all.length,
      totalMinutes: all.reduce((t, l) => t + l.durationMinutes, 0),
      bookedMinutes: all.reduce(
        (t, l) => (s.bookings[l.id] ? t + l.durationMinutes : t),
        0
      )
    };
  }, [s, filter.projectId, filter.taskId, page]);
}

/** Total logged minutes of every project and task (the list pages' "Logged" column). */
export function useLoggedTotals(): {
  projects: Record<string, number>;
  tasks: Record<string, number>;
} {
  const s = useMockState();
  return useMemo(() => {
    const projects: Record<string, number> = {};
    const tasks: Record<string, number> = {};
    for (const l of s.logs) {
      if (l.project?.id)
        projects[l.project.id] =
          (projects[l.project.id] ?? 0) + l.durationMinutes;
      if (l.task?.id)
        tasks[l.task.id] = (tasks[l.task.id] ?? 0) + l.durationMinutes;
    }
    return { projects, tasks };
  }, [s]);
}

/** Every log with a work date in `from`..`to` (inclusive, `YYYY-MM-DD`). */
export function useLogsInRange(from: string, to: string): TimeLog[] {
  const s = useMockState();
  return useMemo(
    () => s.logs.filter((l) => l.workDate >= from && l.workDate <= to),
    [s, from, to]
  );
}

/** The booking date of every booked log (logId → `YYYY-MM-DD`). */
export function useBookings(): Record<string, string> {
  return useMockState().bookings;
}

export function useBookingActions() {
  return { book: mock.book, unbook: mock.unbook, bookMany: mock.bookMany };
}

/** The start minute of every workday in `from`..`to` (date → minutes since midnight). */
export function useDayStarts(from: string, to: string): Record<string, number> {
  const s = useMockState();
  return useMemo(
    () =>
      Object.fromEntries(
        Object.entries(s.starts).filter(([d]) => d >= from && d <= to)
      ),
    [s, from, to]
  );
}

/** Every log (Bookings needs the originating day of a log booked to another day). */
export function useAllLogs(): TimeLog[] {
  return useMockState().logs;
}
