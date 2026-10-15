import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import { useUpdateMe, userKeys, type Me } from "@/features/users/api";
import {
  timeKeys,
  useCreateLog,
  useDay,
  useDeleteDay,
  useDeleteLog,
  useSetDayStart,
  useUpdateLog,
  useWorkdays,
  type Day,
  type TimeLog,
  type TimeLogInput
} from "./api";

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PUT: vi.fn(),
  PATCH: vi.fn(),
  DELETE: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

const toast = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() })
);
vi.mock("sonner", () => ({ toast }));

const me: Me = {
  id: "0b6c7d2e-1f3a-4c5b-9d8e-7f6a5b4c3d2e",
  email: "marko@example.com",
  displayName: "Marko Angelovski",
  avatarUrl: null,
  timeZone: "Europe/Zagreb",
  dailyTargetMinutes: 420,
  createdAt: "2026-10-02T22:30:00.000Z"
};

const log: TimeLog = {
  id: "l1",
  workDate: "2026-10-07",
  durationMinutes: 30,
  text: "Specs review",
  title: null,
  project: { id: "p1", title: "Manhatan", deleted: false },
  task: { id: "t1", title: "Specifications 01", deleted: false },
  excludeFromStats: false
};

const day: Day = {
  workDate: "2026-10-07",
  startMinute: 480,
  totalMinutes: 30,
  logs: [log]
};

const input: TimeLogInput = {
  workDate: "2026-10-07",
  durationMinutes: 30,
  text: "Specs review",
  title: null,
  excludeFromStats: false,
  projectId: "p1",
  taskId: "t1"
};

const res = (status: number) => new Response(null, { status });

function setup<T>(hook: () => T, seed?: (queryClient: QueryClient) => void) {
  const queryClient = createQueryClient();
  seed?.(queryClient);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, ...renderHook(hook, { wrapper }) };
}

const invalidated = (queryClient: QueryClient, key: readonly unknown[]) =>
  queryClient.getQueryState(key)?.isInvalidated;

/** A day, another day and a month of workdays, so each invalidation can be observed. */
const dayKey = timeKeys.day("2026-10-07");
const otherDayKey = timeKeys.day("2026-10-06");
const rangeKey = timeKeys.workdayRange("2026-10-01", "2026-10-31");
function seedTime(queryClient: QueryClient) {
  queryClient.setQueryData(dayKey, day);
  queryClient.setQueryData(otherDayKey, { ...day, workDate: "2026-10-06" });
  queryClient.setQueryData(rangeKey, { items: [] });
}
const expectAllTimeInvalidated = (queryClient: QueryClient) => {
  expect(invalidated(queryClient, dayKey)).toBe(true);
  expect(invalidated(queryClient, otherDayKey)).toBe(true);
  expect(invalidated(queryClient, rangeKey)).toBe(true);
};

describe("time hooks (feat-tlog-web)", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
  });

  it("AC-8 FR-TLOG-001 FR-TLOG-002 FR-TLOG-004 FR-TLOG-008 FR-TLOG-009 FR-TLOG-017: URLs and params, invalidations, partial PATCH, PATCH /me updates the me cache", async () => {
    // useDay → API-WD-003.
    api.GET.mockResolvedValueOnce({ data: day, response: res(200) });
    const dayQuery = setup(() => useDay("2026-10-07"));
    await waitFor(() => expect(dayQuery.result.current.isSuccess).toBe(true));
    expect(dayQuery.result.current.data).toEqual(day);
    expect(api.GET).toHaveBeenCalledWith(
      "/api/v1/workdays/{date}",
      expect.objectContaining({
        params: expect.objectContaining({ path: { date: "2026-10-07" } })
      })
    );
    dayQuery.unmount();

    // useWorkdays → API-WD-001 with from and to.
    const items = [
      { workDate: "2026-10-06", startMinute: 540, totalMinutes: 300 }
    ];
    api.GET.mockResolvedValueOnce({ data: { items }, response: res(200) });
    const range = setup(() => useWorkdays("2026-10-01", "2026-10-31"));
    await waitFor(() => expect(range.result.current.isSuccess).toBe(true));
    expect(range.result.current.data).toEqual({ items });
    expect(api.GET).toHaveBeenLastCalledWith(
      "/api/v1/workdays",
      expect.objectContaining({
        params: expect.objectContaining({
          query: { from: "2026-10-01", to: "2026-10-31" }
        })
      })
    );
    range.unmount();

    // Create → POST, every time query invalidated (D3).
    api.POST.mockResolvedValueOnce({ data: log, response: res(201) });
    const create = setup(() => useCreateLog(), seedTime);
    act(() => create.result.current.mutate(input));
    await waitFor(() => expect(create.result.current.isSuccess).toBe(true));
    expect(api.POST).toHaveBeenCalledWith(
      "/api/v1/time-logs",
      expect.objectContaining({ body: input })
    );
    expectAllTimeInvalidated(create.queryClient);
    create.unmount();

    // Update with the link → PATCH sends it.
    api.PATCH.mockResolvedValueOnce({ data: log, response: res(200) });
    const update = setup(() => useUpdateLog("l1"), seedTime);
    act(() => update.result.current.mutate(input));
    await waitFor(() => expect(update.result.current.isSuccess).toBe(true));
    expect(api.PATCH).toHaveBeenCalledWith(
      "/api/v1/time-logs/{id}",
      expect.objectContaining({
        params: { path: { id: "l1" } },
        body: input
      })
    );
    expectAllTimeInvalidated(update.queryClient);
    update.unmount();

    // Update without projectId / taskId in the input → neither is sent (D9).
    api.PATCH.mockResolvedValueOnce({ data: log, response: res(200) });
    const partial = setup(() => useUpdateLog("l1"), seedTime);
    const withoutLink: TimeLogInput = {
      workDate: "2026-10-07",
      durationMinutes: 45,
      text: "Specs review, part 2",
      title: null,
      excludeFromStats: false
    };
    act(() => partial.result.current.mutate(withoutLink));
    await waitFor(() => expect(partial.result.current.isSuccess).toBe(true));
    const body = (api.PATCH.mock.lastCall?.[1] as { body: object }).body;
    expect(body).toEqual(withoutLink);
    expect(body).not.toHaveProperty("projectId");
    expect(body).not.toHaveProperty("taskId");
    partial.unmount();

    // Delete → DELETE, every time query invalidated.
    api.DELETE.mockResolvedValueOnce({ response: res(204) });
    const remove = setup(() => useDeleteLog(), seedTime);
    act(() => remove.result.current.mutate(log));
    await waitFor(() => expect(remove.result.current.isSuccess).toBe(true));
    expect(api.DELETE).toHaveBeenCalledWith(
      "/api/v1/time-logs/{id}",
      expect.objectContaining({ params: { path: { id: "l1" } } })
    );
    expectAllTimeInvalidated(remove.queryClient);
    remove.unmount();

    // Day start → PUT, that day and the workdays invalidated, not other days.
    api.PUT.mockResolvedValueOnce({
      data: { workDate: "2026-10-07", startMinute: 495 },
      response: res(200)
    });
    const start = setup(() => useSetDayStart("2026-10-07"), seedTime);
    act(() => start.result.current.mutate(495));
    await waitFor(() => expect(start.result.current.isSuccess).toBe(true));
    expect(api.PUT).toHaveBeenCalledWith(
      "/api/v1/workdays/{date}",
      expect.objectContaining({
        params: { path: { date: "2026-10-07" } },
        body: { startMinute: 495 }
      })
    );
    expect(invalidated(start.queryClient, dayKey)).toBe(true);
    expect(invalidated(start.queryClient, rangeKey)).toBe(true);
    expect(invalidated(start.queryClient, otherDayKey)).toBe(false);
    start.unmount();

    // useUpdateMe → PATCH /me, the me cache holds the response.
    const saved: Me = { ...me, dailyTargetMinutes: 450 };
    api.PATCH.mockResolvedValueOnce({ data: saved, response: res(200) });
    const updateMe = setup(
      () => useUpdateMe(),
      (queryClient) => queryClient.setQueryData(userKeys.me(), me)
    );
    act(() => updateMe.result.current.mutate({ dailyTargetMinutes: 450 }));
    await waitFor(() => expect(updateMe.result.current.isSuccess).toBe(true));
    expect(api.PATCH).toHaveBeenLastCalledWith(
      "/api/v1/me",
      expect.objectContaining({ body: { dailyTargetMinutes: 450 } })
    );
    expect(updateMe.queryClient.getQueryData(userKeys.me())).toEqual(saved);
  });
});

describe("Delete day hook (feat-hard-delete)", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
  });

  it("AC-10 FR-TLOG-019: useDeleteDay → DELETE /api/v1/workdays/{date}; invalidates time, projects and tasks", async () => {
    const projectsKey = ["projects", "detail", "p1"] as const;
    const tasksKey = ["tasks", "list", {}] as const;
    api.DELETE.mockResolvedValueOnce({ response: res(204) });
    const remove = setup(
      () => useDeleteDay(),
      (queryClient) => {
        seedTime(queryClient);
        queryClient.setQueryData(projectsKey, {});
        queryClient.setQueryData(tasksKey, []);
      }
    );

    act(() => remove.result.current.mutate("2026-10-06"));
    await waitFor(() => expect(remove.result.current.isSuccess).toBe(true));

    expect(api.DELETE).toHaveBeenCalledWith(
      "/api/v1/workdays/{date}",
      expect.objectContaining({ params: { path: { date: "2026-10-06" } } })
    );
    expectAllTimeInvalidated(remove.queryClient);
    expect(invalidated(remove.queryClient, projectsKey)).toBe(true);
    expect(invalidated(remove.queryClient, tasksKey)).toBe(true);
  });
});
