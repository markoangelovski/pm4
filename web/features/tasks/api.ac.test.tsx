import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import { projectKeys } from "@/features/projects/api";
import {
  taskKeys,
  useCreateTask,
  useDeleteTask,
  useTask,
  useTasks,
  useUpdateTask,
  useUpdateTaskStatus,
  type Task,
  type TaskInput,
  type TaskList,
  type TaskListParams
} from "./api";

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PATCH: vi.fn(),
  DELETE: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

const toast = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() })
);
vi.mock("sonner", () => ({ toast }));

const task = (over: Partial<Task> = {}): Task => ({
  id: "t1",
  project: { id: "p1", title: "Website", deleted: false },
  title: "Write the docs",
  description: null,
  externalLink: null,
  projectLead: null,
  status: "upcoming",
  dueDate: null,
  createdAt: "2026-10-01T08:00:00.000Z",
  updatedAt: "2026-10-01T08:00:00.000Z",
  ...over
});

const input: TaskInput = {
  projectId: "p1",
  title: "Write the docs",
  description: null,
  externalLink: null,
  projectLeadUserId: null,
  projectLeadName: null,
  status: "upcoming",
  dueDate: null
};

const params = (over: Partial<TaskListParams> = {}): TaskListParams => ({
  statuses: ["upcoming", "in-progress", "completed"],
  q: "",
  sort: "updatedAt:desc",
  page: 1,
  pageSize: 25,
  ...over
});

const list = (items: Task[]): TaskList => ({
  items,
  total: items.length,
  page: 1,
  pageSize: 25
});

const res = (status: number) => new Response(null, { status });

function problem(status: number, slug: string) {
  const body = {
    type: `https://pm4.angelovski.top/errors/${slug}`,
    title: "Error",
    status,
    detail: "Error."
  };
  return {
    error: body,
    response: new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/problem+json" }
    })
  };
}

function setup<T>(hook: () => T, seed?: (queryClient: QueryClient) => void) {
  const queryClient = createQueryClient();
  seed?.(queryClient);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, ...renderHook(hook, { wrapper }) };
}

const taskListCalls = () =>
  api.GET.mock.calls.filter(([path]) => path === "/api/v1/tasks");
const lastQuery = () =>
  (
    taskListCalls().at(-1)?.[1] as {
      params: { query: Record<string, unknown> };
    }
  ).params.query;

const invalidated = (queryClient: QueryClient, key: readonly unknown[]) =>
  queryClient.getQueryState(key)?.isInvalidated;

/** Seeds a project list and the project details, so their invalidation can be observed. */
const projectListKey = projectKeys.list({
  q: "",
  sort: "updatedAt:desc",
  page: 1,
  pageSize: 25
});
function seedProjects(queryClient: QueryClient, ids: string[]) {
  queryClient.setQueryData(projectListKey, list([]));
  for (const id of ids) queryClient.setQueryData(projectKeys.detail(id), {});
}

describe("task queries (feat-tsk-web)", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    api.GET.mockResolvedValue({ data: list([]), response: res(200) });
  });

  it("AC-3 FR-TSK-002 FR-TSK-003: all statuses → no status param; a subset → status; none → no request; projectId and q passed; a 404 task isn't retried", async () => {
    const all = setup(() => useTasks(params()));
    await waitFor(() => expect(all.result.current.isSuccess).toBe(true));
    expect(lastQuery()).toEqual({
      sort: "updatedAt:desc",
      page: 1,
      pageSize: 25
    });
    all.unmount();

    const subset = setup(() =>
      useTasks(
        params({
          projectId: "p1",
          statuses: ["upcoming", "in-progress"],
          q: "api",
          sort: "dueDate:asc",
          page: 2
        })
      )
    );
    await waitFor(() => expect(subset.result.current.isSuccess).toBe(true));
    // D14: the typed `status` array; openapi-fetch serializes it.
    expect(lastQuery()).toEqual({
      projectId: "p1",
      status: ["upcoming", "in-progress"],
      q: "api",
      sort: "dueDate:asc",
      page: 2,
      pageSize: 25
    });
    subset.unmount();

    const before = taskListCalls().length;
    const none = setup(() => useTasks(params({ statuses: [] })));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(taskListCalls()).toHaveLength(before);
    expect(none.result.current.fetchStatus).toBe("idle");
    none.unmount();

    api.GET.mockReset();
    api.GET.mockResolvedValue(problem(404, "not-found"));
    const detail = setup(() => useTask("t1"));
    await waitFor(() => expect(detail.result.current.isError).toBe(true));
    expect(api.GET).toHaveBeenCalledTimes(1);
    expect(api.GET).toHaveBeenCalledWith(
      "/api/v1/tasks/{id}",
      expect.objectContaining({
        params: expect.objectContaining({ path: { id: "t1" } })
      })
    );
  });
});

describe("useUpdateTaskStatus (feat-tsk-web)", () => {
  const upcomingOnly = params({ statuses: ["upcoming"] });
  const listKey = taskKeys.list(upcomingOnly);
  const t1 = task();
  const t2 = task({ id: "t2", title: "Ship it" });

  function seed(queryClient: QueryClient) {
    queryClient.setQueryData(listKey, list([t1, t2]));
    queryClient.setQueryData(taskKeys.detail("t1"), t1);
    seedProjects(queryClient, ["p1"]);
  }

  /** The list is observed (as on the page), so a refetch would show as a GET. */
  const renderStatus = () =>
    setup(
      () => ({ list: useTasks(upcomingOnly), status: useUpdateTaskStatus() }),
      seed
    );

  const cached = (queryClient: QueryClient) =>
    queryClient.getQueryData<TaskList>(listKey)!.items;

  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    toast.error.mockReset();
    api.GET.mockResolvedValue({ data: list([t1, t2]), response: res(200) });
  });

  it("AC-4 FR-TSK-006: optimistic in place; on success no list refetch and the project counts refresh; on failure the old status and a toast", async () => {
    let resolve!: (value: unknown) => void;
    api.PATCH.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const ok = renderStatus();
    const gets = api.GET.mock.calls.length;

    act(() =>
      ok.result.current.status.mutate({ task: t1, status: "completed" })
    );
    await waitFor(() =>
      expect(cached(ok.queryClient)[0]).toMatchObject({
        id: "t1",
        status: "completed"
      })
    );
    expect(cached(ok.queryClient).map((t) => t.id)).toEqual(["t1", "t2"]);
    expect(api.PATCH).toHaveBeenCalledWith(
      "/api/v1/tasks/{id}",
      expect.objectContaining({
        params: { path: { id: "t1" } },
        body: { status: "completed" }
      })
    );

    const saved = {
      ...t1,
      status: "completed" as const,
      updatedAt: "2026-10-03T10:00:00.000Z"
    };
    await act(async () => resolve({ data: saved, response: res(200) }));
    await waitFor(() => expect(ok.result.current.status.isSuccess).toBe(true));
    // D2: the row stays where it is, although the list is filtered to "upcoming".
    expect(cached(ok.queryClient).map((t) => t.id)).toEqual(["t1", "t2"]);
    expect(cached(ok.queryClient)[0].status).toBe("completed");
    expect(ok.queryClient.getQueryData(taskKeys.detail("t1"))).toEqual(saved);
    await new Promise((r) => setTimeout(r, 50));
    expect(api.GET.mock.calls.length).toBe(gets);
    expect(invalidated(ok.queryClient, projectKeys.detail("p1"))).toBe(true);
    expect(invalidated(ok.queryClient, projectListKey)).toBe(true);
    ok.unmount();

    api.PATCH.mockResolvedValueOnce({
      error: "Internal Server Error",
      response: res(500)
    });
    const failed = renderStatus();
    act(() =>
      failed.result.current.status.mutate({ task: t1, status: "completed" })
    );
    await waitFor(() =>
      expect(failed.result.current.status.isError).toBe(true)
    );
    expect(cached(failed.queryClient)[0].status).toBe("upcoming");
    expect(
      failed.queryClient.getQueryData<Task>(taskKeys.detail("t1"))!.status
    ).toBe("upcoming");
    expect(toast.error).toHaveBeenCalledWith("Couldn't change the status.");
  });
});

describe("task mutations (feat-tsk-web)", () => {
  const listKey = taskKeys.list(params());

  function seed(queryClient: QueryClient) {
    queryClient.setQueryData(listKey, list([task()]));
    queryClient.setQueryData(taskKeys.detail("t1"), task());
    seedProjects(queryClient, ["p1", "p2"]);
  }

  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    api.GET.mockResolvedValue({ data: list([]), response: res(200) });
  });

  it("AC-5 FR-TSK-001 FR-TSK-005 FR-TSK-007: create, move (old and new project) and delete invalidate their keys", async () => {
    const created = task({ id: "t9" });
    api.POST.mockResolvedValueOnce({ data: created, response: res(201) });
    const create = setup(() => useCreateTask(), seed);
    act(() => create.result.current.mutate(input));
    await waitFor(() => expect(create.result.current.isSuccess).toBe(true));
    expect(api.POST).toHaveBeenCalledWith(
      "/api/v1/tasks",
      expect.objectContaining({ body: input })
    );
    expect(invalidated(create.queryClient, listKey)).toBe(true);
    expect(invalidated(create.queryClient, projectKeys.detail("p1"))).toBe(
      true
    );
    expect(invalidated(create.queryClient, projectListKey)).toBe(true);
    create.unmount();

    const moved = task({
      project: { id: "p2", title: "Mobile app", deleted: false }
    });
    api.PATCH.mockResolvedValueOnce({ data: moved, response: res(200) });
    const update = setup(() => useUpdateTask("t1"), seed);
    act(() => update.result.current.mutate({ ...input, projectId: "p2" }));
    await waitFor(() => expect(update.result.current.isSuccess).toBe(true));
    expect(api.PATCH).toHaveBeenCalledWith(
      "/api/v1/tasks/{id}",
      expect.objectContaining({
        params: { path: { id: "t1" } },
        body: { ...input, projectId: "p2" }
      })
    );
    expect(update.queryClient.getQueryData(taskKeys.detail("t1"))).toEqual(
      moved
    );
    expect(invalidated(update.queryClient, listKey)).toBe(true);
    expect(invalidated(update.queryClient, projectKeys.detail("p1"))).toBe(
      true
    );
    expect(invalidated(update.queryClient, projectKeys.detail("p2"))).toBe(
      true
    );
    expect(invalidated(update.queryClient, projectListKey)).toBe(true);
    update.unmount();

    api.DELETE.mockResolvedValueOnce({ response: res(204) });
    const remove = setup(() => useDeleteTask(), seed);
    act(() => remove.result.current.mutate(task()));
    await waitFor(() => expect(remove.result.current.isSuccess).toBe(true));
    expect(api.DELETE).toHaveBeenCalledWith(
      "/api/v1/tasks/{id}",
      expect.objectContaining({ params: { path: { id: "t1" } } })
    );
    expect(
      remove.queryClient.getQueryData(taskKeys.detail("t1"))
    ).toBeUndefined();
    expect(invalidated(remove.queryClient, listKey)).toBe(true);
    expect(invalidated(remove.queryClient, projectKeys.detail("p1"))).toBe(
      true
    );
    expect(invalidated(remove.queryClient, projectListKey)).toBe(true);
  });
});
