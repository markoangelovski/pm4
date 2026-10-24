// API shapes of notes and to-dos that `lib/api/schema` doesn't have yet (specs/04-web/prototype.md).
// The feature spec's API interfaces copy them; `npm run api:types` replaces them after the API task.

/** A link to a project or task. `id` is null once it's deleted: the name stays (like a time log's). */
export interface NoteRefDto {
  id: string | null;
  title: string;
  deleted: boolean;
}

export interface NoteDto {
  id: string;
  /** Optional, up to 200 characters. */
  title: string | null;
  /** Markdown (GFM subset, no raw HTML), 1..10000 characters. */
  body: string;
  /** Set whenever `task` is (the task's project). */
  project: NoteRefDto | null;
  task: NoteRefDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface NoteListDto {
  items: NoteDto[];
  page: number;
  pageSize: number;
  total: number;
}

/** Create and update. On update, absent `projectId`/`taskId` keep the link (or the deleted names). */
export interface NoteInputDto {
  title: string | null;
  body: string;
  projectId?: string | null;
  taskId?: string | null;
}

export interface TodoDto {
  id: string;
  /** 1..500 characters. */
  text: string;
  /** When it was ticked off; null while open. */
  doneAt: string | null;
  project: NoteRefDto | null;
  task: NoteRefDto | null;
  createdAt: string;
  /** Last change of the text or link (ticking off sets `doneAt` only). */
  updatedAt: string;
}

export interface TodoListDto {
  items: TodoDto[];
}

/** Create (text required) and update (any subset). `done` sets or clears `doneAt`. */
export interface TodoInputDto {
  text?: string;
  done?: boolean;
  projectId?: string | null;
  taskId?: string | null;
}

/** List filter: a project's items (its tasks' included), one task's, or (`unlinked`) those with no project. Absent = everything. */
export interface NoteFilterQuery {
  projectId?: string;
  taskId?: string;
  unlinked?: boolean;
}

export const NOTE_SORTS = [
  "updatedAt:desc",
  "updatedAt:asc",
  "createdAt:desc",
  "createdAt:asc"
] as const;
export type NoteSort = (typeof NOTE_SORTS)[number];

/**
 * GET /notes only. `q`: case-insensitive match in the title or body. `sort` (default updatedAt:desc) also picks the
 * date `from`/`to` filter on: work-calendar dates (`YYYY-MM-DD`, inclusive) in the user's stored time zone.
 */
export interface NoteListQuery extends NoteFilterQuery {
  q?: string;
  sort?: NoteSort;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

/** GET /todos: NoteListQuery's search (in the text), sort and date range, no paging. */
export type TodoListQuery = Omit<NoteListQuery, "page" | "pageSize">;

// ---- openapi-typescript-shaped paths for the mock client ----

type Json<T> = { content: { "application/json": T } };
type Res<T, S extends number = 200> = {
  [K in S]: { headers: Record<string, unknown> } & Json<T>;
};
type NoContent = { 204: { headers: Record<string, unknown>; content?: never } };
type Params<Q = never, P = never> = ([Q] extends [never]
  ? { query?: never }
  : { query?: Q }) &
  ([P] extends [never] ? { path?: never } : { path: P }) & {
    header?: never;
    cookie?: never;
  };
type Op<R, B = never, Q = never, P = never> = {
  parameters: Params<Q, P>;
  responses: R;
} & ([B] extends [never] ? { requestBody?: never } : { requestBody: Json<B> });
type PathItem = {
  parameters: {
    query?: never;
    header?: never;
    path?: never;
    cookie?: never;
  };
  get?: never;
  put?: never;
  post?: never;
  delete?: never;
  options?: never;
  head?: never;
  patch?: never;
  trace?: never;
};

export interface NotesPaths {
  "/api/v1/notes": Omit<PathItem, "get" | "post"> & {
    get: Op<Res<NoteListDto>, never, NoteListQuery>;
    post: Op<Res<NoteDto, 201>, NoteInputDto>;
  };
  "/api/v1/notes/{id}": Omit<PathItem, "patch" | "delete"> & {
    patch: Op<Res<NoteDto>, NoteInputDto, never, { id: string }>;
    delete: Op<NoContent, never, never, { id: string }>;
  };
  "/api/v1/todos": Omit<PathItem, "get" | "post"> & {
    get: Op<Res<TodoListDto>, never, TodoListQuery>;
    post: Op<Res<TodoDto, 201>, TodoInputDto>;
  };
  "/api/v1/todos/{id}": Omit<PathItem, "patch" | "delete"> & {
    patch: Op<Res<TodoDto>, TodoInputDto, never, { id: string }>;
    delete: Op<NoContent, never, never, { id: string }>;
  };
}
