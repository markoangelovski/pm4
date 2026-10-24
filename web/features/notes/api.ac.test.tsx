import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import {
  noteKeys,
  useCreateNote,
  useCreateTodo,
  useDeleteNote,
  useDeleteTodo,
  useNotes,
  useTodos,
  useUpdateNote,
  useUpdateTodo,
  type Note,
  type Todo
} from "./api";

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PUT: vi.fn(),
  PATCH: vi.fn(),
  DELETE: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

const note: Note = {
  id: "n1",
  title: null,
  body: "# Hi",
  project: { id: "p1", title: "Website", deleted: false },
  task: null,
  createdAt: "2026-10-01T08:00:00.000Z",
  updatedAt: "2026-10-01T08:00:00.000Z"
};

const todo: Todo = {
  id: "d1",
  text: "Call",
  doneAt: null,
  project: null,
  task: null,
  createdAt: "2026-10-01T08:00:00.000Z",
  updatedAt: "2026-10-01T08:00:00.000Z"
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

/** The request URL `fetch` would get from openapi-fetch's `GET(path, { params })`. */
const urlOf = (call: unknown[]) => {
  const [path, init] = call as [
    string,
    { params?: { query?: Record<string, unknown> } }
  ];
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(init.params?.query ?? {}))
    if (value !== undefined) query.append(key, String(value));
  const search = query.toString();
  return search ? `${path}?${search}` : path;
};

const noteListKey = noteKeys.noteList({}, 1, 20);
const todoListKey = noteKeys.todoList({});

/** Both lists cached, so a test can see which one a mutation invalidates. */
const seedLists = (queryClient: QueryClient) => {
  queryClient.setQueryData(noteListKey, {
    items: [note],
    page: 1,
    pageSize: 20,
    total: 1
  });
  queryClient.setQueryData(todoListKey, [todo]);
};

const invalidated = (queryClient: QueryClient, key: readonly unknown[]) =>
  queryClient.getQueryState(key)?.isInvalidated;

describe("notes and to-dos hooks (feat-note-todos)", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
  });

  it("AC-13 FR-NOTE-002 FR-NOTE-003: useNotes sends the filter, options and page; useTodos the filter and returns items", async () => {
    expect(noteKeys.notes()).toEqual(["notes", "notes"]);
    expect(noteKeys.todos()).toEqual(["notes", "todos"]);

    api.GET.mockResolvedValueOnce({
      data: { items: [note], page: 2, pageSize: 20, total: 21 },
      response: res(200)
    });
    const notes = setup(() =>
      useNotes({ unlinked: true }, 2, 20, {
        q: "a",
        sort: "createdAt:asc",
        from: "2026-10-01",
        to: "2026-10-09"
      })
    );
    await waitFor(() => expect(notes.result.current.isSuccess).toBe(true));
    expect(notes.result.current.data?.items).toEqual([note]);
    expect(api.GET).toHaveBeenCalledTimes(1);
    expect(urlOf(api.GET.mock.calls[0])).toBe(
      "/api/v1/notes?unlinked=true&q=a&sort=createdAt%3Aasc&from=2026-10-01&to=2026-10-09&page=2&pageSize=20"
    );
    notes.unmount();

    api.GET.mockResolvedValueOnce({
      data: { items: [todo] },
      response: res(200)
    });
    const todos = setup(() => useTodos({ taskId: "t1" }));
    await waitFor(() => expect(todos.result.current.isSuccess).toBe(true));
    expect(todos.result.current.data).toEqual([todo]);
    expect(urlOf(api.GET.mock.calls[1])).toBe("/api/v1/todos?taskId=t1");
  });

  it("AC-13 FR-NOTE-004 FR-NOTE-007: note mutations call /notes and invalidate the notes lists only", async () => {
    const input = { title: null, body: "# Hi", projectId: "p1" };

    api.POST.mockResolvedValueOnce({ data: note, response: res(201) });
    const create = setup(useCreateNote, seedLists);
    await act(async () => {
      await create.result.current.mutateAsync(input);
    });
    expect(api.POST).toHaveBeenCalledWith(
      "/api/v1/notes",
      expect.objectContaining({ body: input })
    );
    expect(invalidated(create.queryClient, noteListKey)).toBe(true);
    expect(invalidated(create.queryClient, todoListKey)).toBe(false);

    api.PATCH.mockResolvedValueOnce({ data: note, response: res(200) });
    const update = setup(() => useUpdateNote("n1"), seedLists);
    await act(async () => {
      await update.result.current.mutateAsync({ title: "t", body: "b" });
    });
    expect(api.PATCH).toHaveBeenCalledWith(
      "/api/v1/notes/{id}",
      expect.objectContaining({
        params: { path: { id: "n1" } },
        body: { title: "t", body: "b" }
      })
    );
    expect(invalidated(update.queryClient, noteListKey)).toBe(true);
    expect(invalidated(update.queryClient, todoListKey)).toBe(false);

    api.DELETE.mockResolvedValueOnce({ response: res(204) });
    const remove = setup(useDeleteNote, seedLists);
    await act(async () => {
      await remove.result.current.mutateAsync("n1");
    });
    expect(api.DELETE).toHaveBeenCalledWith(
      "/api/v1/notes/{id}",
      expect.objectContaining({ params: { path: { id: "n1" } } })
    );
    expect(invalidated(remove.queryClient, noteListKey)).toBe(true);
    expect(invalidated(remove.queryClient, todoListKey)).toBe(false);
  });

  it("AC-13 FR-NOTE-005 FR-NOTE-006 FR-NOTE-007: to-do mutations call /todos and invalidate the to-do lists only", async () => {
    api.POST.mockResolvedValueOnce({ data: todo, response: res(201) });
    const create = setup(useCreateTodo, seedLists);
    await act(async () => {
      await create.result.current.mutateAsync({ text: "Call" });
    });
    expect(api.POST).toHaveBeenCalledWith(
      "/api/v1/todos",
      expect.objectContaining({ body: { text: "Call" } })
    );
    expect(invalidated(create.queryClient, todoListKey)).toBe(true);
    expect(invalidated(create.queryClient, noteListKey)).toBe(false);

    api.PATCH.mockResolvedValueOnce({
      data: { ...todo, doneAt: "2026-10-02T08:00:00.000Z" },
      response: res(200)
    });
    const update = setup(useUpdateTodo, seedLists);
    await act(async () => {
      await update.result.current.mutateAsync({
        id: "d1",
        input: { done: true }
      });
    });
    expect(api.PATCH).toHaveBeenCalledWith(
      "/api/v1/todos/{id}",
      expect.objectContaining({
        params: { path: { id: "d1" } },
        body: { done: true }
      })
    );
    expect(invalidated(update.queryClient, todoListKey)).toBe(true);
    expect(invalidated(update.queryClient, noteListKey)).toBe(false);

    api.DELETE.mockResolvedValueOnce({ response: res(204) });
    const remove = setup(useDeleteTodo, seedLists);
    await act(async () => {
      await remove.result.current.mutateAsync("d1");
    });
    expect(api.DELETE).toHaveBeenCalledWith(
      "/api/v1/todos/{id}",
      expect.objectContaining({ params: { path: { id: "d1" } } })
    );
    expect(invalidated(remove.queryClient, todoListKey)).toBe(true);
    expect(invalidated(remove.queryClient, noteListKey)).toBe(false);
  });
});
