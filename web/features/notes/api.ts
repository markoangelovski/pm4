import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { unwrap, unwrapVoid } from "@/lib/api/problem";
import type {
  NoteDto,
  NoteFilterQuery,
  NoteInputDto,
  NoteListDto,
  NoteListQuery,
  TodoDto,
  TodoInputDto
} from "./types";

export type Note = NoteDto;
export type NoteList = NoteListDto;
export type NoteInput = NoteInputDto;
export type Todo = TodoDto;
export type TodoInput = TodoInputDto;
export type NoteFilter = NoteFilterQuery;
/** The Notes page's list query beyond the link filter (search, sort, date range); the To-dos tab's too. */
export type NoteListOptions = Pick<NoteListQuery, "q" | "sort" | "from" | "to">;

export const noteKeys = {
  all: ["notes"] as const,
  notes: () => [...noteKeys.all, "notes"] as const,
  noteList: (
    filter: NoteFilter,
    page: number,
    pageSize: number,
    options: NoteListOptions = {}
  ) => [...noteKeys.notes(), filter, page, pageSize, options] as const,
  todos: () => [...noteKeys.all, "todos"] as const,
  todoList: (filter: NoteFilter, options: NoteListOptions = {}) =>
    [...noteKeys.todos(), filter, options] as const
};

/** The notes page's page size. */
export const NOTE_PAGE_SIZE = 20;

/** API-NOTE-001: newest change first unless `options.sort` says otherwise, keepPreviousData. */
export function useNotes(
  filter: NoteFilter,
  page = 1,
  pageSize = NOTE_PAGE_SIZE,
  options: NoteListOptions = {}
): UseQueryResult<NoteList, Error> {
  return useQuery({
    queryKey: noteKeys.noteList(filter, page, pageSize, options),
    queryFn: async ({ signal }) =>
      unwrap(
        await apiClient.GET("/api/v1/notes", {
          params: { query: { ...filter, ...options, page, pageSize } },
          signal
        })
      ),
    placeholderData: keepPreviousData
  });
}

/** API-NOTE-002; invalidates noteKeys.notes(). */
export function useCreateNote(): UseMutationResult<Note, Error, NoteInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: NoteInput) =>
      unwrap(await apiClient.POST("/api/v1/notes", { body })),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: noteKeys.notes() })
  });
}

/** API-NOTE-003; sends projectId/taskId only when present in the input; invalidates noteKeys.notes(). */
export function useUpdateNote(
  id: string
): UseMutationResult<Note, Error, NoteInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: NoteInput) =>
      unwrap(
        await apiClient.PATCH("/api/v1/notes/{id}", {
          params: { path: { id } },
          body
        })
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: noteKeys.notes() })
  });
}

/** API-NOTE-004; invalidates noteKeys.notes(). */
export function useDeleteNote(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrapVoid(
        await apiClient.DELETE("/api/v1/notes/{id}", {
          params: { path: { id } }
        })
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: noteKeys.notes() })
  });
}

/** API-TODO-001: open and done, newest change first unless `options.sort` says otherwise (the list filters and groups them). */
export function useTodos(
  filter: NoteFilter,
  options: NoteListOptions = {}
): UseQueryResult<Todo[], Error> {
  return useQuery({
    queryKey: noteKeys.todoList(filter, options),
    queryFn: async ({ signal }) =>
      unwrap(
        await apiClient.GET("/api/v1/todos", {
          params: { query: { ...filter, ...options } },
          signal
        })
      ).items,
    placeholderData: keepPreviousData
  });
}

/** API-TODO-002; invalidates noteKeys.todos(). */
export function useCreateTodo(): UseMutationResult<Todo, Error, TodoInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: TodoInput) =>
      unwrap(await apiClient.POST("/api/v1/todos", { body })),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: noteKeys.todos() })
  });
}

/** API-TODO-003 (also ticks off: `{ done }`); invalidates noteKeys.todos(). */
export function useUpdateTodo(): UseMutationResult<
  Todo,
  Error,
  { id: string; input: TodoInput }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: TodoInput }) =>
      unwrap(
        await apiClient.PATCH("/api/v1/todos/{id}", {
          params: { path: { id } },
          body: input
        })
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: noteKeys.todos() })
  });
}

/** API-TODO-004; invalidates noteKeys.todos(). */
export function useDeleteTodo(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrapVoid(
        await apiClient.DELETE("/api/v1/todos/{id}", {
          params: { path: { id } }
        })
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: noteKeys.todos() })
  });
}
