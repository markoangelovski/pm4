import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import {
  projectKeys,
  useCreateProject,
  useDeleteProject,
  useProject,
  useProjects,
  useRestoreProject,
  type Project,
  type ProjectInput
} from "./api";

const GET = vi.hoisted(() => vi.fn());
const POST = vi.hoisted(() => vi.fn());
const DELETE = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET, POST, DELETE }
}));

const project: Project = {
  id: "p1",
  title: "Website",
  description: null,
  externalLink: null,
  projectLead: null,
  taskCounts: { upcoming: 0, inProgress: 0, completed: 0, total: 0 },
  createdAt: "2026-10-03T08:00:00.000Z",
  updatedAt: "2026-10-03T08:00:00.000Z"
};

const input: ProjectInput = {
  title: "Website",
  description: null,
  externalLink: null,
  projectLeadUserId: null,
  projectLeadName: null
};

const listKey = projectKeys.list({
  q: "",
  sort: "updatedAt:desc",
  page: 1,
  pageSize: 25
});
const tasksKey = ["tasks", "list", {}] as const;

const ok = (status = 200) => new Response(null, { status });

function notFound(slug: string) {
  const body = {
    type: `https://pm4.angelovski.top/errors/${slug}`,
    title: "Not Found",
    status: 404,
    detail: "Not found."
  };
  return {
    error: body,
    response: new Response(JSON.stringify(body), {
      status: 404,
      headers: { "content-type": "application/problem+json" }
    })
  };
}

function setup<T>(hook: () => T) {
  const queryClient = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, ...renderHook(hook, { wrapper }) };
}

/** Seeds a list, a detail and a task list, so invalidation and removal can be observed. */
function seed(queryClient: QueryClient) {
  queryClient.setQueryData(listKey, {
    items: [],
    total: 0,
    page: 1,
    pageSize: 25
  });
  queryClient.setQueryData(projectKeys.detail("p1"), project);
  queryClient.setQueryData(tasksKey, []);
}

const invalidated = (queryClient: QueryClient, key: readonly unknown[]) =>
  queryClient.getQueryState(key)?.isInvalidated;

describe("project queries (feat-prj-web)", () => {
  beforeEach(() => {
    GET.mockReset();
  });

  it("AC-5 FR-PRJ-002 FR-PRJ-003: list query omits an empty q; a 404 detail fails after one request", async () => {
    GET.mockResolvedValue({
      data: { items: [], total: 0, page: 2, pageSize: 25 },
      response: ok()
    });
    const list = setup(() =>
      useProjects({ q: "", sort: "title:asc", page: 2, pageSize: 25 })
    );
    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
    expect(GET).toHaveBeenCalledWith(
      "/api/v1/projects",
      expect.objectContaining({
        params: { query: { sort: "title:asc", page: 2, pageSize: 25 } }
      })
    );
    list.unmount();

    GET.mockReset();
    GET.mockResolvedValue(notFound("not-found"));
    const detail = setup(() => useProject("p1"));
    await waitFor(() => expect(detail.result.current.isError).toBe(true));
    expect(GET).toHaveBeenCalledTimes(1);
    expect(GET).toHaveBeenCalledWith(
      "/api/v1/projects/{id}",
      expect.objectContaining({
        params: expect.objectContaining({ path: { id: "p1" } })
      })
    );
  });
});

describe("project mutations (feat-prj-web)", () => {
  beforeEach(() => {
    GET.mockReset();
    POST.mockReset();
    DELETE.mockReset();
  });

  it("AC-6 FR-PRJ-001 FR-PRJ-005 FR-TRASH-002: create sets the detail and invalidates lists; delete and restore also invalidate tasks", async () => {
    const created = { ...project, id: "p2", title: "New" };
    POST.mockResolvedValueOnce({ data: created, response: ok(201) });
    const create = setup(() => useCreateProject());
    seed(create.queryClient);
    act(() => create.result.current.mutate({ ...input, title: "New" }));
    await waitFor(() => expect(create.result.current.isSuccess).toBe(true));
    expect(POST).toHaveBeenCalledWith(
      "/api/v1/projects",
      expect.objectContaining({ body: { ...input, title: "New" } })
    );
    expect(create.queryClient.getQueryData(projectKeys.detail("p2"))).toEqual(
      created
    );
    expect(invalidated(create.queryClient, listKey)).toBe(true);
    create.unmount();

    DELETE.mockResolvedValueOnce({ response: ok(204) });
    const remove = setup(() => useDeleteProject());
    seed(remove.queryClient);
    act(() => remove.result.current.mutate("p1"));
    await waitFor(() => expect(remove.result.current.isSuccess).toBe(true));
    expect(DELETE).toHaveBeenCalledWith(
      "/api/v1/projects/{id}",
      expect.objectContaining({ params: { path: { id: "p1" } } })
    );
    expect(
      remove.queryClient.getQueryData(projectKeys.detail("p1"))
    ).toBeUndefined();
    expect(invalidated(remove.queryClient, listKey)).toBe(true);
    expect(invalidated(remove.queryClient, tasksKey)).toBe(true);
    remove.unmount();

    POST.mockResolvedValueOnce({ response: ok(204) });
    const restore = setup(() => useRestoreProject());
    seed(restore.queryClient);
    act(() => restore.result.current.mutate("p1"));
    await waitFor(() => expect(restore.result.current.isSuccess).toBe(true));
    expect(POST).toHaveBeenCalledWith(
      "/api/v1/projects/{id}/restore",
      expect.objectContaining({ params: { path: { id: "p1" } } })
    );
    expect(invalidated(restore.queryClient, projectKeys.detail("p1"))).toBe(
      true
    );
    expect(invalidated(restore.queryClient, listKey)).toBe(true);
    expect(invalidated(restore.queryClient, tasksKey)).toBe(true);
  });
});
