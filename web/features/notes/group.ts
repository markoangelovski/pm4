import type { NoteRefDto } from "./types";
import type { Todo } from "./api";
import type { NoteLink } from "./schemas";

export type TodoFilter = "open" | "done" | "all";

export interface TodoGroup {
  /** `general`, `project:<id>`, `task:<id>`, or `deleted:<project>:<task>` for a deleted link. */
  key: string;
  project: NoteRefDto | null;
  task: NoteRefDto | null;
  todos: Todo[];
  openCount: number;
}

function keyOf(t: Todo): string {
  if (t.task)
    return t.task.id
      ? `task:${t.task.id}`
      : `deleted:${t.project?.title ?? ""}:${t.task.title}`;
  if (t.project)
    return t.project.id
      ? `project:${t.project.id}`
      : `deleted:${t.project.title}:`;
  return "general";
}

/** Whether the filter shows a to-do. `keep` holds to-dos ticked off on this page: they stay until the filter changes. */
export function shown(t: Todo, filter: TodoFilter, keep: Set<string>): boolean {
  if (filter === "all") return true;
  if (filter === "done") return t.doneAt !== null || keep.has(t.id);
  return t.doneAt === null || keep.has(t.id);
}

/** Open first (oldest first), then done (most recently done first). */
export function byOpenThenDone(a: Todo, b: Todo): number {
  if (!a.doneAt !== !b.doneAt) return a.doneAt ? 1 : -1;
  if (a.doneAt && b.doneAt) return b.doneAt.localeCompare(a.doneAt);
  return a.createdAt.localeCompare(b.createdAt);
}

/**
 * Groups by link: General first, then by project title, a project's own to-dos before its tasks', tasks by title;
 * deleted links last. Groups with no shown to-do are left out. In a group, open to-dos come before done ones, each
 * in the given order (the toolbar's sort).
 */
export function groupTodos(todos: Todo[]): TodoGroup[] {
  const groups = new Map<string, TodoGroup>();
  for (const t of todos) {
    const key = keyOf(t);
    const g = groups.get(key) ?? {
      key,
      project: t.project,
      task: t.task,
      todos: [],
      openCount: 0
    };
    g.todos.push(t);
    if (!t.doneAt) g.openCount += 1;
    groups.set(key, g);
  }
  const rank = (g: TodoGroup) =>
    g.key === "general" ? 0 : g.key.startsWith("deleted:") ? 2 : 1;
  return [...groups.values()]
    .map((g) => ({
      ...g,
      todos: [...g.todos].sort(
        (a, b) => (a.doneAt ? 1 : 0) - (b.doneAt ? 1 : 0)
      )
    }))
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        (a.project?.title ?? "").localeCompare(b.project?.title ?? "") ||
        (a.task ? 1 : 0) - (b.task ? 1 : 0) ||
        (a.task?.title ?? "").localeCompare(b.task?.title ?? "")
    );
}

/** The link a new to-do added in this group gets (none for General or a deleted link). */
export function groupLink(g: TodoGroup): NoteLink | null {
  if (g.key === "general") return { project: null, task: null };
  if (g.key.startsWith("deleted:") || !g.project?.id) return null;
  const project = { id: g.project.id, title: g.project.title };
  return {
    project,
    task: g.task?.id ? { id: g.task.id, title: g.task.title, project } : null
  };
}
