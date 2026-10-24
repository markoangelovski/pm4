/* eslint-disable @typescript-eslint/no-unused-vars -- stubs (feat-note-todos) */
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
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
  throw new Error("not implemented (feat-note-todos)");
}

/** API-NOTE-002; invalidates noteKeys.notes(). */
export function useCreateNote(): UseMutationResult<Note, Error, NoteInput> {
  throw new Error("not implemented (feat-note-todos)");
}

/** API-NOTE-003; sends projectId/taskId only when present in the input; invalidates noteKeys.notes(). */
export function useUpdateNote(
  id: string
): UseMutationResult<Note, Error, NoteInput> {
  throw new Error("not implemented (feat-note-todos)");
}

/** API-NOTE-004; invalidates noteKeys.notes(). */
export function useDeleteNote(): UseMutationResult<void, Error, string> {
  throw new Error("not implemented (feat-note-todos)");
}

/** API-TODO-001: open and done, newest change first unless `options.sort` says otherwise (the list filters and groups them). */
export function useTodos(
  filter: NoteFilter,
  options: NoteListOptions = {}
): UseQueryResult<Todo[], Error> {
  throw new Error("not implemented (feat-note-todos)");
}

/** API-TODO-002; invalidates noteKeys.todos(). */
export function useCreateTodo(): UseMutationResult<Todo, Error, TodoInput> {
  throw new Error("not implemented (feat-note-todos)");
}

/** API-TODO-003 (also ticks off: `{ done }`); invalidates noteKeys.todos(). */
export function useUpdateTodo(): UseMutationResult<
  Todo,
  Error,
  { id: string; input: TodoInput }
> {
  throw new Error("not implemented (feat-note-todos)");
}

/** API-TODO-004; invalidates noteKeys.todos(). */
export function useDeleteTodo(): UseMutationResult<void, Error, string> {
  throw new Error("not implemented (feat-note-todos)");
}
