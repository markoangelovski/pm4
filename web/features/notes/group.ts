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

/** By creation, oldest first, done or not (ties on id), so ticking one off doesn't move it. */
export function byCreated(a: Todo, b: Todo): number {
  return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}

/**
 * Groups by link: General first, then by project title, a project's own to-dos before its tasks', tasks by title;
 * deleted links last. With `byParent` (the Parent A–Z sort), General is sorted by its name among the projects instead.
 * Groups with no shown to-do are left out, except General with `withGeneral`. In a group, the to-dos keep the given
 * order (the toolbar's sort; Parent A–Z: created, oldest first), done or not, so ticking one off doesn't move it.
 */
export function groupTodos(
  todos: Todo[],
  {
    byParent = false,
    withGeneral = false
  }: { byParent?: boolean; withGeneral?: boolean } = {}
): TodoGroup[] {
  const groups = new Map<string, TodoGroup>();
  if (withGeneral)
    groups.set("general", {
      key: "general",
      project: null,
      task: null,
      todos: [],
      openCount: 0
    });
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
    g.key.startsWith("deleted:") ? 2 : g.key === "general" && !byParent ? 0 : 1;
  const name = (g: TodoGroup) =>
    g.key === "general" ? "General" : (g.project?.title ?? "");
  return [...groups.values()].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      name(a).localeCompare(name(b), undefined, { sensitivity: "base" }) ||
      (a.task ? 1 : 0) - (b.task ? 1 : 0) ||
      (a.task?.title ?? "").localeCompare(b.task?.title ?? "", undefined, {
        sensitivity: "base"
      })
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
