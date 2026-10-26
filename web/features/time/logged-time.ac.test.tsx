import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import { bookingKeys, useSetBooking } from "@/features/bookings/api";
import { projectKeys } from "@/features/projects/api";
import { taskKeys, useUpdateTask, type Task } from "@/features/tasks/api";
import {
  timeKeys,
  useCreateLog,
  useDeleteLog,
  useTimeLogs,
  useUpdateLog,
  type TimeLog,
  type TimeLogInput,
  type TimeLogList
} from "./api";

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PUT: vi.fn(),
  PATCH: vi.fn(),
  DELETE: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() })
}));

const log: TimeLog = {
  id: "l1",
  workDate: "2026-10-07",
  durationMinutes: 30,
  text: "Specs review",
  title: null,
  project: { id: "p1", title: "Anthropic", deleted: false },
  task: { id: "t1", title: "Meetings", deleted: false },
  excludeFromStats: false
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

const task: Task = {
  id: "t1",
  project: { id: "p1", title: "Anthropic", deleted: false },
  service: null,
  title: "Meetings",
  description: null,
  externalLink: null,
  projectLead: null,
  status: "upcoming",
  dueDate: null,
  loggedMinutes: 30,
  createdAt: "2026-10-01T08:00:00.000Z",
  updatedAt: "2026-10-01T08:00:00.000Z"
};

const list = (page: number, text: string): TimeLogList => ({
  items: [{ ...log, id: `l${page}`, text, bookings: [] }],
  page,
  pageSize: 25,
  total: 30,
  totalMinutes: 900,
  bookedMinutes: 60,
  days: [{ workDate: "2026-10-07", workedMinutes: 900, bookedMinutes: 60 }]
});

const res = (status: number) => new Response(null, { status });

function setup<P, T>(
  hook: (props: P) => T,
  options: { seed?: (queryClient: QueryClient) => void; initialProps?: P } = {}
) {
  const queryClient = createQueryClient();
  options.seed?.(queryClient);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return {
    queryClient,
    ...renderHook(hook, { wrapper, initialProps: options.initialProps })
  };
}

const invalidated = (queryClient: QueryClient, key: readonly unknown[]) =>
  queryClient.getQueryState(key)?.isInvalidated;

/** A cached query under each key root, so each invalidation can be observed. */
const dayKey = timeKeys.day("2026-10-07");
const logListKey = timeKeys.logList({ projectId: "p1" }, 1);
const bookingRangeKey = bookingKeys.range("2026-10-01", "2026-10-31");
const projectListKey = [...projectKeys.lists(), { page: 1 }];
const projectDetailKey = projectKeys.detail("p1");
const taskListKey = [...taskKeys.lists(), { page: 1 }];
const taskDetailKey = taskKeys.detail("t2");
function seedAll(queryClient: QueryClient) {
  queryClient.setQueryData(dayKey, { logs: [] });
  queryClient.setQueryData(logListKey, list(1, "Cached"));
  queryClient.setQueryData(bookingRangeKey, { items: [] });
  queryClient.setQueryData(projectListKey, { items: [] });
  queryClient.setQueryData(projectDetailKey, { id: "p1" });
  queryClient.setQueryData(taskListKey, { items: [] });
  queryClient.setQueryData(taskDetailKey, { id: "t2" });
}

describe("logged time hooks (feat-proto-sync-web)", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
  });

  it("AC-8 FR-TLOG-012 API-TLOG-001: useTimeLogs requests one page by project, keyed by filter and page, and keeps the previous page while the next loads", async () => {
    api.GET.mockResolvedValueOnce({
      data: list(1, "First page"),
      response: res(200)
    });
    const query = setup(
      ({ page }: { page: number }) => useTimeLogs({ projectId: "p1" }, page),
      { initialProps: { page: 1 } }
    );
    await waitFor(() => expect(query.result.current.isSuccess).toBe(true));
    expect(query.result.current.data).toEqual(list(1, "First page"));
    expect(
      query.queryClient.getQueryData(["time", "logs", { projectId: "p1" }, 1])
    ).toEqual(list(1, "First page"));

    let resolveNext: (value: unknown) => void = () => {};
    api.GET.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveNext = resolve;
      })
    );
    query.rerender({ page: 2 });
    await waitFor(() => expect(api.GET).toHaveBeenCalledTimes(2));
    expect(api.GET).toHaveBeenLastCalledWith(
      "/api/v1/time-logs",
      expect.objectContaining({
        params: { query: { projectId: "p1", page: 2, pageSize: 25 } }
      })
    );
    expect(query.result.current.data).toEqual(list(1, "First page"));
    expect(query.result.current.isPlaceholderData).toBe(true);

    await act(async () => {
      resolveNext({ data: list(2, "Second page"), response: res(200) });
    });
    await waitFor(() =>
      expect(query.result.current.data).toEqual(list(2, "Second page"))
    );
    expect(
      query.queryClient.getQueryData(["time", "logs", { projectId: "p1" }, 2])
    ).toEqual(list(2, "Second page"));

    // By task: the query has taskId instead of projectId.
    api.GET.mockResolvedValueOnce({
      data: list(1, "Task page"),
      response: res(200)
    });
    const byTask = setup(() => useTimeLogs({ taskId: "t1" }, 1));
    await waitFor(() => expect(byTask.result.current.isSuccess).toBe(true));
    expect(api.GET).toHaveBeenLastCalledWith(
      "/api/v1/time-logs",
      expect.objectContaining({
        params: { query: { taskId: "t1", page: 1, pageSize: 25 } }
      })
    );
  });

  it("AC-9 FR-PRJ-002 FR-TSK-002 FR-TLOG-012: creating, updating or deleting a log invalidates time, projects and tasks", async () => {
    const expectInvalidated = (queryClient: QueryClient) => {
      for (const key of [
        dayKey,
        logListKey,
        projectListKey,
        projectDetailKey,
        taskListKey,
        taskDetailKey
      ]) {
        expect(invalidated(queryClient, key), JSON.stringify(key)).toBe(true);
      }
    };

    api.POST.mockResolvedValueOnce({ data: log, response: res(201) });
    const create = setup(() => useCreateLog(), { seed: seedAll });
    await act(() => create.result.current.mutateAsync(input));
    expectInvalidated(create.queryClient);

    api.PATCH.mockResolvedValueOnce({ data: log, response: res(200) });
    const update = setup(() => useUpdateLog("l1"), { seed: seedAll });
    await act(() => update.result.current.mutateAsync(input));
    expectInvalidated(update.queryClient);

    api.DELETE.mockResolvedValueOnce({ response: res(204) });
    const remove = setup(() => useDeleteLog(), { seed: seedAll });
    await act(() => remove.result.current.mutateAsync(log));
    expectInvalidated(remove.queryClient);
  });

  it("AC-10 FR-TLOG-012 FR-BOOK-005: setting a booking invalidates bookings and the logged time; updating a task invalidates the logged time", async () => {
    api.PUT.mockResolvedValueOnce({
      data: {
        items: [{ ...log, bookings: [{ date: "2026-10-07", minutes: 30 }] }]
      },
      response: res(200)
    });
    const booking = setup(() => useSetBooking(), { seed: seedAll });
    await act(() =>
      booking.result.current.mutateAsync({
        logs: [{ logId: "l1", bookings: [{ date: "2026-10-07", minutes: 30 }] }]
      })
    );
    expect(invalidated(booking.queryClient, bookingRangeKey)).toBe(true);
    expect(invalidated(booking.queryClient, logListKey)).toBe(true);

    api.PATCH.mockResolvedValueOnce({ data: task, response: res(200) });
    const update = setup(() => useUpdateTask("t1"), { seed: seedAll });
    await act(() =>
      update.result.current.mutateAsync({
        projectId: "p1",
        title: "Meetings",
        description: null,
        externalLink: null,
        projectLeadUserId: null,
        projectLeadName: null,
        status: "upcoming",
        dueDate: null
      })
    );
    expect(invalidated(update.queryClient, logListKey)).toBe(true);
  });
});
