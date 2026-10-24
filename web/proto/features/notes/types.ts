// The notes and to-dos API types (M8, req-notes): aliases of the generated OpenAPI schema
// (`npm run api:types`), named as the prototype and the screens use them.
import type { components, paths } from "@/lib/api/schema";

type S = components["schemas"];

/** A link to a project or task. `id` is null once it's deleted: the name stays (like a time log's). */
export type NoteRefDto = S["RefDto"];
export type NoteDto = S["NoteResponseDto"];
export type NoteListDto = S["NoteListResponseDto"];
/** Create and update. On update, absent `projectId`/`taskId` keep the link (or the deleted names). */
export type NoteInputDto = S["NoteInputDto"];
export type TodoDto = S["TodoResponseDto"];
export type TodoListDto = S["TodoListResponseDto"];
/** Create (text required) and update (any subset). `done` sets or clears `doneAt`. */
export type TodoInputDto = S["TodoInputDto"];

export const NOTE_SORTS = [
  "updatedAt:desc",
  "updatedAt:asc",
  "createdAt:desc",
  "createdAt:asc"
] as const;
export type NoteSort = (typeof NOTE_SORTS)[number];

/** GET /notes: filter, search, sort, date range and paging. */
export type NoteListQuery = NonNullable<
  paths["/api/v1/notes"]["get"]["parameters"]["query"]
>;
/** GET /todos: the notes query without paging. */
export type TodoListQuery = NonNullable<
  paths["/api/v1/todos"]["get"]["parameters"]["query"]
>;
/** List filter: a project's items (its tasks' included), one task's, or (`unlinked`) those with no project. Absent = everything. */
export type NoteFilterQuery = Pick<
  NoteListQuery,
  "projectId" | "taskId" | "unlinked"
>;
