/* eslint-disable @typescript-eslint/no-unused-vars -- stubs (feat-note-todos) */
import type { ProjectRef, TaskRef } from "@/features/time/types";
import type { NoteRefDto } from "./types";
import type { Todo } from "./api";

export type TodoFilter = "open" | "done" | "all";

export interface TodoGroup {
  /** `general`, `project:<id>`, `task:<id>`, or `deleted:<project>:<task>` for a deleted link. */
  key: string;
  project: NoteRefDto | null;
  task: NoteRefDto | null;
  todos: Todo[];
  openCount: number;
}

/** Whether the filter shows a to-do. `keep` holds to-dos ticked off on this page: they stay until the filter changes. */
export function shown(t: Todo, filter: TodoFilter, keep: Set<string>): boolean {
  throw new Error("not implemented (feat-note-todos)");
}

/** Open first (oldest first), then done (most recently done first). */
export function byOpenThenDone(a: Todo, b: Todo): number {
  throw new Error("not implemented (feat-note-todos)");
}

/**
 * Groups by link: General first, then by project title, a project's own to-dos before its tasks', tasks by title;
 * deleted links last. Groups with no shown to-do are left out. In a group, open to-dos come before done ones, each
 * in the given order (the toolbar's sort).
 */
export function groupTodos(todos: Todo[]): TodoGroup[] {
  throw new Error("not implemented (feat-note-todos)");
}

/** The link a new to-do added in this group gets (none for General or a deleted link). */
export function groupLink(
  g: TodoGroup
): { project: ProjectRef | null; task: TaskRef | null } | null {
  throw new Error("not implemented (feat-note-todos)");
}
